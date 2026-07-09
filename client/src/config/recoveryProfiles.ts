// ── Recovery Category enum ────────────────────────────────────────────────────
// Must stay in sync with server/src/config/recoveryProfiles.ts

export enum RecoveryCategory {
  INFECTIOUS      = 'INFECTIOUS',
  MUSCULOSKELETAL = 'MUSCULOSKELETAL',
  GI              = 'GI',
  RESPIRATORY     = 'RESPIRATORY',
  CARDIAC         = 'CARDIAC',
  POST_SURGICAL   = 'POST_SURGICAL',
  MENTAL_HEALTH   = 'MENTAL_HEALTH',
  GENERAL         = 'GENERAL',
}

// ── Field types ───────────────────────────────────────────────────────────────

export type RecoveryFieldType =
  | 'slider'
  | 'number'
  | 'checkbox'
  | 'text'
  | 'select'
  | 'multiselect'

export interface RecoveryField {
  key: string
  label: string
  type: RecoveryFieldType
  min?: number
  max?: number
  step?: number
  unit?: string
  defaultValue?: number | string | boolean
  description?: string
  // UI-only: available options for select/multiselect
  options?: Array<{ value: string; label: string }>
}

export interface SymptomDef {
  id: string
  label: string
}

export interface RecoveryProfile {
  category: RecoveryCategory
  displayName: string
  emoji: string
  description: string
  fields: RecoveryField[]
  symptoms: SymptomDef[]
  trendFields: string[]
}

// ── Select options ────────────────────────────────────────────────────────────

const WOUND_OPTIONS = [
  { value: 'healing',   label: '✅ Healing normally' },
  { value: 'red',       label: '🔴 Red / inflamed' },
  { value: 'discharge', label: '💧 Discharging' },
  { value: 'open',      label: '⚠️ Open / not closed' },
]

// ── Profiles ──────────────────────────────────────────────────────────────────

export const RECOVERY_PROFILES: Record<RecoveryCategory, RecoveryProfile> = {

  [RecoveryCategory.INFECTIOUS]: {
    category:    RecoveryCategory.INFECTIOUS,
    displayName: 'Infectious Illness',
    emoji:       '🌡️',
    description: 'Track fever, fluid intake, and infection recovery.',
    trendFields: ['temperature', 'fluidIntake'],
    fields: [
      { key: 'temperature', label: 'Body Temperature', type: 'number', min: 34,  max: 42,  step: 0.1, unit: '°C', defaultValue: 37.0,
        description: 'Normal range: 36.1 – 37.2 °C' },
      { key: 'fluidIntake', label: 'Fluid Intake',     type: 'number', min: 0,   max: 6,   step: 0.1, unit: 'L',  defaultValue: 2.0,
        description: 'Target: 2–3 L/day during illness' },
      { key: 'fatigue',     label: 'Fatigue Level',    type: 'slider', min: 1,   max: 10,  defaultValue: 5,
        description: '1 = no fatigue, 10 = completely exhausted' },
    ],
    symptoms: [
      { id: 'HEADACHE',         label: 'Headache' },
      { id: 'CHILLS',           label: 'Chills' },
      { id: 'SWEATING',         label: 'Sweating' },
      { id: 'FATIGUE',          label: 'Fatigue' },
      { id: 'RASH',             label: 'Rash' },
      { id: 'BODY_ACHE',        label: 'Body ache' },
      { id: 'LOSS_OF_APPETITE', label: 'Loss of appetite' },
      { id: 'NAUSEA',           label: 'Nausea' },
    ],
  },

  [RecoveryCategory.MUSCULOSKELETAL]: {
    category:    RecoveryCategory.MUSCULOSKELETAL,
    displayName: 'Musculoskeletal Recovery',
    emoji:       '🦴',
    description: 'Track pain, mobility, and physical recovery progress.',
    trendFields: ['pain', 'mobility'],
    fields: [
      { key: 'pain',     label: 'Pain Level', type: 'slider', min: 0, max: 10, defaultValue: 5,
        description: '0 = no pain, 10 = worst imaginable' },
      { key: 'mobility', label: 'Mobility',   type: 'slider', min: 1, max: 10, defaultValue: 5,
        description: '1 = cannot move, 10 = full range of motion' },
      { key: 'swelling', label: 'Swelling present?', type: 'checkbox', defaultValue: false },
    ],
    symptoms: [
      { id: 'SWELLING',  label: 'Swelling' },
      { id: 'BRUISING',  label: 'Bruising' },
      { id: 'STIFFNESS', label: 'Stiffness' },
      { id: 'NUMBNESS',  label: 'Numbness' },
      { id: 'TINGLING',  label: 'Tingling' },
    ],
  },

  [RecoveryCategory.GI]: {
    category:    RecoveryCategory.GI,
    displayName: 'Gastrointestinal Recovery',
    emoji:       '🫁',
    description: 'Track digestive symptoms, hydration, and GI recovery.',
    trendFields: ['stoolFrequency', 'fluidIntake', 'nauseaSeverity'],
    fields: [
      { key: 'stoolFrequency',  label: 'Bowel Episodes',  type: 'number', min: 0, max: 20, step: 1, unit: '/day', defaultValue: 0 },
      { key: 'fluidIntake',     label: 'Fluid Intake',    type: 'number', min: 0, max: 6,  step: 0.1, unit: 'L',  defaultValue: 2.0,
        description: 'Critical for GI illness — aim for 2–3 L/day' },
      { key: 'nauseaSeverity',  label: 'Nausea Severity', type: 'slider', min: 0, max: 10, defaultValue: 0,
        description: '0 = none, 10 = cannot eat or drink' },
    ],
    symptoms: [
      { id: 'NAUSEA',           label: 'Nausea' },
      { id: 'CRAMPS',           label: 'Cramps' },
      { id: 'BLOATING',         label: 'Bloating' },
      { id: 'VOMITING',         label: 'Vomiting' },
      { id: 'DIARRHEA',         label: 'Diarrhea' },
      { id: 'LOSS_OF_APPETITE', label: 'Loss of appetite' },
    ],
  },

  [RecoveryCategory.RESPIRATORY]: {
    category:    RecoveryCategory.RESPIRATORY,
    displayName: 'Respiratory Recovery',
    emoji:       '🫁',
    description: 'Track oxygen levels, breathing, and respiratory function.',
    trendFields: ['spo2', 'coughSeverity', 'breathingDifficulty'],
    fields: [
      { key: 'spo2',                label: 'Oxygen Saturation',    type: 'number', min: 70, max: 100, step: 1, unit: '%', defaultValue: 98,
        description: 'Normal: ≥ 95%. Below 90% requires urgent care.' },
      { key: 'coughSeverity',       label: 'Cough Severity',       type: 'slider', min: 0, max: 10, defaultValue: 0,
        description: '0 = no cough, 10 = severe persistent cough' },
      { key: 'breathingDifficulty', label: 'Breathing Difficulty', type: 'slider', min: 0, max: 10, defaultValue: 0,
        description: '0 = breathing normally, 10 = cannot breathe' },
    ],
    symptoms: [
      { id: 'SHORTNESS_OF_BREATH', label: 'Shortness of breath' },
      { id: 'WHEEZING',            label: 'Wheezing' },
      { id: 'CHEST_PAIN',          label: 'Chest pain' },
      { id: 'COUGH',               label: 'Cough' },
      { id: 'FATIGUE',             label: 'Fatigue' },
    ],
  },

  [RecoveryCategory.CARDIAC]: {
    category:    RecoveryCategory.CARDIAC,
    displayName: 'Cardiac Recovery',
    emoji:       '❤️',
    description: 'Track heart rate, blood pressure, and cardiac symptoms.',
    trendFields: ['heartRate', 'systolicBP', 'diastolicBP'],
    fields: [
      { key: 'heartRate',   label: 'Heart Rate',   type: 'number', min: 30, max: 220, step: 1, unit: 'BPM',  defaultValue: 70,
        description: 'Resting: 60–100 BPM' },
      { key: 'systolicBP',  label: 'Systolic BP',  type: 'number', min: 60, max: 220, step: 1, unit: 'mmHg', defaultValue: 120,
        description: 'Upper number in blood pressure reading' },
      { key: 'diastolicBP', label: 'Diastolic BP', type: 'number', min: 40, max: 130, step: 1, unit: 'mmHg', defaultValue: 80,
        description: 'Lower number in blood pressure reading' },
    ],
    symptoms: [
      { id: 'CHEST_PAIN',          label: 'Chest pain' },
      { id: 'PALPITATIONS',        label: 'Palpitations' },
      { id: 'DIZZINESS',           label: 'Dizziness' },
      { id: 'SHORTNESS_OF_BREATH', label: 'Shortness of breath' },
      { id: 'FATIGUE',             label: 'Fatigue' },
    ],
  },

  [RecoveryCategory.POST_SURGICAL]: {
    category:    RecoveryCategory.POST_SURGICAL,
    displayName: 'Post-Surgical Recovery',
    emoji:       '🏥',
    description: 'Track pain, wound healing, and surgical recovery.',
    trendFields: ['pain', 'mobility'],
    fields: [
      { key: 'pain',           label: 'Pain Level',      type: 'slider', min: 0, max: 10, defaultValue: 5,
        description: '0 = no pain, 10 = worst imaginable' },
      { key: 'mobility',       label: 'Mobility',        type: 'slider', min: 1, max: 10, defaultValue: 5,
        description: '1 = bed-ridden, 10 = moving freely' },
      { key: 'woundCondition', label: 'Wound Condition', type: 'select', defaultValue: 'healing', options: WOUND_OPTIONS },
    ],
    symptoms: [
      { id: 'REDNESS',    label: 'Redness' },
      { id: 'DISCHARGE',  label: 'Discharge' },
      { id: 'FEVER',      label: 'Fever' },
      { id: 'NUMBNESS',   label: 'Numbness' },
      { id: 'SWELLING',   label: 'Swelling' },
    ],
  },

  [RecoveryCategory.MENTAL_HEALTH]: {
    category:    RecoveryCategory.MENTAL_HEALTH,
    displayName: 'Mental Health Recovery',
    emoji:       '🧠',
    description: 'Track mood, anxiety, and mental wellbeing.',
    trendFields: ['mood', 'anxiety'],
    fields: [
      { key: 'mood',         label: 'Mood',          type: 'slider', min: 1, max: 10, defaultValue: 5,
        description: '1 = very low, 10 = excellent' },
      { key: 'anxiety',      label: 'Anxiety Level', type: 'slider', min: 0, max: 10, defaultValue: 3,
        description: '0 = calm, 10 = severe anxiety' },
      { key: 'sleepQuality', label: 'Sleep Quality', type: 'slider', min: 1, max: 5,  defaultValue: 3,
        description: '1 = very poor, 5 = excellent' },
    ],
    symptoms: [
      { id: 'INSOMNIA',     label: 'Insomnia' },
      { id: 'IRRITABILITY', label: 'Irritability' },
      { id: 'HOPELESSNESS', label: 'Hopelessness' },
      { id: 'ANXIETY',      label: 'Anxiety' },
      { id: 'FATIGUE',      label: 'Fatigue' },
    ],
  },

  [RecoveryCategory.GENERAL]: {
    category:    RecoveryCategory.GENERAL,
    displayName: 'General Recovery',
    emoji:       '🩺',
    description: 'General health and recovery tracking.',
    trendFields: ['pain', 'energy'],
    fields: [
      { key: 'pain',     label: 'Discomfort / Pain', type: 'slider', min: 0, max: 10, defaultValue: 3,
        description: '0 = none, 10 = severe' },
      { key: 'energy',   label: 'Energy Level',      type: 'slider', min: 1, max: 10, defaultValue: 6 },
      { key: 'appetite', label: 'Appetite',           type: 'slider', min: 1, max: 10, defaultValue: 6,
        description: '1 = no appetite, 10 = eating normally' },
    ],
    symptoms: [
      { id: 'FATIGUE',          label: 'Fatigue' },
      { id: 'HEADACHE',         label: 'Headache' },
      { id: 'NAUSEA',           label: 'Nausea' },
      { id: 'FEVER',            label: 'Fever' },
      { id: 'BODY_ACHE',        label: 'Body ache' },
      { id: 'LOSS_OF_APPETITE', label: 'Loss of appetite' },
    ],
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getDefaultVitals(profile: RecoveryProfile): Record<string, any> {
  const vitals: Record<string, any> = {}
  for (const field of profile.fields) {
    if (field.defaultValue !== undefined) {
      vitals[field.key] = field.defaultValue
    }
  }
  return vitals
}
