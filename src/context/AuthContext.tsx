import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setBackendRole } from '../services/api';
import { DEMO, DEMO_STAFF, Localized } from '../services/mock';

/**
 * Mock authentication (frontend-only demo): any phone number + any 6-digit code signs in.
 * With a real backend, signIn() would exchange the OTP for a token via src/services/api.ts.
 */
export type Role = 'patient' | 'doctor' | 'receptionist' | 'pharmacist' | 'hospitalAdmin' | 'superAdmin';

export const ROLES: readonly Role[] = ['patient', 'doctor', 'receptionist', 'pharmacist', 'hospitalAdmin', 'superAdmin'];

/** Admin dashboards are laid out for wide screens, so they are only offered on web. */
export const WEB_ONLY_ROLES: readonly Role[] = ['hospitalAdmin', 'superAdmin'];
export const VISIBLE_ROLES: readonly Role[] = ROLES.filter((role) => Platform.OS === 'web' || !WEB_ONLY_ROLES.includes(role));

export type Profile = {
  name: string;
  age: string;
  gender: 'female' | 'male' | 'other' | '';
  bloodGroup: string;
  emergencyContact: string;
  allergies: string;
  /** Keys of the chronic-condition chips the user ticked. */
  chronic: string[];
  consent: boolean;
};

export type Session = {
  role: Role;
  phone: string;
  /** Display name (not localized: what the user typed, or the demo name). */
  name: Localized;
  /** Only patients go through profile setup; staff are always complete. */
  profileDone: boolean;
};

const SESSION_KEY = 'shushastho.session';
const PROFILE_KEY = 'shushastho.profile';

export const DEMO_PROFILE: Profile = {
  name: DEMO.patient.en,
  age: '34',
  gender: 'male',
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
  /** False until the saved session has been read (avoids flashing the login screen). */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (input: { role: Role; phone: string }) => void;
  saveProfile: (profile: Profile) => void;
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

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Keep the API's demo-login role in step with the session (set during render so child effects see it).
  setBackendRole(session?.role);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(PROFILE_KEY)])
      .then(([savedSession, savedProfile]) => {
        if (!active) return;
        if (savedProfile) setProfile(JSON.parse(savedProfile) as Profile);
        if (savedSession) setSession(JSON.parse(savedSession) as Session);
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
      const hasProfile = profile !== null;
      updateSession({
        role,
        phone,
        // A returning patient keeps their saved name; staff use the fictional demo names.
        name: role === 'patient' && profile ? { en: profile.name, bn: profile.name } : demoName(role),
        profileDone: role !== 'patient' || hasProfile,
      });
    },
    [profile, updateSession],
  );

  const saveProfile = useCallback(
    (next: Profile) => {
      setProfile(next);
      persist(PROFILE_KEY, next);
      setSession((current) => {
        if (!current) return current;
        const updated: Session = { ...current, name: { en: next.name, bn: next.name }, profileDone: true };
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

  const signOut = useCallback(() => updateSession(null), [updateSession]);
  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, session, profile, signIn, saveProfile, switchRole, signOut, switcherOpen, openSwitcher, closeSwitcher }),
    [ready, session, profile, signIn, saveProfile, switchRole, signOut, switcherOpen, openSwitcher, closeSwitcher],
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
