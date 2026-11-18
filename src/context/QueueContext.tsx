import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO } from '../services/mock';

type QueueState = {
  doctorId: string;
  serial: number;
  nowServing: number;
  /** Bumped on every (re)booking so the timer restarts. */
  version: number;
};

type QueueContextValue = QueueState & {
  /** People between "now serving" and the patient. */
  ahead: number;
  /** True once the patient's serial is being served. */
  isMyTurn: boolean;
  estimatedMinutes: number;
  bookSerial: (input: { doctorId: string; serial: number }) => void;
};

const QueueContext = createContext<QueueContextValue | null>(null);

const initialState: QueueState = {
  doctorId: DEMO.doctorId,
  serial: DEMO.serial,
  nowServing: DEMO.startServing,
  version: 0,
};

/**
 * Demo live queue: "now serving" advances every few seconds until it reaches the patient's serial.
 * With a real backend this would be replaced by polling / push updates.
 */
export function QueueProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<QueueState>(initialState);
  const finished = state.nowServing >= state.serial;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setState((current) =>
        current.nowServing >= current.serial ? current : { ...current, nowServing: current.nowServing + 1 },
      );
    }, DEMO.queueAdvanceMs);
    return () => clearInterval(timer);
  }, [finished, state.version]);

  const bookSerial = useCallback(({ doctorId, serial }: { doctorId: string; serial: number }) => {
    const gap = DEMO.serial - DEMO.startServing;
    setState((current) => ({
      doctorId,
      serial,
      nowServing: Math.max(0, serial - gap),
      version: current.version + 1,
    }));
  }, []);

  const value = useMemo<QueueContextValue>(() => {
    const remaining = Math.max(0, state.serial - state.nowServing);
    return {
      ...state,
      ahead: Math.max(0, remaining - 1),
      isMyTurn: remaining === 0,
      estimatedMinutes: remaining * DEMO.minutesPerPatient,
      bookSerial,
    };
  }, [state, bookSerial]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
}
