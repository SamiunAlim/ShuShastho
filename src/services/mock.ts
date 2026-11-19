import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { TranslationKey } from '../constants/i18n';
import type { AppointmentConfirmation, CreateAppointmentInput, RiskLevel } from './api';

// Demo mode data (used when EXPO_PUBLIC_API_URL is not set). Fictional data only.

export type Localized = { en: string; bn: string };

export const DEMO = {
  patient: { en: 'Rahim Uddin', bn: 'রহিম উদ্দিন' } satisfies Localized,
  hospital: {
    en: 'Dhaka Medicare Hospital, Dhanmondi',
    bn: 'ঢাকা মেডিকেয়ার হাসপাতাল, ধানমন্ডি',
  } satisfies Localized,
  chamberId: 'dhaka-medicare-hospital-dhanmondi',
  doctorId: 'doctor-farhana',
  serial: 17,
  startServing: 12,
  fee: 800,
  visitTime: { en: '10:30 AM', bn: 'সকাল ১০:৩০' } satisfies Localized,
  visitTime24: '10:30',
  /** "Now serving" advances this often until it reaches the patient's serial. */
  queueAdvanceMs: 8000,
  /** Rough minutes per patient, for the estimated wait. */
  minutesPerPatient: 5,
  /** Simulated consultation length before the prescription appears. */
  consultationMs: 2500,
};

/** Fictional staff accounts for the demo role switcher / mock login. */
export const DEMO_STAFF = {
  doctor: { en: 'Dr. Farhana Ahmed', bn: 'ডা. ফারহানা আহমেদ' } satisfies Localized,
  receptionist: { en: 'Nasrin Akter', bn: 'নাসরিন আক্তার' } satisfies Localized,
  pharmacist: { en: 'Kamal Hossain', bn: 'কামাল হোসেন' } satisfies Localized,
  hospitalAdmin: { en: 'Tanvir Rahman', bn: 'তানভীর রহমান' } satisfies Localized,
  superAdmin: { en: 'Sabrina Chowdhury', bn: 'সাবরিনা চৌধুরী' } satisfies Localized,
  /** Number prefilled on the login screen so the demo can proceed with one tap. */
  phone: '1711234567',
};

/** Fictional hospitals and platform figures for the super-admin dashboard (web). */
export type DemoHospital = { id: string; name: Localized; doctors: number; patientsToday: number; approved: boolean };

export const HOSPITALS: DemoHospital[] = [
  { id: 'dhaka-medicare', name: DEMO.hospital, doctors: 4, patientsToday: 63, approved: true },
  { id: 'city-care', name: { en: 'City Care Clinic, Mirpur', bn: 'সিটি কেয়ার ক্লিনিক, মিরপুর' }, doctors: 6, patientsToday: 91, approved: true },
  { id: 'lakeside', name: { en: 'Lakeside Clinic, Chattogram', bn: 'লেকসাইড ক্লিনিক, চট্টগ্রাম' }, doctors: 2, patientsToday: 0, approved: false },
];

export const PLATFORM = { patients: 12480, aiChatsToday: 342 };

/** Fictional patients in Dr. Farhana's list (front desk + doctor screens). Serial #17 is the demo patient. */
export type DemoQueuePatient = {
  serial: number;
  name: Localized;
  phone: string;
  age: number;
  /** AI pre-visit summary line (demo data; the real one would come from the AI service). */
  summary: Localized;
  checkedIn: boolean;
};

export const DEMO_QUEUE: DemoQueuePatient[] = [
  { serial: 12, name: { en: 'Rafiq Mia', bn: 'রফিক মিয়া' }, phone: '1711000012', age: 58, checkedIn: true,
    summary: { en: 'Blood pressure review · no new symptoms', bn: 'রক্তচাপ পর্যালোচনা · নতুন উপসর্গ নেই' } },
  { serial: 13, name: { en: 'Sultana Begum', bn: 'সুলতানা বেগম' }, phone: '1711000013', age: 41, checkedIn: true,
    summary: { en: 'Cough 5 days, mild fever · Low risk', bn: '৫ দিনের কাশি, হালকা জ্বর · কম ঝুঁকি' } },
  { serial: 14, name: { en: 'Jahid Hasan', bn: 'জাহিদ হাসান' }, phone: '1711000014', age: 29, checkedIn: true,
    summary: { en: 'Lower back pain 2 weeks · Low risk', bn: '২ সপ্তাহ ধরে কোমরে ব্যথা · কম ঝুঁকি' } },
  { serial: 15, name: { en: 'Mitu Akter', bn: 'মিতু আক্তার' }, phone: '1711000015', age: 24, checkedIn: true,
    summary: { en: 'Skin itching and rash · Low risk', bn: 'ত্বকে চুলকানি ও ফুসকুড়ি · কম ঝুঁকি' } },
  { serial: 16, name: { en: 'Anwar Hossain', bn: 'আনোয়ার হোসেন' }, phone: '1711000016', age: 63, checkedIn: false,
    summary: { en: 'Diabetes follow-up · sugar chart attached', bn: 'ডায়াবেটিস ফলো-আপ · সুগারের চার্ট সংযুক্ত' } },
  { serial: 17, name: DEMO.patient, phone: '1711234567', age: 34, checkedIn: false,
    summary: {
      en: 'Fever 3 days, rash · Medium risk · consider dengue / viral fever. Suggested tests: CBC, NS1.',
      bn: 'জ্বর ৩ দিন, র‍্যাশ · মাঝারি ঝুঁকি · ডেঙ্গু / ভাইরাল জ্বর বিবেচনা করুন। প্রস্তাবিত পরীক্ষা: সিবিসি, এনএস১।',
    } },
];

/* ----------------------------- Booking catalog ----------------------------- */
// Hospitals, departments and doctors for the booking wizard. All access goes through src/services/data.ts.

type IconName = ComponentProps<typeof Ionicons>['name'];

export type Hospital = { id: string; name: Localized; area: Localized; address: Localized };

export const CATALOG_HOSPITALS: Hospital[] = [
  {
    id: 'dhaka-medicare',
    name: DEMO.hospital,
    area: { en: 'Dhanmondi, Dhaka', bn: 'ধানমন্ডি, ঢাকা' },
    address: { en: 'Road 27, Dhanmondi', bn: 'রোড ২৭, ধানমন্ডি' },
  },
  {
    id: 'city-care',
    name: { en: 'City Care Clinic, Mirpur', bn: 'সিটি কেয়ার ক্লিনিক, মিরপুর' },
    area: { en: 'Mirpur 10, Dhaka', bn: 'মিরপুর ১০, ঢাকা' },
    address: { en: 'Section 10, Mirpur', bn: 'সেকশন ১০, মিরপুর' },
  },
  {
    id: 'niramoy',
    name: { en: 'Niramoy Health Centre, Mohammadpur', bn: 'নিরাময় হেলথ সেন্টার, মোহাম্মদপুর' },
    area: { en: 'Mohammadpur, Dhaka', bn: 'মোহাম্মদপুর, ঢাকা' },
    address: { en: 'Town Hall Road, Mohammadpur', bn: 'টাউন হল রোড, মোহাম্মদপুর' },
  },
];

export type Department = { id: string; name: Localized; icon: IconName };

export const DEPARTMENTS: Department[] = [
  { id: 'medicine', name: { en: 'Medicine', bn: 'মেডিসিন' }, icon: 'medkit-outline' },
  { id: 'cardiology', name: { en: 'Cardiology', bn: 'হৃদরোগ' }, icon: 'heart-outline' },
  { id: 'gynaecology', name: { en: 'Gynaecology', bn: 'গাইনি' }, icon: 'flower-outline' },
  { id: 'paediatrics', name: { en: 'Paediatrics', bn: 'শিশু' }, icon: 'happy-outline' },
  { id: 'dermatology', name: { en: 'Dermatology', bn: 'চর্মরোগ' }, icon: 'hand-left-outline' },
  { id: 'orthopaedics', name: { en: 'Orthopaedics', bn: 'অর্থোপেডিক্স' }, icon: 'body-outline' },
];

export type Chamber = { hospitalId: string; chamberId: string; room: Localized; days: Localized };

export type DemoDoctor = {
  id: string;
  name: Localized;
  initials: Localized;
  /** e.g. "Medicine Specialist" */
  specialty: Localized;
  degrees: Localized;
  rating: number;
  fee: number;
  gender: 'female' | 'male';
  hospitalId: string;
  departmentId: string;
  chambers: Chamber[];
  /** Visiting times, 24h "HH:mm". */
  slotTimes: string[];
  /** Summary for list cards. */
  nextSlot: Localized;
  slots: number;
};

const MORNING = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
const EVENING = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

const DAYS_SAT_THU: Localized = { en: 'Sat – Thu', bn: 'শনি – বৃহ' };
const DAYS_SUN_THU: Localized = { en: 'Sun – Thu', bn: 'রবি – বৃহ' };

type DoctorSpec = {
  id: string; en: string; bn: string; init: [string, string]; dept: string; hospital: string;
  degEn: string; degBn: string; rating: number; fee: number; gender: 'female' | 'male';
  room: [string, string]; days: Localized; times: string[];
};

const SPECIALTY_SUFFIX: Record<string, Localized> = {
  medicine: { en: 'Medicine Specialist', bn: 'মেডিসিন বিশেষজ্ঞ' },
  cardiology: { en: 'Cardiology Specialist', bn: 'হৃদরোগ বিশেষজ্ঞ' },
  gynaecology: { en: 'Gynaecologist', bn: 'গাইনি বিশেষজ্ঞ' },
  paediatrics: { en: 'Child Specialist', bn: 'শিশু বিশেষজ্ঞ' },
  dermatology: { en: 'Skin Specialist', bn: 'চর্মরোগ বিশেষজ্ঞ' },
  orthopaedics: { en: 'Orthopaedic Surgeon', bn: 'অর্থোপেডিক সার্জন' },
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** "10:30" → { en: "10:30 AM", bn: "সকাল ১০:৩০" } */
export function timeLabel(time: string): Localized {
  const [h, m] = time.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const bnDigits = '০১২৩৪৫৬৭৮৯';
  const bnNum = (value: string) => value.replace(/\d/g, (d) => bnDigits[Number(d)]);
  const period = h < 5 ? 'ভোর' : h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  return {
    en: `${h12}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`,
    bn: `${period} ${bnNum(`${h12}:${pad2(m)}`)}`,
  };
}

const DOCTOR_SPECS: DoctorSpec[] = [
  { id: DEMO.doctorId, en: 'Dr. Farhana Ahmed', bn: 'ডা. ফারহানা আহমেদ', init: ['FA', 'ফা'], dept: 'medicine', hospital: 'dhaka-medicare',
    degEn: 'MBBS, FCPS (Medicine)', degBn: 'এমবিবিএস, এফসিপিএস (মেডিসিন)', rating: 4.9, fee: DEMO.fee, gender: 'female',
    room: ['Room 304', 'রুম ৩০৪'], days: DAYS_SAT_THU, times: ['10:30', '11:00', '11:30', '12:00'] },
  { id: 'doctor-imran', en: 'Dr. Imran Hossain', bn: 'ডা. ইমরান হোসেন', init: ['IH', 'ই'], dept: 'medicine', hospital: 'city-care',
    degEn: 'MBBS, MD (Medicine)', degBn: 'এমবিবিএস, এমডি (মেডিসিন)', rating: 4.7, fee: 600, gender: 'male',
    room: ['Room 12', 'রুম ১২'], days: DAYS_SUN_THU, times: EVENING },
  { id: 'doctor-shirin', en: 'Dr. Shirin Sultana', bn: 'ডা. শিরিন সুলতানা', init: ['SS', 'শি'], dept: 'medicine', hospital: 'niramoy',
    degEn: 'MBBS, BCS (Health)', degBn: 'এমবিবিএস, বিসিএস (স্বাস্থ্য)', rating: 4.6, fee: 500, gender: 'female',
    room: ['Room 5', 'রুম ৫'], days: DAYS_SAT_THU, times: MORNING },

  { id: 'doctor-tanvir', en: 'Dr. Tanvir Karim', bn: 'ডা. তানভীর করিম', init: ['TK', 'তা'], dept: 'cardiology', hospital: 'dhaka-medicare',
    degEn: 'MBBS, MD (Cardiology)', degBn: 'এমবিবিএস, এমডি (কার্ডিওলজি)', rating: 4.8, fee: 1000, gender: 'male',
    room: ['Room 410', 'রুম ৪১০'], days: DAYS_SAT_THU, times: ['12:00', '12:30', '13:00', '13:30'] },
  { id: 'doctor-aminul', en: 'Dr. Aminul Islam', bn: 'ডা. আমিনুল ইসলাম', init: ['AI', 'আ'], dept: 'cardiology', hospital: 'city-care',
    degEn: 'MBBS, FCPS (Cardiology)', degBn: 'এমবিবিএস, এফসিপিএস (কার্ডিওলজি)', rating: 4.8, fee: 1200, gender: 'male',
    room: ['Room 21', 'রুম ২১'], days: DAYS_SUN_THU, times: EVENING },

  { id: 'doctor-nusrat', en: 'Dr. Nusrat Jahan', bn: 'ডা. নুসরাত জাহান', init: ['NJ', 'নু'], dept: 'gynaecology', hospital: 'dhaka-medicare',
    degEn: 'MBBS, FCPS (Gynaecology)', degBn: 'এমবিবিএস, এফসিপিএস (গাইনি)', rating: 4.9, fee: 900, gender: 'female',
    room: ['Room 215', 'রুম ২১৫'], days: DAYS_SAT_THU, times: MORNING },
  { id: 'doctor-rokeya', en: 'Dr. Rokeya Begum', bn: 'ডা. রোকেয়া বেগম', init: ['RB', 'রো'], dept: 'gynaecology', hospital: 'niramoy',
    degEn: 'MBBS, DGO', degBn: 'এমবিবিএস, ডিজিও', rating: 4.7, fee: 700, gender: 'female',
    room: ['Room 8', 'রুম ৮'], days: DAYS_SAT_THU, times: EVENING },

  { id: 'doctor-mahbub', en: 'Dr. Mahbub Alam', bn: 'ডা. মাহবুব আলম', init: ['MA', 'মা'], dept: 'paediatrics', hospital: 'city-care',
    degEn: 'MBBS, DCH', degBn: 'এমবিবিএস, ডিসিএইচ', rating: 4.8, fee: 700, gender: 'male',
    room: ['Room 15', 'রুম ১৫'], days: DAYS_SAT_THU, times: MORNING },
  { id: 'doctor-tasnim', en: 'Dr. Tasnim Rahman', bn: 'ডা. তাসনিম রহমান', init: ['TR', 'তা'], dept: 'paediatrics', hospital: 'dhaka-medicare',
    degEn: 'MBBS, FCPS (Paediatrics)', degBn: 'এমবিবিএস, এফসিপিএস (শিশু)', rating: 4.9, fee: 800, gender: 'female',
    room: ['Room 118', 'রুম ১১৮'], days: DAYS_SUN_THU, times: EVENING },
  { id: 'doctor-sabbir', en: 'Dr. Sabbir Ahmed', bn: 'ডা. সাব্বির আহমেদ', init: ['SA', 'সা'], dept: 'paediatrics', hospital: 'niramoy',
    degEn: 'MBBS, DCH', degBn: 'এমবিবিএস, ডিসিএইচ', rating: 4.5, fee: 500, gender: 'male',
    room: ['Room 3', 'রুম ৩'], days: DAYS_SAT_THU, times: MORNING },

  { id: 'doctor-lamia', en: 'Dr. Lamia Haque', bn: 'ডা. লামিয়া হক', init: ['LH', 'লা'], dept: 'dermatology', hospital: 'city-care',
    degEn: 'MBBS, MD (Dermatology)', degBn: 'এমবিবিএস, এমডি (চর্মরোগ)', rating: 4.8, fee: 800, gender: 'female',
    room: ['Room 30', 'রুম ৩০'], days: DAYS_SUN_THU, times: EVENING },
  { id: 'doctor-arif', en: 'Dr. Arif Chowdhury', bn: 'ডা. আরিফ চৌধুরী', init: ['AC', 'আ'], dept: 'dermatology', hospital: 'dhaka-medicare',
    degEn: 'MBBS, DDV', degBn: 'এমবিবিএস, ডিডিভি', rating: 4.6, fee: 900, gender: 'male',
    room: ['Room 207', 'রুম ২০৭'], days: DAYS_SAT_THU, times: MORNING },

  { id: 'doctor-kamrul', en: 'Dr. Kamrul Hasan', bn: 'ডা. কামরুল হাসান', init: ['KH', 'কা'], dept: 'orthopaedics', hospital: 'dhaka-medicare',
    degEn: 'MBBS, MS (Orthopaedics)', degBn: 'এমবিবিএস, এমএস (অর্থোপেডিক্স)', rating: 4.8, fee: 1000, gender: 'male',
    room: ['Room 502', 'রুম ৫০২'], days: DAYS_SAT_THU, times: EVENING },
  { id: 'doctor-delwar', en: 'Dr. Delwar Hossain', bn: 'ডা. দেলোয়ার হোসেন', init: ['DH', 'দে'], dept: 'orthopaedics', hospital: 'niramoy',
    degEn: 'MBBS, D-Ortho', degBn: 'এমবিবিএস, ডি-অর্থো', rating: 4.5, fee: 600, gender: 'male',
    room: ['Room 9', 'রুম ৯'], days: DAYS_SAT_THU, times: MORNING },
  { id: 'doctor-mizanur', en: 'Dr. Mizanur Rahman', bn: 'ডা. মিজানুর রহমান', init: ['MR', 'মি'], dept: 'orthopaedics', hospital: 'city-care',
    degEn: 'MBBS, FCPS (Orthopaedics)', degBn: 'এমবিবিএস, এফসিপিএস (অর্থোপেডিক্স)', rating: 4.7, fee: 900, gender: 'male',
    room: ['Room 40', 'রুম ৪০'], days: DAYS_SUN_THU, times: EVENING },
];

export const doctors: DemoDoctor[] = DOCTOR_SPECS.map((spec) => ({
  id: spec.id,
  name: { en: spec.en, bn: spec.bn },
  initials: { en: spec.init[0], bn: spec.init[1] },
  specialty: SPECIALTY_SUFFIX[spec.dept],
  degrees: { en: spec.degEn, bn: spec.degBn },
  rating: spec.rating,
  fee: spec.fee,
  gender: spec.gender,
  hospitalId: spec.hospital,
  departmentId: spec.dept,
  chambers: [{
    hospitalId: spec.hospital,
    // The demo doctor keeps the chamber id the backend already knows.
    chamberId: spec.id === DEMO.doctorId ? DEMO.chamberId : `${spec.hospital}-${spec.id}`,
    room: { en: spec.room[0], bn: spec.room[1] },
    days: spec.days,
  }],
  slotTimes: spec.times,
  nextSlot: timeLabel(spec.times[0]),
  slots: spec.times.length,
}));

export function findDoctor(id?: string): DemoDoctor {
  return doctors.find((doctor) => doctor.id === id) ?? doctors[0];
}

export function findHospital(id?: string): Hospital {
  return CATALOG_HOSPITALS.find((hospital) => hospital.id === id) ?? CATALOG_HOSPITALS[0];
}

export function findDepartment(id?: string): Department | undefined {
  return DEPARTMENTS.find((department) => department.id === id);
}

function hashString(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash;
}

export type Slot = { time: string; label: Localized; available: boolean };

/** Deterministic mock availability: about a quarter of the slots are already taken. */
export function mockSlots(doctor: DemoDoctor, isoDate: string, takenByMe: string[] = []): Slot[] {
  return doctor.slotTimes.map((time) => {
    const demoSlot = doctor.id === DEMO.doctorId && time === DEMO.visitTime24;
    const booked = !demoSlot && hashString(`${doctor.id}|${isoDate}|${time}`) % 4 === 0;
    return { time, label: timeLabel(time), available: !booked && !takenByMe.includes(time) };
  });
}

/** Serial number for a new booking. The demo story always gets #17. */
export function mockSerial(doctor: DemoDoctor, isoDate: string, time: string): number {
  if (doctor.id === DEMO.doctorId && time === DEMO.visitTime24) return DEMO.serial;
  const index = Math.max(0, doctor.slotTimes.indexOf(time));
  return 6 + index * 3 + (hashString(`${doctor.id}|${isoDate}|${time}`) % 3);
}

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ---------------------------------- AI chat --------------------------------- */

export type MockAssistantReply = {
  textKey: TranslationKey;
  risk?: RiskLevel;
  requiresUrgentCare?: boolean;
  specialtyKey?: TranslationKey;
  sourceKeys?: TranslationKey[];
};

const RED_FLAGS = [
  'chest pain', 'trouble breathing', 'difficulty breathing', "can't breathe", 'unconscious',
  'seizure', 'severe bleeding', 'fainted',
  'বুকে ব্যথা', 'শ্বাসকষ্ট', 'শ্বাস নিতে', 'অজ্ঞান', 'খিঁচুনি', 'প্রচুর রক্ত',
];

/**
 * Scripted replies for the demo:
 * red flag → emergency (999) · 1st message → ask temperature · afterwards → Medium risk.
 */
export function mockAssistantReply(message: string, userMessageCount: number): MockAssistantReply {
  const lower = message.toLowerCase();
  if (RED_FLAGS.some((flag) => lower.includes(flag))) {
    return { textKey: 'aiRedFlagReply', risk: 'emergency', requiresUrgentCare: true };
  }
  if (userMessageCount <= 1) {
    return { textKey: 'aiAskTemperature' };
  }
  return {
    textKey: 'aiMediumReply',
    risk: 'moderate',
    requiresUrgentCare: false,
    specialtyKey: 'specialtyMedicine',
    sourceKeys: ['sourceDghsDengue'],
  };
}

/* ---------------------------------- Booking --------------------------------- */

export async function mockCreateAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentConfirmation> {
  await delay(700);
  return {
    appointmentId: `demo-${input.idempotencyKey}`,
    serialNumber: String(DEMO.serial),
    estimatedTime: DEMO.visitTime.en,
  };
}

/* ------------------------- Prescription & pharmacies ------------------------ */

export type DemoMedicine = { id: string; name: Localized; schedule: Localized };

export const prescription = {
  id: 'rx-001',
  diagnosis: { en: 'Suspected dengue fever', bn: 'সন্দেহজনক ডেঙ্গু জ্বর' } satisfies Localized,
  medicines: [
    {
      id: 'paracetamol',
      name: { en: 'Paracetamol 500 mg', bn: 'প্যারাসিটামল ৫০০ মি.গ্রা.' },
      schedule: { en: 'Morning · Noon · Night · 5 days', bn: 'সকাল · দুপুর · রাত · ৫ দিন' },
    },
    {
      id: 'ors',
      name: { en: 'ORS saline', bn: 'ওআরএস স্যালাইন' },
      schedule: { en: '6 times a day · 3 days', bn: 'দিনে ৬ বার · ৩ দিন' },
    },
    {
      id: 'cetirizine',
      name: { en: 'Cetirizine 10 mg', bn: 'সেটিরিজিন ১০ মি.গ্রা.' },
      schedule: { en: 'Night · 7 days', bn: 'রাত · ৭ দিন' },
    },
  ] satisfies DemoMedicine[],
  tests: ['CBC', 'NS1'],
  /** Follow-up is this many days from today. */
  followUpInDays: 1,
};

export type DemoPharmacy = {
  id: string;
  name: Localized;
  detail: Localized;
  price: number;
  inStock: number;
  /** Shown on the stock chip when something is missing. */
  missing?: Localized;
};

export const pharmacies: DemoPharmacy[] = [
  {
    id: 'hospital',
    name: { en: 'Hospital Pharmacy', bn: 'হাসপাতাল ফার্মেসি' },
    detail: { en: 'Dhaka Medicare · Same building', bn: 'ঢাকা মেডিকেয়ার · একই ভবনে' },
    price: 285,
    inStock: 3,
  },
  {
    id: 'rahman',
    name: { en: 'Rahman Pharmacy, Dhanmondi', bn: 'রহমান ফার্মেসি, ধানমন্ডি' },
    detail: { en: '0.6 km · Open until 11 PM', bn: '০.৬ কি.মি. · খোলা রাত ১১টা পর্যন্ত' },
    price: 260,
    inStock: 3,
  },
  {
    id: 'seba',
    name: { en: 'Seba Pharmacy, Kalabagan', bn: 'সেবা ফার্মেসি, কলাবাগান' },
    detail: { en: '1.4 km · No Cetirizine', bn: '১.৪ কি.মি. · সেটিরিজিন নেই' },
    price: 190,
    inStock: 2,
    missing: { en: 'Cetirizine', bn: 'সেটিরিজিন' },
  },
];

export function findPharmacy(id?: string | null): DemoPharmacy | undefined {
  return pharmacies.find((pharmacy) => pharmacy.id === id);
}

/* ------------------------------ Report (CBC/NS1) ---------------------------- */

export type ReportStatus = 'low' | 'normal' | 'positive';

export const report = {
  lab: 'Niramoy Diagnostics',
  rows: [
    {
      id: 'platelets',
      test: { en: 'Platelets', bn: 'প্লেটলেট' } satisfies Localized,
      result: 95000,
      resultText: null as Localized | null,
      /** `en-IN` grouping gives lakh style: 1,50,000. */
      normal: { en: '1.5–4.5 lakh', bn: '১.৫–৪.৫ লাখ' } satisfies Localized,
      status: 'low' as ReportStatus,
    },
    {
      id: 'wbc',
      test: { en: 'WBC', bn: 'ডব্লিউবিসি' } satisfies Localized,
      result: 3800,
      resultText: null as Localized | null,
      normal: { en: '4,000–11,000', bn: '৪,০০০–১১,০০০' } satisfies Localized,
      status: 'low' as ReportStatus,
    },
    {
      id: 'hb',
      test: { en: 'Hemoglobin', bn: 'হিমোগ্লোবিন' } satisfies Localized,
      result: 13.8,
      resultText: null as Localized | null,
      normal: { en: '13–17 g/dL', bn: '১৩–১৭ g/dL' } satisfies Localized,
      status: 'normal' as ReportStatus,
    },
    {
      id: 'ns1',
      test: { en: 'NS1 antigen', bn: 'এনএস১ অ্যান্টিজেন' } satisfies Localized,
      result: 0,
      resultText: { en: 'Positive', bn: 'পজিটিভ' } satisfies Localized,
      normal: { en: 'Negative', bn: 'নেগেটিভ' } satisfies Localized,
      status: 'positive' as ReportStatus,
    },
  ],
  plateletHistory: [
    { label: { en: 'Mar 2026', bn: 'মার্চ ২০২৬' } satisfies Localized, value: 180000 },
    { label: { en: 'Nov 2026', bn: 'নভেম্বর ২০২৬' } satisfies Localized, value: 95000 },
  ],
};

/* --------------------------------- Check-in --------------------------------- */

export const CHECKIN = {
  day: 2,
  totalDays: 5,
  defaultTempF: 100,
  minTempF: 96,
  maxTempF: 106,
  /** Temperature at or above this is a warning sign on its own. */
  redFlagTempF: 103,
};

export const checkinSymptoms = [
  { id: 'belly', labelKey: 'symBelly' },
  { id: 'bleeding', labelKey: 'symBleeding' },
  { id: 'vomiting', labelKey: 'symVomiting' },
  { id: 'weakness', labelKey: 'symWeakness' },
] as const satisfies readonly { id: string; labelKey: TranslationKey }[];

/* ------------------------------------ SOS ----------------------------------- */

export const sosHospitals = [
  { id: 'medicare', nameKey: 'hospitalOne', metaKey: 'hospitalOneMeta' },
  { id: 'citycare', nameKey: 'hospitalTwo', metaKey: 'hospitalTwoMeta' },
] as const satisfies readonly { id: string; nameKey: TranslationKey; metaKey: TranslationKey }[];

/** Maps an AI "suggested specialty" (any language) to a department id; undefined when unknown. */
export function matchDepartment(text?: string | null): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  const rules: [string, string[]][] = [
    ['cardiology', ['cardio', 'heart', 'হৃদ']],
    ['gynaecology', ['gyn', 'obstet', 'গাইনি', 'প্রসূতি']],
    ['paediatrics', ['paed', 'pediat', 'child', 'শিশু']],
    ['dermatology', ['derm', 'skin', 'চর্ম', 'ত্বক']],
    ['orthopaedics', ['ortho', 'bone', 'অর্থো', 'হাড়']],
    ['medicine', ['medicine', 'physician', 'general', 'মেডিসিন']],
  ];
  return rules.find(([, words]) => words.some((word) => lower.includes(word)))?.[0];
}
