-- ShuShastho PostgreSQL schema
-- Requires PostgreSQL 15+.
-- Run once per database. Application migrations should add changes after this file.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
  'patient',
  'doctor',
  'receptionist',
  'pharmacist',
  'hospital_admin',
  'super_admin'
);

CREATE TYPE appointment_status AS ENUM (
  'booked',
  'checked_in',
  'serving',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE payment_method AS ENUM ('cash_at_chamber');

CREATE TYPE consultation_status AS ENUM ('in_progress', 'completed');

CREATE TYPE prescription_status AS ENUM ('draft', 'issued', 'cancelled');

CREATE TYPE reservation_status AS ENUM (
  'requested',
  'accepted',
  'partial',
  'rejected',
  'ready',
  'collected',
  'cancelled'
);

CREATE TYPE ai_risk_level AS ENUM ('low', 'moderate', 'high', 'emergency');

CREATE TYPE report_result_status AS ENUM ('low', 'normal', 'positive');

CREATE TYPE journey_event_type AS ENUM (
  'ai_check',
  'appointment',
  'prescription',
  'medicine_reservation',
  'lab_report',
  'check_in',
  'follow_up'
);

CREATE TABLE app_users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject       text NOT NULL UNIQUE,
  phone              text NOT NULL UNIQUE,
  display_name       text NOT NULL,
  preferred_language  text NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('bn', 'en')),
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id     uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE patient_profiles (
  user_id             uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  date_of_birth       date,
  gender              text CHECK (gender IN ('female', 'male', 'other')),
  blood_group         text,
  emergency_contact   text,
  allergies           text,
  chronic_conditions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  consented_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hospitals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        jsonb NOT NULL,
  address     jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone       text,
  approved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(name) = 'object')
);

CREATE TABLE hospital_memberships (
  hospital_id  uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role         user_role NOT NULL CHECK (role <> 'patient'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, user_id, role)
);

CREATE TABLE specialties (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  jsonb NOT NULL,
  CHECK (jsonb_typeof(name) = 'object')
);

CREATE TABLE doctor_profiles (
  user_id       uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  specialty_id  uuid NOT NULL REFERENCES specialties(id),
  degrees       jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating        numeric(2, 1) CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chambers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id    uuid NOT NULL REFERENCES doctor_profiles(user_id),
  name         jsonb NOT NULL DEFAULT '{}'::jsonb,
  consultation_fee numeric(12, 2) NOT NULL CHECK (consultation_fee >= 0),
  is_active    boolean NOT NULL DEFAULT true,
  UNIQUE (hospital_id, doctor_id, id),
  CHECK (jsonb_typeof(name) = 'object')
);

CREATE TABLE queue_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber_id     uuid NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
  queue_date     date NOT NULL,
  current_serial integer NOT NULL DEFAULT 0 CHECK (current_serial >= 0),
  next_serial    integer NOT NULL DEFAULT 1 CHECK (next_serial > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chamber_id, queue_date)
);

CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES patient_profiles(user_id),
  chamber_id       uuid NOT NULL REFERENCES chambers(id),
  queue_session_id uuid NOT NULL REFERENCES queue_sessions(id),
  appointment_date date NOT NULL,
  serial_number    integer NOT NULL CHECK (serial_number > 0),
  status           appointment_status NOT NULL DEFAULT 'booked',
  payment_method   payment_method NOT NULL DEFAULT 'cash_at_chamber',
  idempotency_key  text NOT NULL UNIQUE,
  estimated_time   timestamptz,
  checked_in_at    timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (queue_session_id, serial_number)
);

CREATE INDEX appointments_patient_date_idx
  ON appointments (patient_id, appointment_date DESC);
CREATE INDEX appointments_chamber_date_status_idx
  ON appointments (chamber_id, appointment_date, status);

CREATE TABLE queue_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  serial_number  integer NOT NULL CHECK (serial_number > 0),
  event_type     text NOT NULL CHECK (event_type IN ('called', 'checked_in', 'completed', 'no_show')),
  actor_user_id  uuid REFERENCES app_users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_conversations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NOT NULL REFERENCES patient_profiles(user_id),
  language              text NOT NULL CHECK (language IN ('bn', 'en')),
  consent_granted       boolean NOT NULL,
  consent_policy_version text NOT NULL,
  consented_at          timestamptz NOT NULL,
  risk_level            ai_risk_level,
  requires_urgent_care  boolean NOT NULL DEFAULT false,
  suggested_specialty   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (consent_granted)
);

CREATE TABLE ai_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender           text NOT NULL CHECK (sender IN ('patient', 'assistant')),
  message_text     text NOT NULL,
  risk_level       ai_risk_level,
  requires_urgent_care boolean,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  source_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_message_sources (
  message_id  uuid NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  source_id   uuid NOT NULL REFERENCES ai_sources(id),
  PRIMARY KEY (message_id, source_id)
);

CREATE TABLE consultations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id),
  doctor_id      uuid NOT NULL REFERENCES doctor_profiles(user_id),
  status         consultation_status NOT NULL DEFAULT 'in_progress',
  notes          text,
  ai_summary     jsonb,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE TABLE medicines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        jsonb NOT NULL,
  form        text,
  strength    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, strength),
  CHECK (jsonb_typeof(name) = 'object')
);

CREATE TABLE prescriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id),
  patient_id      uuid NOT NULL REFERENCES patient_profiles(user_id),
  doctor_id       uuid NOT NULL REFERENCES doctor_profiles(user_id),
  diagnosis      jsonb,
  status          prescription_status NOT NULL DEFAULT 'draft',
  follow_up_date  date,
  issued_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE prescription_items (
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id     uuid NOT NULL REFERENCES medicines(id),
  instructions    jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_days   integer CHECK (duration_days IS NULL OR duration_days > 0),
  PRIMARY KEY (prescription_id, medicine_id)
);

CREATE TABLE prescription_tests (
  prescription_id  uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  test_name        text NOT NULL,
  PRIMARY KEY (prescription_id, test_name)
);

CREATE TABLE pharmacies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  uuid REFERENCES hospitals(id),
  name         jsonb NOT NULL,
  address      jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone        text,
  is_active    boolean NOT NULL DEFAULT true,
  CHECK (jsonb_typeof(name) = 'object')
);

CREATE TABLE pharmacy_inventory (
  pharmacy_id  uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id  uuid NOT NULL REFERENCES medicines(id),
  quantity     integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price   numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pharmacy_id, medicine_id)
);

CREATE TABLE pharmacy_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id),
  patient_id      uuid NOT NULL REFERENCES patient_profiles(user_id),
  pharmacy_id     uuid NOT NULL REFERENCES pharmacies(id),
  status          reservation_status NOT NULL DEFAULT 'requested',
  requested_at    timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  collected_at    timestamptz
);

CREATE TABLE pharmacy_reservation_items (
  reservation_id  uuid NOT NULL REFERENCES pharmacy_reservations(id) ON DELETE CASCADE,
  medicine_id     uuid NOT NULL REFERENCES medicines(id),
  requested_qty   integer NOT NULL CHECK (requested_qty > 0),
  supplied_qty    integer NOT NULL DEFAULT 0 CHECK (supplied_qty >= 0),
  unit_price      numeric(12, 2) CHECK (unit_price IS NULL OR unit_price >= 0),
  PRIMARY KEY (reservation_id, medicine_id),
  CHECK (supplied_qty <= requested_qty)
);

CREATE TABLE lab_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patient_profiles(user_id),
  appointment_id  uuid REFERENCES appointments(id),
  lab_name        text NOT NULL,
  collected_at    timestamptz,
  reported_at     timestamptz,
  summary        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lab_results (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id      uuid NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
  test_name      text NOT NULL,
  result_value   numeric,
  result_text    jsonb,
  reference_range jsonb,
  status         report_result_status NOT NULL,
  unit           text,
  UNIQUE (report_id, test_name)
);

CREATE TABLE recovery_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patient_profiles(user_id),
  prescription_id uuid REFERENCES prescriptions(id),
  checkin_day     integer NOT NULL CHECK (checkin_day > 0),
  mood            text NOT NULL CHECK (mood IN ('better', 'same', 'worse')),
  temperature_f   numeric(4, 1) CHECK (temperature_f BETWEEN 80 AND 120),
  took_medicines  boolean NOT NULL,
  red_flag        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recovery_checkin_symptoms (
  checkin_id   uuid NOT NULL REFERENCES recovery_checkins(id) ON DELETE CASCADE,
  symptom_code text NOT NULL,
  PRIMARY KEY (checkin_id, symptom_code)
);

CREATE TABLE journey_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patient_profiles(user_id),
  event_type      journey_event_type NOT NULL,
  appointment_id  uuid REFERENCES appointments(id),
  prescription_id uuid REFERENCES prescriptions(id),
  report_id       uuid REFERENCES lab_reports(id),
  checkin_id      uuid REFERENCES recovery_checkins(id),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid REFERENCES app_users(id),
  action         text NOT NULL,
  resource_type  text NOT NULL,
  resource_id    uuid,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_messages_conversation_created_idx
  ON ai_messages (conversation_id, created_at);
CREATE INDEX journey_events_patient_occurred_idx
  ON journey_events (patient_id, occurred_at DESC);
CREATE INDEX audit_log_resource_idx
  ON audit_log (resource_type, resource_id, created_at DESC);

-- Call this inside the same transaction that inserts an appointment.
-- UPDATE locks the queue row, so concurrent bookings receive distinct serials.
CREATE OR REPLACE FUNCTION allocate_queue_serial(p_queue_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  allocated_serial integer;
BEGIN
  UPDATE queue_sessions
  SET next_serial = next_serial + 1
  WHERE id = p_queue_session_id
  RETURNING next_serial - 1 INTO allocated_serial;

  IF allocated_serial IS NULL THEN
    RAISE EXCEPTION 'Queue session % does not exist', p_queue_session_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN allocated_serial;
END;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_users_set_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER patient_profiles_set_updated_at
  BEFORE UPDATE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hospitals_set_updated_at
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doctor_profiles_set_updated_at
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER queue_sessions_set_updated_at
  BEFORE UPDATE ON queue_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ai_conversations_set_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER pharmacy_inventory_set_updated_at
  BEFORE UPDATE ON pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
