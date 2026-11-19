import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  apiChangePassword,
  apiForgotPassword,
  apiLogin,
  apiRegister,
  apiResetPassword,
  apiUpdateMe,
  createAppointment as apiCreateAppointment,
  type PaymentInfo,
  hasAuthToken,
  isBackendConfigured,
  setAuthToken,
} from './api';
import type { Role } from '../context/AuthContext';
import { normalizePhone } from '../utils/format';
import { setOffline } from './connection';
import {
  CATALOG_HOSPITALS,
  DEMO,
  DEMO_OTP,
  DEMO_STAFF,
  DEPARTMENTS,
  delay,
  doctors,
  findDoctor,
  mockSerial,
  mockSlots,
  timeLabel,
  type Department,
  type DemoDoctor,
  type Hospital,
  type Localized,
  type Slot,
} from './mock';

/**
 * Data access for the app. Screens only call these functions.
 * Today they read mock data and keep accounts/appointments on the device (AsyncStorage);
 * later each one can call the real API instead, without changing any screen.
 */

/* --------------------------------- Catalog --------------------------------- */

export type { Department, Hospital, Slot };

export async function getHospitals(): Promise<Hospital[]> {
  return CATALOG_HOSPITALS;
}

export type DepartmentWithCount = Department & { doctorCount: number };

/** Departments that have doctors, with the doctor count; limited to one hospital when given. */
export async function getDepartments(hospitalId?: string): Promise<DepartmentWithCount[]> {
  return DEPARTMENTS.map((department) => ({
    ...department,
    doctorCount: doctors.filter(
      (doctor) => doctor.departmentId === department.id && (!hospitalId || doctor.hospitalId === hospitalId),
    ).length,
  })).filter((department) => department.doctorCount > 0);
}

export async function getDoctors(filter: { hospitalId?: string; departmentId?: string } = {}): Promise<DemoDoctor[]> {
  return doctors.filter(
    (doctor) =>
      (!filter.hospitalId || doctor.hospitalId === filter.hospitalId) &&
      (!filter.departmentId || doctor.departmentId === filter.departmentId),
  );
}

export async function getSlots(doctorId: string, date: string): Promise<Slot[]> {
  const mine = (await readAppointments())
    .filter((a) => a.doctorId === doctorId && a.date === date && a.status === 'upcoming')
    .map((a) => a.time);
  return mockSlots(findDoctor(doctorId), date, mine);
}

/* --------------------------------- Account --------------------------------- */

export type Profile = {
  role: Role;
  name: string;
  /** Canonical 11-digit mobile number, e.g. 01711000001 (also the login id). */
  phone: string;
  /** Optional; also usable as the login id. */
  email: string;
  age: string;
  /** DD/MM/YYYY, optional (age is derived from it when valid). */
  dob: string;
  gender: 'female' | 'male' | 'other' | '';
  district: string;
  area: string;
  /** Patient */
  bloodGroup: string;
  allergies: string;
  /** Keys of the chronic-condition chips the user ticked. */
  chronic: string[];
  emergencyContact: string;
  /** Doctor */
  bmdc: string;
  departmentId: string;
  hospitalId: string;
  degrees: string;
  fee: string;
  /** Receptionist / pharmacist / hospital admin: hospital or pharmacy name */
  organization: string;
  staffId: string;
  designation: string;
};

export const EMPTY_PROFILE: Profile = {
  role: 'patient', name: '', phone: '', email: '', age: '', dob: '', gender: '', district: '', area: '',
  bloodGroup: '', allergies: '', chronic: [], emergencyContact: '',
  bmdc: '', departmentId: '', hospitalId: '', degrees: '', fee: '',
  organization: '', staffId: '', designation: '',
};

export type AuthErrorCode = 'phone_taken' | 'email_taken';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

type StoredUser = { phone: string; email: string; passwordHash: string; profile: Profile };

const USERS_KEY = 'shushastho.users';
const APPOINTMENTS_KEY = 'shushastho.appointments';

/** Password every demo account uses (shown on the login screen). */
export const DEMO_PASSWORD = 'demo123';

/** Fictional accounts so the pitch works without signing up. Keep the same phone numbers in the backend seed. */
export const DEMO_ACCOUNTS: { name: Localized; profile: Profile }[] = [
  { name: DEMO.patient, profile: {
    ...EMPTY_PROFILE, role: 'patient', name: DEMO.patient.en, phone: '01711000001', email: 'rahim@example.com',
    age: '34', gender: 'male', district: 'Dhaka', area: 'Dhanmondi', bloodGroup: 'B+', emergencyContact: '01811234567' } },
  { name: DEMO_STAFF.doctor, profile: {
    ...EMPTY_PROFILE, role: 'doctor', name: DEMO_STAFF.doctor.en, phone: '01711000002', email: 'farhana@example.com',
    age: '41', gender: 'female', district: 'Dhaka', area: 'Dhanmondi', bmdc: 'A-48213', departmentId: 'medicine',
    hospitalId: 'dhaka-medicare', degrees: 'MBBS, FCPS (Medicine)', fee: String(DEMO.fee) } },
  { name: DEMO_STAFF.receptionist, profile: {
    ...EMPTY_PROFILE, role: 'receptionist', name: DEMO_STAFF.receptionist.en, phone: '01711000003',
    age: '29', gender: 'female', district: 'Dhaka', area: 'Dhanmondi',
    organization: DEMO.hospital.en, staffId: 'DMH-R-014' } },
  { name: DEMO_STAFF.pharmacist, profile: {
    ...EMPTY_PROFILE, role: 'pharmacist', name: DEMO_STAFF.pharmacist.en, phone: '01711000004',
    age: '36', gender: 'male', district: 'Dhaka', area: 'Dhanmondi',
    organization: 'Rahman Pharmacy, Dhanmondi', staffId: 'RP-007' } },
  { name: DEMO_STAFF.hospitalAdmin, profile: {
    ...EMPTY_PROFILE, role: 'hospitalAdmin', name: DEMO_STAFF.hospitalAdmin.en, phone: '01711000005',
    age: '45', gender: 'male', district: 'Dhaka', area: 'Dhanmondi',
    organization: DEMO.hospital.en, designation: 'Hospital Manager' } },
  { name: DEMO_STAFF.superAdmin, profile: {
    ...EMPTY_PROFILE, role: 'superAdmin', name: DEMO_STAFF.superAdmin.en, phone: '01711000006', email: 'sabrina@example.com',
    age: '39', gender: 'female', district: 'Dhaka', area: 'Gulshan',
    organization: 'ShuShastho Platform', designation: 'Platform Administrator' } },
];

/** Demo only: a real backend hashes passwords on the server (see backend/app/auth.py). */
function hashPassword(phone: string, password: string): string {
  let a = 5381;
  let b = 52711;
  const text = `${phone}:${password}`;
  for (let i = 0; i < text.length; i += 1) {
    a = ((a << 5) + a + text.charCodeAt(i)) >>> 0;
    b = ((b * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return `${a.toString(16)}${b.toString(16)}`;
}

function userFromProfile(profile: Profile, password: string): StoredUser {
  return { phone: profile.phone, email: profile.email.trim().toLowerCase(), passwordHash: hashPassword(profile.phone, password), profile };
}

/** All users on this device; the demo accounts are added the first time. */
async function readUsers(): Promise<StoredUser[]> {
  let users: StoredUser[] = [];
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (raw) users = (JSON.parse(raw) as StoredUser[]).map((u) => ({ ...u, profile: { ...EMPTY_PROFILE, ...u.profile } }));
  } catch {
    users = [];
  }
  const missing = DEMO_ACCOUNTS.filter((demo) => !users.some((u) => u.phone === demo.profile.phone));
  if (missing.length > 0) {
    users = [...users, ...missing.map((demo) => userFromProfile(demo.profile, DEMO_PASSWORD))];
    await writeUsers(users);
  }
  return users;
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function matches(user: StoredUser, identifier: string): boolean {
  if (identifier.includes('@')) return user.email !== '' && user.email === identifier.trim().toLowerCase();
  const phone = normalizePhone(identifier);
  return phone !== null && user.phone === phone;
}

/** Name to show in headers: the fictional demo accounts have a Bangla name too. */
export function displayName(profile: Pick<Profile, 'name' | 'phone'>): Localized {
  return DEMO_ACCOUNTS.find((demo) => demo.profile.phone === profile.phone)?.name ?? { en: profile.name, bn: profile.name };
}

/** True when this phone or email already belongs to an account. */
export async function isTaken(phone: string, email: string): Promise<AuthErrorCode | null> {
  const users = await readUsers();
  if (users.some((u) => u.phone === phone)) return 'phone_taken';
  if (email.trim() !== '' && users.some((u) => u.email === email.trim().toLowerCase())) return 'email_taken';
  return null;
}

/* ---- Backend wiring ----
 * With EXPO_PUBLIC_API_URL set, each call below goes to the backend first (POST /v1/auth/..., /v1/users/me).
 * A definite answer from the server (wrong password, phone already used ...) is final. If the server cannot be
 * reached (or is older and lacks the endpoint) the call falls back to the accounts saved on this device, so the
 * demo keeps working offline. Accounts the server knows are also copied to the device.
 */

const TOKEN_KEY = 'shushastho.token';

async function rememberToken(token: string | null): Promise<void> {
  setAuthToken(token);
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // The token only lives in memory then; the next login gets a new one.
  }
}

/** App start: reuse the saved session token (stay logged in). */
export async function restoreAuthToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) setAuthToken(token);
  } catch {
    // No token: profile calls stay local.
  }
}

/** Log out / demo role switch: stop sending the user's token. */
export function clearAuthToken(): void {
  rememberToken(null).catch(() => undefined);
}

function definite(error: unknown, ...codes: string[]): boolean {
  return error instanceof ApiError && error.code !== undefined && codes.includes(error.code);
}

function noteNetwork(error: unknown) {
  // No status = the request never got an answer.
  if (error instanceof ApiError && error.status === undefined) setOffline(true);
}

/** Keep a local copy of an account the server knows (so it also logs in offline). */
async function saveLocal(profile: Profile, password: string): Promise<void> {
  const full: Profile = { ...EMPTY_PROFILE, ...profile };
  const users = (await readUsers()).filter((u) => u.phone !== full.phone);
  await writeUsers([...users, userFromProfile(full, password)]);
}

async function setLocalPassword(phone: string, password: string): Promise<void> {
  const users = await readUsers();
  await writeUsers(users.map((u) => (u.phone === phone ? { ...u, passwordHash: hashPassword(phone, password) } : u)));
}

/** Create an account (after OTP). Throws AuthError when the phone or email is already used. */
export async function register(profile: Profile, password: string): Promise<Profile> {
  if (isBackendConfigured()) {
    try {
      const session = await apiRegister(profile, password);
      setOffline(false);
      await saveLocal(session.profile, password);
      await rememberToken(session.token);
      return { ...EMPTY_PROFILE, ...session.profile };
    } catch (error) {
      if (definite(error, 'phone_taken', 'email_taken')) {
        throw new AuthError((error as ApiError).code === 'email_taken' ? 'email_taken' : 'phone_taken');
      }
      noteNetwork(error);
    }
  }
  const taken = await isTaken(profile.phone, profile.email);
  if (taken) throw new AuthError(taken);
  const users = await readUsers();
  await writeUsers([...users, userFromProfile(profile, password)]);
  await rememberToken(null);
  return profile;
}

/** Log in with phone or email + password. Resolves to the profile, or null when the details are wrong. */
export async function login(identifier: string, password: string): Promise<Profile | null> {
  if (isBackendConfigured()) {
    try {
      const session = await apiLogin(identifier, password);
      setOffline(false);
      await saveLocal(session.profile, password);
      await rememberToken(session.token);
      return { ...EMPTY_PROFILE, ...session.profile };
    } catch (error) {
      if (definite(error, 'invalid_credentials')) return null;
      noteNetwork(error);
    }
  }
  const users = await readUsers();
  const user = users.find((u) => matches(u, identifier));
  if (!user || user.passwordHash !== hashPassword(user.phone, password)) return null;
  await rememberToken(null);
  return user.profile;
}

/** Forgot password, step 1: is there an account for this phone / email? */
export async function accountExists(identifier: string): Promise<boolean> {
  if (isBackendConfigured()) {
    try {
      await apiForgotPassword(identifier);
      setOffline(false);
      return true;
    } catch (error) {
      if (definite(error, 'not_found')) return false;
      noteNetwork(error);
    }
  }
  return (await readUsers()).some((u) => matches(u, identifier));
}

/** Forgot password, last step (after OTP): set a new password. */
export async function resetPassword(identifier: string, newPassword: string): Promise<boolean> {
  const users = await readUsers();
  const local = users.find((u) => matches(u, identifier));
  if (isBackendConfigured()) {
    try {
      await apiResetPassword(identifier, DEMO_OTP, newPassword);
      setOffline(false);
      if (local) await setLocalPassword(local.phone, newPassword);
      return true;
    } catch (error) {
      if (definite(error, 'not_found')) return false;
      noteNetwork(error);
    }
  }
  if (!local) return false;
  await setLocalPassword(local.phone, newPassword);
  return true;
}

/** Signed-in user changes their own password. False when the current password is wrong. */
export async function changePassword(phone: string, current: string, next: string): Promise<boolean> {
  if (isBackendConfigured() && hasAuthToken()) {
    try {
      await apiChangePassword(current, next);
      setOffline(false);
      await setLocalPassword(phone, next);
      return true;
    } catch (error) {
      if (definite(error, 'wrong_password')) return false;
      noteNetwork(error);
    }
  }
  const users = await readUsers();
  const user = users.find((u) => u.phone === phone);
  if (!user || user.passwordHash !== hashPassword(phone, current)) return false;
  await setLocalPassword(phone, next);
  return true;
}

export async function getMe(phone: string): Promise<Profile | null> {
  return (await readUsers()).find((u) => u.phone === phone)?.profile ?? null;
}

/** Save profile changes. The role and phone number cannot be changed here. */
export async function updateMe(phone: string, patch: Partial<Profile>): Promise<Profile | null> {
  const users = await readUsers();
  const user = users.find((u) => u.phone === phone);
  if (!user) return null;
  const profile: Profile = { ...user.profile, ...patch, role: user.profile.role, phone: user.profile.phone };
  await writeUsers(users.map((u) => (u === user ? { ...u, email: profile.email.trim().toLowerCase(), profile } : u)));
  if (isBackendConfigured() && hasAuthToken()) {
    // Best effort: the device copy above is already saved.
    const { role: _role, phone: _phone, ...editable } = profile;
    apiUpdateMe(editable).catch((error) => noteNetwork(error));
  }
  return profile;
}

/** Demo role switcher: the demo account for a role (undefined for roles without one). */
export function getDemoProfile(role: Role): Profile | undefined {
  return DEMO_ACCOUNTS.find((demo) => demo.profile.role === role)?.profile;
}

/* ------------------------------- Appointments ------------------------------- */

export type PatientInfo = {
  forSelf: boolean;
  name: string;
  age: string;
  gender: Profile['gender'];
  relation: string;
  phone: string;
};

export type { PaymentInfo, PaymentMethod, PaymentStatus } from './api';

export type Appointment = {
  id: string;
  doctorId: string;
  hospitalId: string;
  departmentId: string;
  chamberId: string;
  /** YYYY-MM-DD */
  date: string;
  /** 24h "HH:mm" */
  time: string;
  serial: number;
  fee: number;
  patient: PatientInfo;
  reason: string;
  /** Missing on appointments saved before payments existed (treated as pay at chamber). */
  payment?: PaymentInfo;
  status: 'upcoming' | 'cancelled';
  createdAt: string;
};

export type CreateAppointmentInput = {
  doctorId: string;
  date: string;
  time: string;
  patient: PatientInfo;
  reason: string;
  payment: PaymentInfo;
  idempotencyKey: string;
};

const appointmentListeners = new Set<() => void>();

/** Lets the front desk / admin screens (demo mode) notice a new booking and its payment. */
export function subscribeAppointments(listener: () => void) {
  appointmentListeners.add(listener);
  return () => { appointmentListeners.delete(listener); };
}

async function readAppointments(): Promise<Appointment[]> {
  try {
    const raw = await AsyncStorage.getItem(APPOINTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Appointment[]) : [];
  } catch {
    return [];
  }
}

/** Book a slot. Tries the backend when one is configured, otherwise (or on failure) books in demo mode. */
export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const doctor = findDoctor(input.doctorId);
  const chamber = doctor.chambers[0];
  let serial: number | null = null;

  if (isBackendConfigured()) {
    try {
      const result = await apiCreateAppointment({
        doctorId: doctor.id,
        chamberId: chamber.chamberId,
        date: input.date,
        paymentMethod: input.payment.method,
        paymentStatus: input.payment.status,
        transactionId: input.payment.transactionId,
        amount: input.payment.amount,
        idempotencyKey: input.idempotencyKey,
      });
      setOffline(false);
      const parsed = Number.parseInt(result.serialNumber, 10);
      if (Number.isFinite(parsed)) serial = parsed;
    } catch {
      setOffline(true);
    }
  }
  if (serial === null) {
    await delay(700);
    serial = mockSerial(doctor, input.date, input.time);
  }

  const existing = await readAppointments();
  const duplicate = existing.find((a) => a.id === `apt-${input.idempotencyKey}`);
  if (duplicate) return duplicate;

  const appointment: Appointment = {
    id: `apt-${input.idempotencyKey}`,
    doctorId: doctor.id,
    hospitalId: doctor.hospitalId,
    departmentId: doctor.departmentId,
    chamberId: chamber.chamberId,
    date: input.date,
    time: input.time,
    serial,
    fee: doctor.fee,
    patient: input.patient,
    reason: input.reason,
    payment: input.payment,
    status: 'upcoming',
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([appointment, ...existing]));
  appointmentListeners.forEach((listener) => listener());
  return appointment;
}

/** My appointments, newest booking first. */
export async function getMyAppointments(): Promise<Appointment[]> {
  return readAppointments();
}

export function appointmentTimeLabel(appointment: Pick<Appointment, 'time'>): Localized {
  return timeLabel(appointment.time);
}
