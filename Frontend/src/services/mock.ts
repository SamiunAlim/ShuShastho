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
  { id: 'city-care', name: { en: 'City Care General Hospital, Mirpur', bn: 'সিটি কেয়ার জেনারেল হাসপাতাল, মিরপুর' }, doctors: 6, patientsToday: 91, approved: true },
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

export type DemoDoctor = {
  id: string;
  name: Localized;
  initials: Localized;
  specialty: Localized;
  degrees: Localized;
  rating: number;
  fee: number;
  nextSlot: Localized;
  slots: number;
};

export const doctors: DemoDoctor[] = [
  {
    id: DEMO.doctorId,
    name: { en: 'Dr. Farhana Ahmed', bn: 'ডা. ফারহানা আহমেদ' },
    initials: { en: 'FA', bn: 'ফা' },
    specialty: { en: 'Medicine Specialist', bn: 'মেডিসিন বিশেষজ্ঞ' },
    degrees: { en: 'MBBS, FCPS (Medicine)', bn: 'এমবিবিএস, এফসিপিএস (মেডিসিন)' },
    rating: 4.9,
    fee: DEMO.fee,
    nextSlot: DEMO.visitTime,
    slots: 2,
  },
  {
    id: 'doctor-tanvir',
    name: { en: 'Dr. Tanvir Karim', bn: 'ডা. তানভীর করিম' },
    initials: { en: 'TK', bn: 'তা' },
    specialty: { en: 'Cardiology', bn: 'হৃদরোগ বিশেষজ্ঞ' },
    degrees: { en: 'MBBS, MD (Cardiology)', bn: 'এমবিবিএস, এমডি (কার্ডিওলজি)' },
    rating: 4.8,
    fee: 1000,
    nextSlot: { en: '12:00 PM', bn: 'দুপুর ১২:০০' },
    slots: 4,
  },
];

export function findDoctor(id?: string): DemoDoctor {
  return doctors.find((doctor) => doctor.id === id) ?? doctors[0];
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
