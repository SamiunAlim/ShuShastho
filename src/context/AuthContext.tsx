import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setBackendRole } from '../services/api';
import {
  getMe,
  loginWithPin as serviceLoginWithPin,
  register,
  resetPin,
  updateMe,
  type Profile,
} from '../services/data';
import { DEMO, DEMO_STAFF, Localized } from '../services/mock';

/**
 * Accounts (frontend-only demo):
 * - Patient, first time: phone → OTP (mock code 123456) → profile setup → 4-digit PIN → saved on this device.
 * - Next app open: the saved session opens Home straight away (no login, no OTP).
 * - After log out: phone + PIN (no OTP). "Forgot PIN / new phone" goes through OTP again.
 * - Staff: any phone + any 6-digit code (mock), unchanged.
 * The account itself (phone, PIN hash, profile) lives behind src/services/data.ts.
 */
export type Role = 'patient' | 'doctor' | 'receptionist' | 'pharmacist' | 'hospitalAdmin' | 'superAdmin';

export const ROLES: readonly Role[] = ['patient', 'doctor', 'receptionist', 'pharmacist', 'hospitalAdmin', 'superAdmin'];

/** Admin dashboards are laid out for wide screens, so they are only offered on web. */
export const WEB_ONLY_ROLES: readonly Role[] = ['hospitalAdmin', 'superAdmin'];
export const VISIBLE_ROLES: readonly Role[] = ROLES.filter((role) => Platform.OS === 'web' || !WEB_ONLY_ROLES.includes(role));

export type { Profile };

export type Session = {
  role: Role;
  phone: string;
  /** Display name (not localized: what the user typed, or the demo name). */
  name: Localized;
  profileDone: boolean;
};

/** A patient who has passed OTP and is now setting up a profile / PIN. */
export type PendingAuth = {
  phone: string;
  /** register: new account (profile + PIN). reset: same phone, only a new PIN. */
  mode: 'register' | 'reset';
  profile: Profile | null;
};

const SESSION_KEY = 'shushastho.session';

export const DEMO_PROFILE: Profile = {
  name: DEMO.patient.en,
  age: '34',
  dob: '',
  gender: 'male',
  district: 'Dhaka',
  area: 'Dhanmondi',
  bloodGroup: 'B+',
  emergencyContact: '1811234567',
  allergies: '',
  chronic: [],
  consent: true,
};

function demoName(role: Role): Localized {
  return role === 'patient' ? DEMO.patient : DEMO_STAFF[role];
}

type AuthContextValue = {
  /** False until the saved session and account have been read (avoids flashing the login screen). */
  ready: boolean;
  session: Session | null;
  /** Account saved on this device (phone + profile), or null on a new device. */
  account: { phone: string; profile: Profile } | null;
  /** Profile of the signed-in patient (their saved one, or the demo profile after a role switch). */
  profile: Profile | null;
  pending: PendingAuth | null;
  /** Staff mock sign-in. */
  signIn: (input: { role: Role; phone: string }) => void;
  /** After a correct OTP: decide between a new registration and a PIN reset for this phone. */
  startPatientAuth: (phone: string) => PendingAuth['mode'];
  setPendingProfile: (profile: Profile) => void;
  clearPending: () => void;
  /** Last step of registration / PIN reset: saves the account and signs in. */
  finishPin: (pin: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<boolean>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  /** Demo role switcher: jump straight into a role without logging in again. */
  switchRole: (role: Role) => void;
  signOut: () => void;
  switcherOpen: boolean;
  openSwitcher: () => void;
  closeSwitcher: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(key: string, value: unknown | null) {
  const job = value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, JSON.stringify(value));
  job.catch(() => undefined);
}

function patientSession(phone: string, profile: Profile): Session {
  return { role: 'patient', phone, name: { en: profile.name, bn: profile.name }, profileDone: true };
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<{ phone: string; profile: Profile } | null>(null);
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [ready, setReady] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Keep the API's demo-login role in step with the session (set during render so child effects see it).
  setBackendRole(session?.role);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(SESSION_KEY), getMe()])
      .then(([savedSession, me]) => {
        if (!active) return;
        if (me) setAccount(me);
        if (savedSession) {
          const parsed = JSON.parse(savedSession) as Session;
          // A patient session from before accounts existed has no PIN to fall back on: ask them to log in.
          if (parsed.role !== 'patient' || me || parsed.name.en === DEMO.patient.en) setSession(parsed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateSession = useCallback((next: Session | null) => {
    setSession(next);
    persist(SESSION_KEY, next);
  }, []);

  const signIn = useCallback(
    ({ role, phone }: { role: Role; phone: string }) => {
      updateSession({ role, phone, name: demoName(role), profileDone: true });
    },
    [updateSession],
  );

  const startPatientAuth = useCallback(
    (phone: string): PendingAuth['mode'] => {
      const mode: PendingAuth['mode'] = account?.phone === phone ? 'reset' : 'register';
      setPending({ phone, mode, profile: mode === 'reset' ? account?.profile ?? null : null });
      return mode;
    },
    [account],
  );

  const setPendingProfile = useCallback((profile: Profile) => {
    setPending((current) => (current ? { ...current, profile } : current));
  }, []);

  const clearPending = useCallback(() => setPending(null), []);

  const finishPin = useCallback(
    async (pin: string) => {
      if (!pending || !pending.profile) return;
      const { phone, profile, mode } = pending;
      if (mode === 'reset') await resetPin(phone, pin);
      else await register({ phone, profile, pin });
      setAccount({ phone, profile });
      setPending(null);
      updateSession(patientSession(phone, profile));
    },
    [pending, updateSession],
  );

  const loginWithPin = useCallback(
    async (pin: string) => {
      if (!account) return false;
      const profile = await serviceLoginWithPin(account.phone, pin);
      if (!profile) return false;
      setAccount({ phone: account.phone, profile });
      updateSession(patientSession(account.phone, profile));
      return true;
    },
    [account, updateSession],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const profile = await updateMe(patch);
      if (!profile) return;
      setAccount((current) => (current ? { ...current, profile } : current));
      setSession((current) => {
        if (!current || current.role !== 'patient') return current;
        const updated = { ...current, name: { en: profile.name, bn: profile.name } };
        persist(SESSION_KEY, updated);
        return updated;
      });
    },
    [],
  );

  const switchRole = useCallback(
    (role: Role) => {
      setSwitcherOpen(false);
      updateSession({ role, phone: DEMO_STAFF.phone, name: demoName(role), profileDone: true });
    },
    [updateSession],
  );

  const signOut = useCallback(() => {
    setPending(null);
    updateSession(null);
  }, [updateSession]);
  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      account,
      // The demo patient (role switcher, no account) shows the fictional Rahim Uddin profile.
      profile: session?.role === 'patient' ? account?.profile ?? DEMO_PROFILE : null,
      pending,
      signIn,
      startPatientAuth,
      setPendingProfile,
      clearPending,
      finishPin,
      loginWithPin,
      updateProfile,
      switchRole,
      signOut,
      switcherOpen,
      openSwitcher,
      closeSwitcher,
    }),
    [ready, session, account, pending, signIn, startPatientAuth, setPendingProfile, clearPending, finishPin, loginWithPin, updateProfile, switchRole, signOut, switcherOpen, openSwitcher, closeSwitcher],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/** Same as useAuth but returns null outside the provider (used by the logo's hidden long-press). */
export function useOptionalAuth() {
  return useContext(AuthContext);
}
