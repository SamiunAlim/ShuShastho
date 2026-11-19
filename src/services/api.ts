import { Language } from '../constants/i18n';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 4000;
let accessTokenProvider: (() => Promise<string | null>) | undefined;

export function setAccessTokenProvider(provider: () => Promise<string | null>) {
  accessTokenProvider = provider;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'emergency';

export type SymptomAgentReply = {
  conversationId: string;
  reply: string;
  riskLevel: RiskLevel;
  requiresUrgentCare: boolean;
  suggestedSpecialty?: string;
  sources: { title: string; url?: string }[];
};

export type CreateAppointmentInput = {
  doctorId: string;
  chamberId: string;
  date: string;
  paymentMethod: 'cash_at_chamber';
  idempotencyKey: string;
};

export type AppointmentConfirmation = {
  appointmentId: string;
  serialNumber: string;
  estimatedTime: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Machine-readable reason from the backend, e.g. "phone_taken". */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function request<T>(
  path: string,
  init: RequestInit,
  validate: (value: unknown) => value is T,
  /** `auth: false` for log in / sign up / forgot password, which have no token yet. */
  options: { auth?: boolean } = {},
): Promise<T> {
  const auth = options.auth ?? true;
  if (!API_BASE_URL) {
    throw new ApiError('Backend is not configured. Set EXPO_PUBLIC_API_URL.');
  }
  if (auth && !accessTokenProvider) {
    throw new ApiError('Authentication is not configured. Sign in before using the health service.');
  }

  let accessToken: string | null | undefined;
  if (auth) {
    try {
      accessToken = await accessTokenProvider?.();
    } catch {
      throw new ApiError('Could not authorize this request. Please sign in again.');
    }
    if (!accessToken) {
      throw new ApiError('Sign in before using the health service.');
    }
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Could not reach the health service.');
  } finally {
    clearTimeout(timeout);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
      ? body.error.message
      : `Health service request failed (${response.status}).`;
    const code = isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string' ? body.error.code : undefined;
    throw new ApiError(message, response.status, code);
  }

  if (!validate(body)) {
    throw new ApiError('Health service returned an unexpected response.');
  }
  return body;
}

function isSymptomAgentReply(value: unknown): value is SymptomAgentReply {
  if (!isRecord(value)) return false;
  return typeof value.conversationId === 'string'
    && typeof value.reply === 'string'
    && ['low', 'moderate', 'high', 'emergency'].includes(String(value.riskLevel))
    && typeof value.requiresUrgentCare === 'boolean'
    && (value.suggestedSpecialty === undefined || typeof value.suggestedSpecialty === 'string')
    && Array.isArray(value.sources)
    && value.sources.every((source) => isRecord(source)
      && typeof source.title === 'string'
      && (source.url === undefined || typeof source.url === 'string'));
}

function isAppointmentConfirmation(value: unknown): value is AppointmentConfirmation {
  return isRecord(value)
    && typeof value.appointmentId === 'string'
    && typeof value.serialNumber === 'string'
    && typeof value.estimatedTime === 'string';
}

export function isBackendConfigured() {
  return Boolean(API_BASE_URL);
}

export function sendSymptomMessage(input: {
  conversationId: string;
  message: string;
  language: Language;
}): Promise<SymptomAgentReply> {
  return request(
    '/v1/ai/agents/symptom-triage/messages',
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        consent: { granted: true, policyVersion: 'ai-guidance-v1' },
      }),
    },
    isSymptomAgentReply,
  );
}

export function createAppointment(input: CreateAppointmentInput): Promise<AppointmentConfirmation> {
  const { idempotencyKey, ...body } = input;
  return request(
    '/v1/appointments',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    },
    isAppointmentConfirmation,
  );
}

/* ------------------------- Demo auth (backend demo-login) ------------------------ */

type BackendRole = 'patient' | 'receptionist' | 'doctor';
let backendRole: BackendRole = 'patient';
let cachedToken: { role: BackendRole; token: string } | null = null;

/** The backend only knows three demo roles; the other staff roles use the receptionist token. */
export function setBackendRole(role: string | null | undefined) {
  const next: BackendRole = role === 'doctor' ? 'doctor' : role === 'patient' || !role ? 'patient' : 'receptionist';
  if (next !== backendRole) cachedToken = null;
  backendRole = next;
}

/** Real session token from POST /v1/auth/login or /register; used instead of the demo token while set. */
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function hasAuthToken() {
  return authToken !== null;
}

async function getDemoToken(): Promise<string | null> {
  if (!API_BASE_URL) return null;
  if (authToken) return authToken;
  if (cachedToken?.role === backendRole) return cachedToken.token;
  const role = backendRole;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ role }),
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(body) || typeof body.token !== 'string') return null;
    cachedToken = { role, token: body.token };
    return body.token;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Registers the demo-login token as the access token for every API request. */
export function initDemoAuth() {
  setAccessTokenProvider(getDemoToken);
}

/* ---------------------------------- Doctors ---------------------------------- */

type Localized = { en: string; bn: string };

export type ApiDoctor = {
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

export function fetchDoctors(): Promise<ApiDoctor[]> {
  return request('/v1/doctors', { method: 'GET' }, (value): value is ApiDoctor[] => Array.isArray(value));
}

/* ----------------------------------- Queue ----------------------------------- */

export type QueueItem = {
  appointmentId: string;
  serialNumber: number;
  patientName: Localized;
  phone: string;
  age: number;
  summary: Localized;
  checkedIn: boolean;
  noShow: boolean;
  status: 'done' | 'serving' | 'waiting' | 'no_show';
};

export type QueueResponse = { doctorId: string; nowServing: number; items: QueueItem[] };

function isQueueResponse(value: unknown): value is QueueResponse {
  return isRecord(value) && typeof value.doctorId === 'string' && typeof value.nowServing === 'number'
    && Array.isArray(value.items);
}

const enc = encodeURIComponent;

export function fetchQueue(doctorId: string): Promise<QueueResponse> {
  return request(`/v1/queue/${enc(doctorId)}`, { method: 'GET' }, isQueueResponse);
}

export function checkInAppointment(appointmentId: string): Promise<QueueResponse> {
  return request(`/v1/queue/${enc(appointmentId)}/check-in`, { method: 'POST' }, isQueueResponse);
}

export function markNoShow(appointmentId: string): Promise<QueueResponse> {
  return request(`/v1/queue/${enc(appointmentId)}/no-show`, { method: 'POST' }, isQueueResponse);
}

export function restoreAppointment(appointmentId: string): Promise<QueueResponse> {
  return request(`/v1/queue/${enc(appointmentId)}/restore`, { method: 'POST' }, isQueueResponse);
}

export function callNextPatient(doctorId: string): Promise<QueueResponse> {
  return request(`/v1/queue/${enc(doctorId)}/call-next`, { method: 'POST' }, isQueueResponse);
}

/* ------------------------------- Emergency alerts ------------------------------ */

export type EmergencyAlert = {
  id: string;
  patientName: string;
  phone: string | null;
  message: string;
  location: string | null;
  source: 'sos' | 'ai-triage' | 'checkin';
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
  updatedAt: string | null;
};

function isAlert(value: unknown): value is EmergencyAlert {
  return isRecord(value) && typeof value.id === 'string';
}

export function postEmergencyAlert(input: {
  patientName?: string;
  phone?: string;
  message?: string;
  source?: EmergencyAlert['source'];
}): Promise<EmergencyAlert> {
  return request('/v1/emergency/alerts', { method: 'POST', body: JSON.stringify(input) }, isAlert);
}

export function fetchEmergencyAlerts(): Promise<EmergencyAlert[]> {
  return request('/v1/emergency/alerts', { method: 'GET' }, (value): value is EmergencyAlert[] => Array.isArray(value));
}

export function updateEmergencyAlert(id: string, status: 'acknowledged' | 'resolved'): Promise<EmergencyAlert> {
  return request(`/v1/emergency/alerts/${enc(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, isAlert);
}

/* ------------------------------- Accounts (users) ------------------------------ */

/** Matches `Profile` in src/services/data.ts and backend/app/accounts.py. */
export type ApiProfile = import('./data').Profile;
export type ApiSession = { token: string; profile: ApiProfile };

const isSession = (value: unknown): value is ApiSession =>
  isRecord(value) && typeof value.token === 'string' && isRecord(value.profile);
const isProfile = (value: unknown): value is ApiProfile => isRecord(value) && typeof value.phone === 'string';
const isOk = (value: unknown): value is Record<string, unknown> => isRecord(value);

export function apiRegister(profile: ApiProfile, password: string): Promise<ApiSession> {
  return request('/v1/auth/register', { method: 'POST', body: JSON.stringify({ password, profile }) }, isSession, { auth: false });
}

export function apiLogin(identifier: string, password: string): Promise<ApiSession> {
  return request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }, isSession, { auth: false });
}

export function apiForgotPassword(identifier: string) {
  return request('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }, isOk, { auth: false });
}

export function apiResetPassword(identifier: string, code: string, newPassword: string) {
  return request('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ identifier, code, newPassword }) }, isOk, { auth: false });
}

export function apiGetMe(): Promise<ApiProfile> {
  return request('/v1/users/me', { method: 'GET' }, isProfile);
}

export function apiUpdateMe(patch: Partial<ApiProfile>): Promise<ApiProfile> {
  return request('/v1/users/me', { method: 'PUT', body: JSON.stringify(patch) }, isProfile);
}

export function apiChangePassword(currentPassword: string, newPassword: string) {
  return request('/v1/users/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }, isOk);
}
