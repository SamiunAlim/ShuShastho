import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchQueue, isBackendConfigured, type QueueResponse } from '../services/api';
import { setOffline } from '../services/connection';
import { DEMO } from '../services/mock';

type QueueState = {
  doctorId: string;
  serial: number;
  nowServing: number;
  /** Bumped on every (re)booking so the timer restarts. */
  version: number;
  /** Once a doctor calls patients themselves, the demo auto-advance timer stops. */
  manual: boolean;
};

type QueueContextValue = QueueState & {
  /** Latest queue from the backend, or null in demo mode / while the backend is unreachable. */
  remote: QueueResponse | null;
  /** People between "now serving" and the patient. */
  ahead: number;
  /** True once the patient's serial is being served. */
  isMyTurn: boolean;
  estimatedMinutes: number;
  bookSerial: (input: { doctorId: string; serial: number }) => void;
  /** Doctor calls a specific serial: "now serving" jumps to it and the demo timer stops (demo mode). */
  callNext: (serial: number) => void;
  /** Fetches GET /v1/queue/{doctorId}. Failure switches to demo mode. Safe to call in demo mode (no-op). */
  refresh: () => void;
  /** Use a queue the backend just returned from an action (check-in, no-show, call-next). */
  applyRemote: (queue: QueueResponse) => void;
};

const QueueContext = createContext<QueueContextValue | null>(null);

const initialState: QueueState = {
  doctorId: DEMO.doctorId,
  serial: DEMO.serial,
  nowServing: DEMO.startServing,
  version: 0,
  manual: false,
};

/**
 * Live queue. With a backend, screens poll GET /v1/queue/{doctorId} every 3 s (see usePoll) and "now serving"
 * comes from the server. Without one, or when it is unreachable, the demo timer advances "now serving"
 * every few seconds until it reaches the patient's serial.
 */
export function QueueProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<QueueState>(initialState);
  const [remote, setRemote] = useState<QueueResponse | null>(null);
  const nowServing = remote ? remote.nowServing : state.nowServing;
  const finished = nowServing >= state.serial || state.manual || remote !== null;
  const { doctorId } = state;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setState((current) =>
        current.nowServing >= current.serial ? current : { ...current, nowServing: current.nowServing + 1 },
      );
    }, DEMO.queueAdvanceMs);
    return () => clearInterval(timer);
  }, [finished, state.version]);

  const refresh = useCallback(() => {
    if (!isBackendConfigured()) return;
    fetchQueue(doctorId)
      .then((queue) => {
        setOffline(false);
        setRemote(queue);
      })
      .catch(() => {
        setOffline(true);
        setRemote(null);
      });
  }, [doctorId]);

  const applyRemote = useCallback((queue: QueueResponse) => {
    setOffline(false);
    setRemote(queue);
  }, []);

  const bookSerial = useCallback(({ doctorId: id, serial }: { doctorId: string; serial: number }) => {
    const gap = DEMO.serial - DEMO.startServing;
    setRemote(null);
    setState((current) => ({
      doctorId: id,
      serial,
      nowServing: Math.max(0, serial - gap),
      version: current.version + 1,
      manual: false,
    }));
  }, []);

  const callNext = useCallback((serial: number) => {
    setState((current) => ({ ...current, nowServing: serial, manual: true }));
  }, []);

  const value = useMemo<QueueContextValue>(() => {
    const remaining = Math.max(0, state.serial - nowServing);
    return {
      ...state,
      nowServing,
      remote,
      ahead: Math.max(0, remaining - 1),
      isMyTurn: remaining === 0,
      estimatedMinutes: remaining * DEMO.minutesPerPatient,
      bookSerial,
      callNext,
      refresh,
      applyRemote,
    };
  }, [state, nowServing, remote, bookSerial, callNext, refresh, applyRemote]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
}
