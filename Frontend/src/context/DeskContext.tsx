import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_QUEUE, DemoQueuePatient, Localized } from '../services/mock';
import { useQueue } from './QueueContext';

/**
 * Today's patient list for Dr. Farhana, shared by the front desk (check-in, no-show, walk-in)
 * and the doctor (call next, finish visit). With a real backend this would come from the API.
 */
export type VisitStatus = 'done' | 'serving' | 'waiting' | 'notArrived' | 'noShow';

export type DeskPatient = DemoQueuePatient & {
  walkIn: boolean;
  noShow: boolean;
  status: VisitStatus;
};

type Entry = DemoQueuePatient & { walkIn: boolean; noShow: boolean; done: boolean };

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
  const { nowServing, callNext: queueCallNext } = queue;

  const patients = useMemo<DeskPatient[]>(
    () =>
      entries
        .map((entry) => {
          let status: VisitStatus;
          if (entry.noShow) status = 'noShow';
          else if (entry.done || entry.serial < nowServing) status = 'done';
          else if (entry.serial === nowServing) status = 'serving';
          else status = entry.checkedIn ? 'waiting' : 'notArrived';
          return { ...entry, status };
        })
        .sort((a, b) => a.serial - b.serial),
    [entries, nowServing],
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

  const checkIn = useCallback((serial: number) => patch(serial, { checkedIn: true, noShow: false }), [patch]);
  const setNoShow = useCallback((serial: number, noShow: boolean) => patch(serial, { noShow }), [patch]);
  const finishVisit = useCallback((serial: number) => patch(serial, { done: true }), [patch]);

  const scanQr = useCallback(() => {
    const target = patients.find((p) => p.status === 'notArrived');
    if (!target) return null;
    checkIn(target.serial);
    return target;
  }, [patients, checkIn]);

  const addWalkIn = useCallback(
    ({ name, phone, age, reason }: { name: string; phone: string; age: number; reason: string }) => {
      const serial = entries.reduce((max, e) => Math.max(max, e.serial), 0) + 1;
      const label: Localized = { en: name, bn: name };
      const summary: Localized = { en: reason || 'Walk-in visit', bn: reason || 'ওয়াক-ইন ভিজিট' };
      const entry: Entry = { serial, name: label, phone, age, summary, checkedIn: true, walkIn: true, noShow: false, done: false };
      setEntries((current) => [...current, entry]);
      return { ...entry, status: 'waiting' as const };
    },
    [entries],
  );

  const callNext = useCallback(() => {
    if (!nextCallable) return null;
    queueCallNext(nextCallable.serial);
    return nextCallable;
  }, [nextCallable, queueCallNext]);

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
