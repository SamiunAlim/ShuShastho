import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setBackendRole } from '../services/api';
import {
  AuthError,
  clearAuthToken,
  changePassword as serviceChangePassword,
  displayName,
  getDemoProfile,
  getMe,
  login as serviceLogin,
  register,
  restoreAuthToken,
  updateMe,
  type AuthErrorCode,
  type Profile,
} from '../services/data';
import { DEMO_STAFF, Localized } from '../services/mock';

/**
 * Accounts (frontend demo, local storage; the same calls can go to the backend later):
 * - Sign up: role → details → OTP (mock code 123456) → account created → that role's home.
 * - Log in: phone or email + password. Stay logged in: the saved session opens the role's home on the next
 *   app start (no login, no OTP) until Log out.
 * - Demo accounts (password demo123) and the hidden role switcher keep the pitch quick.
 */
export type Role = 'patient' | 'doctor' | 'receptionist' | 'pharmacist' | 'hospitalAdmin' | 'superAdmin';

export const ROLES: readonly Role[] = ['patient', 'doctor', 'receptionist', 'pharmacist', 'hospitalAdmin', 'superAdmin'];

/** Roles a person can sign up as. */
export const SIGNUP_ROLES: readonly Role[] = ['patient', 'doctor', 'receptionist', 'pharmacist', 'hospitalAdmin'];

/** Admin dashboards are laid out for wide screens, so the demo switcher only offers them on web. */
export const WEB_ONLY_ROLES: readonly Role[] = ['hospitalAdmin', 'superAdmin'];
export const VISIBLE_ROLES: readonly Role[] = ROLES.filter((role) => Platform.OS === 'web' || !WEB_ONLY_ROLES.includes(role));

export type { Profile };
export { EMPTY_PROFILE } from '../services/data';

export type Session = {
  role: Role;
  phone: string;
  /** Display name (not localized for real users; the demo accounts have both languages). */
  name: Localized;
};

const SESSION_KEY = 'shushastho.session';

type AuthContextValue = {
  /** False until the saved session has been read (avoids flashing the login screen). */
  ready: boolean;
  session: Session | null;
  /** Profile of the signed-in user (null for the demo super-admin, who has no account). */
  profile: Profile | null;
  /** Phone/email + password. Resolves to false when the details are wrong. */
  login: (identifier: string, password: string) => Promise<boolean>;
  /** Create the account and sign in. Resolves to an error code when the phone/email is already used. */
  signUp: (profile: Profile, password: string) => Promise<AuthErrorCode | null>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  /** False when the current password is wrong. */
  changePassword: (current: string, next: string) => Promise<boolean>;
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

function sessionFor(profile: Profile): Session {
  return { role: profile.role, phone: profile.phone, name: displayName(profile) };
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
    (async () => {
      try {
        await restoreAuthToken();
        const saved = await AsyncStorage.getItem(SESSION_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as Session;
        const me = await getMe(parsed.phone);
        if (!active) return;
        // Stay logged in. A saved session whose account no longer exists is dropped (except the account-less demo admin).
        if (me) {
          setProfile(me);
          setSession(parsed);
        } else if (parsed.role === 'superAdmin') {
          setSession(parsed);
        }
      } catch {
        // Fall through to the login screen.
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const start = useCallback((me: Profile | null, next: Session) => {
    setProfile(me);
    setSession(next);
    persist(SESSION_KEY, next);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const me = await serviceLogin(identifier, password);
      if (!me) return false;
      start(me, sessionFor(me));
      return true;
    },
    [start],
  );

  const signUp = useCallback(
    async (newProfile: Profile, password: string) => {
      try {
        const created = await register(newProfile, password);
        start(created, sessionFor(created));
        return null;
      } catch (error) {
        if (error instanceof AuthError) return error.code;
        throw error;
      }
    },
    [start],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!session) return;
      const updated = await updateMe(session.phone, patch);
      if (!updated) return;
      setProfile(updated);
      const next = sessionFor(updated);
      setSession(next);
      persist(SESSION_KEY, next);
    },
    [session],
  );

  const changePassword = useCallback(
    async (current: string, next: string) => (session ? serviceChangePassword(session.phone, current, next) : false),
    [session],
  );

  const switchRole = useCallback(
    (role: Role) => {
      setSwitcherOpen(false);
      clearAuthToken(); // demo accounts are local; never send the previous user's token
      const demo = getDemoProfile(role);
      if (demo) {
        // Read the saved copy so a demo account edited earlier keeps its changes.
        getMe(demo.phone).then((me) => start(me ?? demo, sessionFor(me ?? demo)));
      } else {
        start(null, { role, phone: '', name: DEMO_STAFF.superAdmin });
      }
    },
    [start],
  );

  const signOut = useCallback(() => {
    setSession(null);
    setProfile(null);
    persist(SESSION_KEY, null);
    clearAuthToken();
  }, []);
  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready, session, profile, login, signUp, updateProfile, changePassword, switchRole, signOut,
      switcherOpen, openSwitcher, closeSwitcher,
    }),
    [ready, session, profile, login, signUp, updateProfile, changePassword, switchRole, signOut, switcherOpen, openSwitcher, closeSwitcher],
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
