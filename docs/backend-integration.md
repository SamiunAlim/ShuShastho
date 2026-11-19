# Backend and AI integration

The mobile app keeps clinical data and AI credentials on the server. Configure
`EXPO_PUBLIC_API_URL` to point to a trusted HTTPS API; never put model-provider
keys or privileged credentials in an Expo public environment variable.

The initial PostgreSQL data model is documented in
[`docs/postgres-schema.sql`](./postgres-schema.sql). It covers users and
role-scoped hospital access, doctor chambers, transactional appointments and
queues, symptom-triage consent and sources, consultations and prescriptions,
pharmacy reservations, lab reports, recovery check-ins, journey events, and
audit logging. Production endpoints should enforce row ownership and hospital
membership in the API layer (and may add PostgreSQL row-level security once
the authentication claims-to-database role mapping is finalized).

The API client in `src/services/api.ts` is the integration boundary. Register an
authenticated session-token provider with `setAccessTokenProvider` when the
identity service is chosen.
Until a URL is configured, appointment and AI requests fail visibly; sample
screens are preview data, not live patient or provider records.

## Symptom-triage agent

`POST /v1/ai/agents/symptom-triage/messages`

Request JSON:

```json
{
  "conversationId": "triage-session-id",
  "message": "I have had a fever since yesterday",
  "language": "en",
  "consent": { "granted": true, "policyVersion": "ai-guidance-v1" }
}
```

Return JSON:

```json
{
  "conversationId": "triage-session-id",
  "reply": "A clinician can help assess your symptoms...",
  "riskLevel": "moderate",
  "requiresUrgentCare": false,
  "suggestedSpecialty": "General medicine",
  "sources": [{ "title": "Reviewed source" }]
}
```

The backend agent owns model access, structured intake, safety policy, source
attribution, escalation, audit trails, and any tool execution. Validate its
output server-side; the client treats replies as guidance and displays an
urgent-care notice for high/emergency risk. Do not send sensitive records until
server-side authentication, consent recording, tenant authorization, and
retention are implemented. Persist the submitted consent version and server
receipt time with the session.

## Booking

`POST /v1/appointments` accepts a provider-issued doctor and chamber ID, date,
and `cash_at_chamber` payment method. The client supplies an
`Idempotency-Key`. The server must validate availability, enforce authorization,
lock the serial transactionally, and return:

```json
{
  "appointmentId": "appointment-id",
  "serialNumber": "05",
  "estimatedTime": "10:30 AM"
}
```

Use the shared `{ "error": { "code": "...", "message": "..." } }` error
envelope for non-2xx responses. Protect all health, booking, and role-scoped
resources with server-side authorization and audit logging.

## Accounts (log in, sign up, profile)

The app signs in with **phone number or email + password**. Users are stored in the MongoDB `users` collection
(`_id` = canonical phone, e.g. `01711000001`) with their `role` and a **scrypt-hashed password** — never plain text.
Login returns an opaque session token (collection `sessions`); send it as `Authorization: Bearer <token>`.
Code: `backend/app/accounts.py`.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/v1/auth/register` | `{ password, profile }` (`profile.role` = patient / doctor / receptionist / pharmacist / hospitalAdmin) | `201 { token, profile }`; `409` `phone_taken` / `email_taken` |
| POST | `/v1/auth/login` | `{ identifier, password }` | `{ token, profile }`; `401` `invalid_credentials` |
| POST | `/v1/auth/forgot-password` | `{ identifier }` | `{ sent: true }`; `404` `not_found` |
| POST | `/v1/auth/reset-password` | `{ identifier, code, newPassword }` | `{ ok: true }`; `400` `invalid_code` |
| GET | `/v1/users/me` | – | the profile |
| PUT | `/v1/users/me` | partial profile (role and phone cannot change) | the updated profile |
| POST | `/v1/users/me/change-password` | `{ currentPassword, newPassword }` | `{ ok: true }`; `400` `wrong_password` |

Errors use `{ "error": { "message", "code" } }`. OTP is mocked: the code is always `123456` (the app sends it to
`reset-password`; a real deployment would send an SMS). Passwords need at least 6 characters.

**Demo accounts** (seeded on server start if missing, password `demo123`): patient `01711000001`, doctor `01711000002`,
receptionist `01711000003`, pharmacist `01711000004`, hospital admin `01711000005`, super admin `01711000006`.

**Frontend:** `src/services/data.ts` calls these endpoints first when `EXPO_PUBLIC_API_URL` is set. A definite answer
(wrong password, phone already used) is final; if the server cannot be reached the same call falls back to the accounts
saved on the device, so the demo keeps working offline. The session token is kept in AsyncStorage (stay logged in until
Log out).
