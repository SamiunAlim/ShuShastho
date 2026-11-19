import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAppointment as apiCreateAppointment,
  isBackendConfigured,
} from './api';
import { setOffline } from './connection';
import {
  CATALOG_HOSPITALS,
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
  name: string;
  age: string;
  /** DD/MM/YYYY, optional (age is derived from it when valid). */
  dob: string;
  gender: 'female' | 'male' | 'other' | '';
  district: string;
  area: string;
  bloodGroup: string;
  emergencyContact: string;
  allergies: string;
  /** Keys of the chronic-condition chips the user ticked. */
  chronic: string[];
  consent: boolean;
};

export const EMPTY_PROFILE: Profile = {
  name: '', age: '', dob: '', gender: '', district: '', area: '', bloodGroup: '',
  emergencyContact: '', allergies: '', chronic: [], consent: false,
};

type StoredAccount = { phone: string; pinHash: string; profile: Profile };

const ACCOUNT_KEY = 'shushastho.account';
const APPOINTMENTS_KEY = 'shushastho.appointments';

/** Demo only: a real backend would hash the PIN on the server. */
function hashPin(phone: string, pin: string): string {
  let hash = 5381;
  const text = `${phone}:${pin}`;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return String(hash);
}

async function readAccount(): Promise<StoredAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredAccount;
    // Older saves have fewer profile fields.
    return { ...stored, profile: { ...EMPTY_PROFILE, ...stored.profile } };
  } catch {
    return null;
  }
}

async function writeAccount(account: StoredAccount): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

/** The phone saved on this device (so the login screen can ask for the PIN only), or null for a new device. */
export async function getSavedPhone(): Promise<string | null> {
  return (await readAccount())?.phone ?? null;
}

/** Create the account after OTP + profile setup + PIN. Replaces any account saved on this device. */
export async function register(input: { phone: string; profile: Profile; pin: string }): Promise<Profile> {
  await writeAccount({ phone: input.phone, pinHash: hashPin(input.phone, input.pin), profile: input.profile });
  return input.profile;
}

/** Phone + PIN login (no OTP). Resolves to the profile, or null when the PIN is wrong. */
export async function loginWithPin(phone: string, pin: string): Promise<Profile | null> {
  const account = await readAccount();
  if (!account || account.phone !== phone || account.pinHash !== hashPin(phone, pin)) return null;
  return account.profile;
}

/** "Forgot PIN": after OTP, set a new PIN for the saved account. */
export async function resetPin(phone: string, pin: string): Promise<Profile | null> {
  const account = await readAccount();
  if (!account || account.phone !== phone) return null;
  await writeAccount({ ...account, pinHash: hashPin(phone, pin) });
  return account.profile;
}

export async function getMe(): Promise<{ phone: string; profile: Profile } | null> {
  const account = await readAccount();
  return account ? { phone: account.phone, profile: account.profile } : null;
}

export async function updateMe(patch: Partial<Profile>): Promise<Profile | null> {
  const account = await readAccount();
  if (!account) return null;
  const profile = { ...account.profile, ...patch };
  await writeAccount({ ...account, profile });
  return profile;
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
  status: 'upcoming' | 'cancelled';
  createdAt: string;
};

export type CreateAppointmentInput = {
  doctorId: string;
  date: string;
  time: string;
  patient: PatientInfo;
  reason: string;
  idempotencyKey: string;
};

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
        paymentMethod: 'cash_at_chamber',
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
    status: 'upcoming',
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([appointment, ...existing]));
  return appointment;
}

/** My appointments, newest booking first. */
export async function getMyAppointments(): Promise<Appointment[]> {
  return readAppointments();
}

export function appointmentTimeLabel(appointment: Pick<Appointment, 'time'>): Localized {
  return timeLabel(appointment.time);
}
