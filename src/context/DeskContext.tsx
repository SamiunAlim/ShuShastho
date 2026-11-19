import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { callNextPatient, checkInAppointment, isBackendConfigured, markNoShow, restoreAppointment, type PaymentInfo, type QueueResponse } from '../services/api';
import { setOffline } from '../services/connection';
import { getMyAppointments, subscribeAppointments } from '../services/data';
import { DEMO, DEMO_QUEUE, DemoQueuePatient, Localized } from '../services/mock';
import { useQueue } from './QueueContext';

/**
 * Today's patient list for Dr. Farhana, shared by the front desk (check-in, no-show, walk-in)
 * and the doctor (call next, finish visit). With a backend the list comes from the polled queue
 * (QueueContext.remote) and the buttons call the API; offline it falls back to the local demo list.
 */
export type VisitStatus = 'done' | 'serving' | 'waiting' | 'notArrived' | 'noShow';

export type DeskPatient = DemoQueuePatient & {
  appointmentId?: string;
  /** Demo payment: status "paid" means no cash needs collecting at the desk. */
  payment: PaymentInfo;
  walkIn: boolean;
  noShow: boolean;
  status: VisitStatus;
};

type Entry = DemoQueuePatient & { payment?: PaymentInfo; walkIn: boolean; noShow: boolean; done: boolean; appointmentId?: string };

type DeskContextValue = {
  patients: DeskPatient[];
  counts: { waiting: number; notArrived: number; noShow: number };
  /** Patient with the doctor right now, if any. */
  serving: DeskPatient | null;
  /** Next patient the doctor can call (checked in, not a no-show, after the current serial). */
  nextCallable: DeskPatient | null;
  checkIn: (serial: number) => void;
  setNoShow: (serial: number, noShow: boolean) => void;
  /** Mock QR scan: checks in the next patient who has not arrived. Returns them, or null if none left. */
  scanQr: () => DeskPatient | null;
  addWalkIn: (input: { name: string; phone: string; age: number; reason: string }) => DeskPatient;
  callNext: () => DeskPatient | null;
  finishVisit: (serial: number) => void;
};

const DeskContext = createContext<DeskContextValue | null>(null);

const initialEntries: Entry[] = DEMO_QUEUE.map((patient) => ({ ...patient, walkIn: false, noShow: false, done: false }));

export function DeskProvider({ children }: React.PropsWithChildren) {
  const queue = useQueue();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  // Demo mode: the patient's own booking (#17) carries the payment chosen in the booking wizard.
  const [myPayment, setMyPayment] = useState<PaymentInfo | undefined>();
  useEffect(() => {
    const load = () => { getMyAppointments().then((list) => setMyPayment(list[0]?.payment)); };
    load();
    return subscribeAppointments(load);
  }, []);
  const { nowServing, callNext: queueCallNext, remote, applyRemote, refresh } = queue;

  // Backend queue (when reachable) + local walk-ins; otherwise the local demo list.
  const baseEntries = useMemo<Entry[]>(() => {
    if (!remote) return entries;
    const doneLocally = new Set(entries.filter((e) => e.done).map((e) => e.serial));
    const fromServer: Entry[] = remote.items.map((item) => ({
      serial: item.serialNumber,
      name: item.patientName,
      phone: item.phone,
      age: item.age,
      summary: item.summary,
      checkedIn: item.checkedIn,
      walkIn: false,
      noShow: item.noShow,
      done: doneLocally.has(item.serialNumber),
      appointmentId: item.appointmentId,
      payment: {
        method: item.paymentMethod ?? 'cash_at_chamber',
        status: item.paymentStatus ?? 'pay_at_chamber',
        transactionId: item.transactionId ?? undefined,
        amount: item.amount ?? DEMO.fee,
      },
    }));
    return [...fromServer, ...entries.filter((e) => e.walkIn)];
  }, [remote, entries]);

  const patients = useMemo<DeskPatient[]>(
    () =>
      baseEntries
        .map((entry) => {
          let status: VisitStatus;
          if (entry.noShow) status = 'noShow';
          else if (entry.done || entry.serial < nowServing) status = 'done';
          else if (entry.serial === nowServing) status = 'serving';
          else status = entry.checkedIn ? 'waiting' : 'notArrived';
          const payment: PaymentInfo = entry.payment
            ?? (entry.serial === queue.serial && myPayment
              ? myPayment
              : { method: 'cash_at_chamber', status: 'pay_at_chamber', amount: DEMO.fee });
          return { ...entry, payment, status };
        })
        .sort((a, b) => a.serial - b.serial),
    [baseEntries, nowServing, queue.serial, myPayment],
  );

  const serving = patients.find((p) => p.status === 'serving') ?? null;
  const nextCallable = patients.find((p) => p.serial > nowServing && p.status === 'waiting') ?? null;
  const counts = useMemo(
    () => ({
      waiting: patients.filter((p) => p.status === 'waiting').length,
      notArrived: patients.filter((p) => p.status === 'notArrived').length,
      noShow: patients.filter((p) => p.status === 'noShow').length,
    }),
    [patients],
  );

  const patch = useCallback((serial: number, changes: Partial<Entry>) => {
    setEntries((current) => current.map((e) => (e.serial === serial ? { ...e, ...changes } : e)));
  }, []);

  /** Calls the backend for a patient (when it is reachable); a failure switches the app to offline demo mode. */
  const callApi = useCallback(
    (serial: number, action: (appointmentId: string) => Promise<QueueResponse>) => {
      const appointmentId = remote?.items.find((item) => item.serialNumber === serial)?.appointmentId;
      if (!isBackendConfigured() || !appointmentId) return;
      action(appointmentId).then(applyRemote).catch(() => {
        setOffline(true);
        refresh();
      });
    },
    [remote, applyRemote, refresh],
  );

  const checkIn = useCallback(
    (serial: number) => {
      patch(serial, { checkedIn: true, noShow: false });
      callApi(serial, checkInAppointment);
    },
    [patch, callApi],
  );
  const setNoShow = useCallback(
    (serial: number, noShow: boolean) => {
      patch(serial, { noShow });
      callApi(serial, noShow ? markNoShow : restoreAppointment);
    },
    [patch, callApi],
  );
  const finishVisit = useCallback((serial: number) => patch(serial, { done: true }), [patch]);

  const scanQr = useCallback(() => {
    const target = patients.find((p) => p.status === 'notArrived');
    if (!target) return null;
    checkIn(target.serial);
    return target;
  }, [patients, checkIn]);

  const addWalkIn = useCallback(
    ({ name, phone, age, reason }: { name: string; phone: string; age: number; reason: string }) => {
      const serial = baseEntries.reduce((max, e) => Math.max(max, e.serial), 0) + 1;
      const label: Localized = { en: name, bn: name };
      const summary: Localized = { en: reason || 'Walk-in visit', bn: reason || 'ওয়াক-ইন ভিজিট' };
      const entry: Entry = { serial, name: label, phone, age, summary, checkedIn: true, walkIn: true, noShow: false, done: false };
      setEntries((current) => [...current, entry]);
      return { ...entry, payment: { method: 'cash_at_chamber' as const, status: 'pay_at_chamber' as const, amount: DEMO.fee }, status: 'waiting' as const };
    },
    [baseEntries],
  );

  const callNext = useCallback(() => {
    if (!nextCallable) return null;
    queueCallNext(nextCallable.serial);
    if (remote && isBackendConfigured()) {
      callNextPatient(remote.doctorId).then(applyRemote).catch(() => {
        setOffline(true);
        refresh();
      });
    }
    return nextCallable;
  }, [nextCallable, queueCallNext, remote, applyRemote, refresh]);

  const value = useMemo<DeskContextValue>(
    () => ({ patients, counts, serving, nextCallable, checkIn, setNoShow, scanQr, addWalkIn, callNext, finishVisit }),
    [patients, counts, serving, nextCallable, checkIn, setNoShow, scanQr, addWalkIn, callNext, finishVisit],
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const context = useContext(DeskContext);
  if (!context) throw new Error('useDesk must be used within DeskProvider');
  return context;
}
