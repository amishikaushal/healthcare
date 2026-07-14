-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'doctor', 'admin');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE condition_status AS ENUM ('active', 'resolved', 'chronic', 'monitoring');
CREATE TYPE plan_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE phase_status AS ENUM ('pending', 'active', 'completed', 'skipped');
CREATE TYPE log_status AS ENUM ('on_track', 'behind', 'ahead', 'paused');
CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_type AS ENUM ('in_person', 'telehealth', 'home_visit');
CREATE TYPE doc_type AS ENUM ('lab_report', 'imaging', 'prescription', 'discharge_summary', 'consent', 'other');
CREATE TYPE notification_type AS ENUM ('medication', 'appointment', 'exercise', 'alert', 'report', 'system');
CREATE TYPE alert_type AS ENUM ('pain_spike', 'missed_medication', 'vitals_abnormal', 'no_activity', 'custom');
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE frequency_unit AS ENUM ('daily', 'weekly', 'monthly', 'as_needed');

-- ============================================================
-- AUDIT MIXIN (applied via triggers)
-- ============================================================
-- All tables include: created_at, updated_at, deleted_at, created_by, updated_by

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        user_role NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  phone             VARCHAR(20),
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'patient',
  role_id           UUID REFERENCES roles(id),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  avatar_url        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token TEXT,
  reset_token       TEXT,
  reset_token_expiry TIMESTAMPTZ,
  refresh_token     TEXT,
  last_login_at     TIMESTAMPTZ,
  login_count       INTEGER NOT NULL DEFAULT 0,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. PATIENTS
-- ============================================================
CREATE TABLE patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  gender            gender_type,
  blood_type        VARCHAR(5),
  height_cm         DECIMAL(5,2),
  weight_kg         DECIMAL(5,2),
  allergies         TEXT[],
  emergency_contact JSONB DEFAULT '{}',
  insurance_info    JSONB DEFAULT '{}',
  address           JSONB DEFAULT '{}',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_patients_user_id ON patients(user_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. DOCTORS
-- ============================================================
CREATE TABLE doctors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number    VARCHAR(100) NOT NULL,
  specialty         VARCHAR(100),
  sub_specialty     VARCHAR(100),
  hospital_affiliation TEXT,
  clinic_address    JSONB DEFAULT '{}',
  consultation_fee  DECIMAL(10,2),
  bio               TEXT,
  years_experience  INTEGER,
  rating            DECIMAL(3,2) DEFAULT 0.00,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_doctors_user_id ON doctors(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doctors_specialty ON doctors(specialty) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. CAREGIVERS
-- ============================================================
CREATE TABLE caregivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship    VARCHAR(50),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  access_level    VARCHAR(20) NOT NULL DEFAULT 'read',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_caregivers_patient ON caregivers(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_caregivers_user ON caregivers(user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_caregivers_unique ON caregivers(user_id, patient_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. CONDITIONS
-- ============================================================
CREATE TABLE conditions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES doctors(id),
  name            VARCHAR(255) NOT NULL,
  icd_code        VARCHAR(20),
  description     TEXT,
  status          condition_status NOT NULL DEFAULT 'active',
  diagnosed_at    DATE,
  resolved_at     DATE,
  severity        severity NOT NULL DEFAULT 'medium',
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_conditions_patient ON conditions(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_conditions_status ON conditions(status) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. CARE PLANS
-- ============================================================
CREATE TABLE care_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES doctors(id),
  condition_id    UUID REFERENCES conditions(id),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  goals           JSONB DEFAULT '[]',
  status          plan_status NOT NULL DEFAULT 'draft',
  start_date      DATE NOT NULL,
  end_date        DATE,
  duration_weeks  INTEGER,
  ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  ai_context      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_care_plans_patient ON care_plans(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_care_plans_status ON care_plans(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_care_plans_doctor ON care_plans(doctor_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 8. CARE PHASES
-- ============================================================
CREATE TABLE care_phases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_plan_id    UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  phase_order     INTEGER NOT NULL DEFAULT 1,
  status          phase_status NOT NULL DEFAULT 'pending',
  start_date      DATE,
  end_date        DATE,
  duration_days   INTEGER,
  goals           JSONB DEFAULT '[]',
  milestones      JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_care_phases_plan ON care_phases(care_plan_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. RECOVERY LOGS
-- ============================================================
CREATE TABLE recovery_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  care_phase_id   UUID REFERENCES care_phases(id),
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_feeling INTEGER CHECK (overall_feeling BETWEEN 1 AND 10),
  pain_level      INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  energy_level    INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  sleep_hours     DECIMAL(4,2),
  sleep_quality   INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  mobility_score  INTEGER CHECK (mobility_score BETWEEN 1 AND 10),
  notes           TEXT,
  status          log_status NOT NULL DEFAULT 'on_track',
  vitals          JSONB DEFAULT '{}',
  ai_insights     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_recovery_logs_patient ON recovery_logs(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recovery_logs_date ON recovery_logs(log_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_recovery_logs_plan ON recovery_logs(care_plan_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 10. SYMPTOM LOGS
-- ============================================================
CREATE TABLE symptom_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recovery_log_id UUID REFERENCES recovery_logs(id),
  symptom_name    VARCHAR(255) NOT NULL,
  severity        INTEGER CHECK (severity BETWEEN 1 AND 10),
  location        VARCHAR(100),
  description     TEXT,
  duration_mins   INTEGER,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_symptom_logs_patient ON symptom_logs(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_symptom_logs_name ON symptom_logs USING gin(symptom_name gin_trgm_ops);

-- ============================================================
-- 11. MEDICATIONS
-- ============================================================
CREATE TABLE medications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  generic_name    VARCHAR(255),
  drug_class      VARCHAR(100),
  description     TEXT,
  side_effects    TEXT[],
  contraindications TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_medications_name ON medications USING gin(name gin_trgm_ops);

-- ============================================================
-- 12. MEDICATION SCHEDULES
-- ============================================================
CREATE TABLE medication_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  medication_id   UUID NOT NULL REFERENCES medications(id),
  doctor_id       UUID REFERENCES doctors(id),
  dosage          VARCHAR(100) NOT NULL,
  unit            VARCHAR(50),
  frequency       frequency_unit NOT NULL DEFAULT 'daily',
  times_per_day   INTEGER NOT NULL DEFAULT 1,
  scheduled_times TIME[],
  with_food       BOOLEAN DEFAULT FALSE,
  start_date      DATE NOT NULL,
  end_date        DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  refill_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_med_schedules_patient ON medication_schedules(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_med_schedules_active ON medication_schedules(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- 13. MEDICATION LOGS
-- ============================================================
CREATE TABLE medication_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_schedule_id UUID NOT NULL REFERENCES medication_schedules(id),
  scheduled_time        TIMESTAMPTZ NOT NULL,
  taken_at              TIMESTAMPTZ,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  skipped_reason        TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id)
);

CREATE INDEX idx_med_logs_patient ON medication_logs(patient_id);
CREATE INDEX idx_med_logs_scheduled ON medication_logs(scheduled_time);
CREATE INDEX idx_med_logs_status ON medication_logs(status);

-- ============================================================
-- 14. EXERCISES
-- ============================================================
CREATE TABLE exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  muscle_groups   TEXT[],
  difficulty      VARCHAR(20) DEFAULT 'beginner',
  duration_mins   INTEGER,
  sets            INTEGER,
  reps            INTEGER,
  instructions    JSONB DEFAULT '[]',
  video_url       TEXT,
  thumbnail_url   TEXT,
  contraindications TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_exercises_category ON exercises(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercises_name ON exercises USING gin(name gin_trgm_ops);

-- ============================================================
-- 15. EXERCISE LOGS
-- ============================================================
CREATE TABLE exercise_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  exercise_id     UUID NOT NULL REFERENCES exercises(id),
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  sets_completed  INTEGER,
  reps_completed  INTEGER,
  duration_mins   INTEGER,
  pain_during     INTEGER CHECK (pain_during BETWEEN 0 AND 10),
  difficulty_felt INTEGER CHECK (difficulty_felt BETWEEN 1 AND 5),
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_exercise_logs_patient ON exercise_logs(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercise_logs_date ON exercise_logs(log_date) WHERE deleted_at IS NULL;

-- ============================================================
-- 16. APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctors(id),
  care_plan_id    UUID REFERENCES care_plans(id),
  title           VARCHAR(255),
  description     TEXT,
  appointment_type appointment_type NOT NULL DEFAULT 'in_person',
  status          appointment_status NOT NULL DEFAULT 'scheduled',
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INTEGER NOT NULL DEFAULT 30,
  location        TEXT,
  meeting_url     TEXT,
  pre_notes       TEXT,
  post_notes      TEXT,
  cancellation_reason TEXT,
  reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_status ON appointments(status) WHERE deleted_at IS NULL;

-- ============================================================
-- 17. MEDICAL DOCUMENTS
-- ============================================================
CREATE TABLE medical_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES doctors(id),
  care_plan_id    UUID REFERENCES care_plans(id),
  title           VARCHAR(255) NOT NULL,
  doc_type        doc_type NOT NULL DEFAULT 'other',
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       VARCHAR(100),
  is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  summary         TEXT,
  tags            TEXT[],
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_documents_patient ON medical_documents(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON medical_documents(doc_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON medical_documents USING gin(tags);

-- ============================================================
-- 18. DOCUMENT CHUNKS (RAG / Vector Store)
-- ============================================================
CREATE TABLE document_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  token_count     INTEGER,
  qdrant_point_id TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_doc_chunks_patient ON document_chunks(patient_id);
CREATE INDEX idx_doc_chunks_qdrant ON document_chunks(qdrant_point_id);

-- ============================================================
-- 19. NOTIFICATION PREFERENCES & NOTIFICATIONS
-- ============================================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_reminders BOOLEAN DEFAULT TRUE,
  appointment_reminders BOOLEAN DEFAULT TRUE,
  doctor_messages BOOLEAN DEFAULT TRUE,
  care_plan_updates BOOLEAN DEFAULT TRUE,
  risk_alerts BOOLEAN DEFAULT TRUE,
  ai_weekly_reports BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'unread',
  related_entity_id UUID,
  action_url VARCHAR(255),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- 19.5 PATIENT DOCUMENTS
-- ============================================================
CREATE TABLE patient_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  doc_type      VARCHAR(50)  NOT NULL DEFAULT 'other',
  file_name     VARCHAR(255) NOT NULL,
  file_size     INTEGER      NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_data     BYTEA        NOT NULL,
  ocr_text      TEXT,
  ai_summary    TEXT,
  is_processed  BOOLEAN      NOT NULL DEFAULT false,
  tags          TEXT[]       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_doc_type   ON patient_documents(doc_type);

-- ============================================================
-- 20. RISK ALERTS
-- ============================================================
CREATE TABLE risk_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  alert_type      alert_type NOT NULL,
  severity        severity NOT NULL DEFAULT 'medium',
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  trigger_data    JSONB DEFAULT '{}',
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id),
  resolution_note TEXT,
  notified_doctor BOOLEAN NOT NULL DEFAULT FALSE,
  ai_generated    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_risk_alerts_patient ON risk_alerts(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_alerts_unresolved ON risk_alerts(patient_id, is_resolved) WHERE deleted_at IS NULL AND is_resolved = FALSE;
CREATE INDEX idx_risk_alerts_severity ON risk_alerts(severity) WHERE deleted_at IS NULL;

-- ============================================================
-- 21. RECOVERY SCORES
-- ============================================================
CREATE TABLE recovery_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  score_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score   DECIMAL(5,2) NOT NULL,
  pain_score      DECIMAL(5,2),
  mobility_score  DECIMAL(5,2),
  medication_score DECIMAL(5,2),
  exercise_score  DECIMAL(5,2),
  mood_score      DECIMAL(5,2),
  sleep_score     DECIMAL(5,2),
  trend           VARCHAR(20),
  ai_analysis     TEXT,
  breakdown       JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_recovery_scores_date ON recovery_scores(patient_id, score_date, care_plan_id);
CREATE INDEX idx_recovery_scores_patient ON recovery_scores(patient_id);


CREATE TABLE weekly_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id        UUID REFERENCES care_plans(id),
  doctor_id           UUID REFERENCES doctors(id),
  week_start          DATE NOT NULL,
  week_end            DATE NOT NULL,
  avg_pain_score      DECIMAL(4,2),
  avg_mood_score      DECIMAL(4,2),
  avg_energy_score    DECIMAL(4,2),
  medication_adherence DECIMAL(5,2),
  exercise_adherence  DECIMAL(5,2),
  overall_progress    DECIMAL(5,2),
  highlights          JSONB DEFAULT '[]',
  concerns            JSONB DEFAULT '[]',
  ai_summary          TEXT,
  ai_recommendations  JSONB DEFAULT '[]',
  doctor_notes        TEXT,
  is_reviewed         BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_weekly_reports_week ON weekly_reports(patient_id, week_start) WHERE deleted_at IS NULL;
CREATE INDEX idx_weekly_reports_patient ON weekly_reports(patient_id) WHERE deleted_at IS NULL;


CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  title           VARCHAR(255),
  context         JSONB DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  message_count   INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessions_patient ON chat_sessions(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_sessions_active ON chat_sessions(patient_id, is_active) WHERE deleted_at IS NULL;


CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  role            chat_role NOT NULL,
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  rag_sources     JSONB DEFAULT '[]',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_patient ON chat_messages(patient_id) WHERE deleted_at IS NULL;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','patients','doctors','caregivers','conditions',
    'care_plans','care_phases','recovery_logs','symptom_logs',
    'medication_schedules','exercises','appointments',
    'medical_documents','risk_alerts','weekly_reports','chat_sessions'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- SEED ROLES
-- ============================================================
INSERT INTO roles (name, description, permissions) VALUES
  ('admin',     'Platform administrator',  '{"all": true}'),
  ('doctor',    'Medical professional',     '{"patients": ["read","write"], "care_plans": ["read","write","approve"], "reports": ["read"]}'),
  ('caregiver', 'Patient caregiver',        '{"patients": ["read"], "recovery_logs": ["read","write"], "medications": ["read"]}'),
  ('patient',   'Platform patient',         '{"own_data": ["read","write"], "appointments": ["read","write"]}')
ON CONFLICT (name) DO NOTHING;
