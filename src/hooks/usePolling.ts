import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { fetchDoctors, fetchEmergencyAlerts, isBackendConfigured, type EmergencyAlert } from '../services/api';
import { setOffline } from '../services/connection';
import { doctors as demoDoctors, type DemoDoctor } from '../services/mock';

export const POLL_MS = 3000;

/** Runs `task` now and then every `ms` while the screen is focused. */
export function usePoll(task: () => void, ms: number = POLL_MS) {
  const saved = useRef(task);
  useEffect(() => {
    saved.current = task;
  }, [task]);
  useFocusEffect(
    useCallback(() => {
      saved.current();
      const timer = setInterval(() => saved.current(), ms);
      return () => clearInterval(timer);
    }, [ms]),
  );
}

/** Polls GET /v1/queue/{doctorId} every 3 s while the screen is focused (no-op in demo mode). */
export function useQueuePoll() {
  const { refresh } = useQueue();
  usePoll(refresh);
}

/** Doctors from GET /v1/doctors; falls back to the demo list when the backend is not reachable. */
export function useDoctors(): DemoDoctor[] {
  const [list, setList] = useState<DemoDoctor[]>(demoDoctors);
  useEffect(() => {
    if (!isBackendConfigured()) return;
    let active = true;
    fetchDoctors()
      .then((result) => {
        if (!active) return;
        setOffline(false);
        if (result.length > 0) {
          // Overlay what the server knows (fee, rating, ...) on the catalog; ignore doctors it has but the catalog lacks.
          setList(demoDoctors.map((doctor) => ({ ...doctor, ...(result.find((r) => r.id === doctor.id) ?? {}) })));
        }
      })
      .catch(() => setOffline(true));
    return () => {
      active = false;
    };
  }, []);
  return list;
}

/** Emergency alerts (newest first), polled every 3 s. Empty when the backend is not reachable. */
export function useEmergencyAlerts() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const refresh = useCallback(() => {
    if (!isBackendConfigured()) return;
    fetchEmergencyAlerts()
      .then((result) => {
        setOffline(false);
        setAlerts(result);
      })
      .catch(() => setOffline(true));
  }, []);
  usePoll(refresh);
  return { alerts, refresh };
}
