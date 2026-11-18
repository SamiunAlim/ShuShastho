import { Language } from '../constants/i18n';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
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
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('Backend is not configured. Set EXPO_PUBLIC_API_URL.');
  }
  if (!accessTokenProvider) {
    throw new ApiError('Authentication is not configured. Sign in before using the health service.');
  }

  let accessToken: string | null | undefined;
  try {
    accessToken = await accessTokenProvider?.();
  } catch {
    throw new ApiError('Could not authorize this request. Please sign in again.');
  }
  if (!accessToken) {
    throw new ApiError('Sign in before using the health service.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Could not reach the health service.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
      ? body.error.message
      : `Health service request failed (${response.status}).`;
    throw new ApiError(message, response.status);
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
