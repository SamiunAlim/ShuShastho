import { useSyncExternalStore } from 'react';

/**
 * Tracks whether the backend is reachable. Any failed request calls setOffline(true) and the app keeps
 * working with demo data (the "offline demo" badge shows); the next successful request clears it.
 */
let offline = false;
const listeners = new Set<() => void>();

export function setOffline(value: boolean) {
  if (offline === value) return;
  offline = value;
  listeners.forEach((listener) => listener());
}

export function isOffline() {
  return offline;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOffline() {
  return useSyncExternalStore(subscribe, () => offline, () => offline);
}
