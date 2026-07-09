// ── Recovery Category enum ────────────────────────────────────────────────────

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

// ── Field schema ──────────────────────────────────────────────────────────────

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
  // keys from `fields` that should be included in AI trend analysis
  trendFields: string[]
}

// ── Symptom master list ───────────────────────────────────────────────────────

export const ALL_SYMPTOMS: Record<string, SymptomDef> = {
  HEADACHE:             { id: 'HEADACHE',             label: 'Headache' },
  CHILLS:               { id: 'CHILLS',               label: 'Chills' },
  SWEATING:             { id: 'SWEATING',             label: 'Sweating' },
  FATIGUE:              { id: 'FATIGUE',               label: 'Fatigue' },
  RASH:                 { id: 'RASH',                 label: 'Rash' },
  SWELLING:             { id: 'SWELLING',             label: 'Swelling' },
  BRUISING:             { id: 'BRUISING',             label: 'Bruising' },
  STIFFNESS:            { id: 'STIFFNESS',             label: 'Stiffness' },
  NUMBNESS:             { id: 'NUMBNESS',             label: 'Numbness' },
  TINGLING:             { id: 'TINGLING',             label: 'Tingling' },
  NAUSEA:               { id: 'NAUSEA',               label: 'Nausea' },
  CRAMPS:               { id: 'CRAMPS',               label: 'Cramps' },
  BLOATING:             { id: 'BLOATING',             label: 'Bloating' },
  VOMITING:             { id: 'VOMITING',             label: 'Vomiting' },
  DIARRHEA:             { id: 'DIARRHEA',             label: 'Diarrhea' },
  SHORTNESS_OF_BREATH:  { id: 'SHORTNESS_OF_BREATH',  label: 'Shortness of breath' },
  WHEEZING:             { id: 'WHEEZING',             label: 'Wheezing' },
  CHEST_PAIN:           { id: 'CHEST_PAIN',           label: 'Chest pain' },
  COUGH:                { id: 'COUGH',                label: 'Cough' },
  PALPITATIONS:         { id: 'PALPITATIONS',         label: 'Palpitations' },
  DIZZINESS:            { id: 'DIZZINESS',             label: 'Dizziness' },
  REDNESS:              { id: 'REDNESS',               label: 'Redness' },
  DISCHARGE:            { id: 'DISCHARGE',             label: 'Discharge' },
  FEVER:                { id: 'FEVER',                label: 'Fever' },
  INSOMNIA:             { id: 'INSOMNIA',             label: 'Insomnia' },
  IRRITABILITY:         { id: 'IRRITABILITY',         label: 'Irritability' },
  HOPELESSNESS:         { id: 'HOPELESSNESS',         label: 'Hopelessness' },
  ANXIETY:              { id: 'ANXIETY',               label: 'Anxiety' },
  LOSS_OF_APPETITE:     { id: 'LOSS_OF_APPETITE',     label: 'Loss of appetite' },
  BODY_ACHE:            { id: 'BODY_ACHE',             label: 'Body ache' },
}

// ── Profiles ──────────────────────────────────────────────────────────────────

export const RECOVERY_PROFILES: Record<RecoveryCategory, RecoveryProfile> = {

  [RecoveryCategory.INFECTIOUS]: {
    category:    RecoveryCategory.INFECTIOUS,
    displayName: 'Infectious Illness',
    emoji:       '🌡️',
    description: 'Track fever, fluid intake, and infection recovery.',
    trendFields: ['temperature', 'fluidIntake'],
    fields: [
      { key: 'temperature',  label: 'Body Temperature', type: 'number', min: 34, max: 42, step: 0.1, unit: '°C', defaultValue: 37.0 },
      { key: 'fluidIntake',  label: 'Fluid Intake',     type: 'number', min: 0,  max: 6,  step: 0.1, unit: 'L',  defaultValue: 2.0 },
      { key: 'fatigue',      label: 'Fatigue Level',    type: 'slider', min: 1,  max: 10, defaultValue: 5,
        description: '1 = no fatigue, 10 = completely exhausted' },
    ],
    symptoms: [
      ALL_SYMPTOMS.HEADACHE, ALL_SYMPTOMS.CHILLS, ALL_SYMPTOMS.SWEATING,
      ALL_SYMPTOMS.FATIGUE, ALL_SYMPTOMS.RASH, ALL_SYMPTOMS.BODY_ACHE,
      ALL_SYMPTOMS.LOSS_OF_APPETITE, ALL_SYMPTOMS.NAUSEA,
    ],
  },

  [RecoveryCategory.MUSCULOSKELETAL]: {
    category:    RecoveryCategory.MUSCULOSKELETAL,
    displayName: 'Musculoskeletal Recovery',
    emoji:       '🦴',
    description: 'Track pain, mobility, and physical recovery progress.',
    trendFields: ['pain', 'mobility'],
    fields: [
      { key: 'pain',         label: 'Pain Level',       type: 'slider', min: 0, max: 10, defaultValue: 5,
        description: '0 = no pain, 10 = worst imaginable' },
      { key: 'mobility',     label: 'Mobility',         type: 'slider', min: 1, max: 10, defaultValue: 5,
        description: '1 = cannot move, 10 = full range of motion' },
      { key: 'swelling',     label: 'Swelling Present', type: 'checkbox', defaultValue: false },
    ],
    symptoms: [
      ALL_SYMPTOMS.SWELLING, ALL_SYMPTOMS.BRUISING, ALL_SYMPTOMS.STIFFNESS,
      ALL_SYMPTOMS.NUMBNESS, ALL_SYMPTOMS.TINGLING,
    ],
  },

  [RecoveryCategory.GI]: {
    category:    RecoveryCategory.GI,
    displayName: 'Gastrointestinal Recovery',
    emoji:       '🫁',
    description: 'Track digestive symptoms, hydration, and GI recovery.',
    trendFields: ['stoolFrequency', 'fluidIntake', 'nauseaSeverity'],
    fields: [
      { key: 'stoolFrequency', label: 'Bowel Episodes',  type: 'number', min: 0, max: 20, step: 1, unit: '/day', defaultValue: 0 },
      { key: 'fluidIntake',    label: 'Fluid Intake',    type: 'number', min: 0, max: 6,  step: 0.1, unit: 'L', defaultValue: 2.0 },
      { key: 'nauseaSeverity', label: 'Nausea Severity', type: 'slider', min: 0, max: 10, defaultValue: 0,
        description: '0 = none, 10 = cannot eat or drink' },
    ],
    symptoms: [
      ALL_SYMPTOMS.NAUSEA, ALL_SYMPTOMS.CRAMPS, ALL_SYMPTOMS.BLOATING,
      ALL_SYMPTOMS.VOMITING, ALL_SYMPTOMS.DIARRHEA, ALL_SYMPTOMS.LOSS_OF_APPETITE,
    ],
  },

  [RecoveryCategory.RESPIRATORY]: {
    category:    RecoveryCategory.RESPIRATORY,
    displayName: 'Respiratory Recovery',
    emoji:       '🫁',
    description: 'Track oxygen levels, breathing, and respiratory function.',
    trendFields: ['spo2', 'coughSeverity', 'breathingDifficulty'],
    fields: [
      { key: 'spo2',               label: 'Oxygen Saturation',    type: 'number', min: 70, max: 100, step: 1, unit: '%', defaultValue: 98 },
      { key: 'coughSeverity',      label: 'Cough Severity',       type: 'slider', min: 0, max: 10, defaultValue: 0,
        description: '0 = no cough, 10 = severe persistent cough' },
      { key: 'breathingDifficulty',label: 'Breathing Difficulty', type: 'slider', min: 0, max: 10, defaultValue: 0,
        description: '0 = breathing normally, 10 = cannot breathe' },
    ],
    symptoms: [
      ALL_SYMPTOMS.SHORTNESS_OF_BREATH, ALL_SYMPTOMS.WHEEZING,
      ALL_SYMPTOMS.CHEST_PAIN, ALL_SYMPTOMS.COUGH, ALL_SYMPTOMS.FATIGUE,
    ],
  },

  [RecoveryCategory.CARDIAC]: {
    category:    RecoveryCategory.CARDIAC,
    displayName: 'Cardiac Recovery',
    emoji:       '❤️',
    description: 'Track heart rate, blood pressure, and cardiac symptoms.',
    trendFields: ['heartRate', 'systolicBP', 'diastolicBP'],
    fields: [
      { key: 'heartRate',    label: 'Heart Rate',      type: 'number', min: 30, max: 220, step: 1,   unit: 'BPM', defaultValue: 70 },
      { key: 'systolicBP',   label: 'Systolic BP',     type: 'number', min: 60, max: 220, step: 1,   unit: 'mmHg', defaultValue: 120 },
      { key: 'diastolicBP',  label: 'Diastolic BP',    type: 'number', min: 40, max: 130, step: 1,   unit: 'mmHg', defaultValue: 80 },
    ],
    symptoms: [
      ALL_SYMPTOMS.CHEST_PAIN, ALL_SYMPTOMS.PALPITATIONS, ALL_SYMPTOMS.DIZZINESS,
      ALL_SYMPTOMS.SHORTNESS_OF_BREATH, ALL_SYMPTOMS.FATIGUE,
    ],
  },

  [RecoveryCategory.POST_SURGICAL]: {
    category:    RecoveryCategory.POST_SURGICAL,
    displayName: 'Post-Surgical Recovery',
    emoji:       '🏥',
    description: 'Track pain, wound healing, and surgical recovery.',
    trendFields: ['pain', 'mobility'],
    fields: [
      { key: 'pain',           label: 'Pain Level',       type: 'slider', min: 0, max: 10, defaultValue: 5,
        description: '0 = no pain, 10 = worst imaginable' },
      { key: 'mobility',       label: 'Mobility',         type: 'slider', min: 1, max: 10, defaultValue: 5 },
      { key: 'woundCondition', label: 'Wound Condition',  type: 'select',
        defaultValue: 'healing',
        // options stored on client side for rendering; key stored as string
      },
    ],
    symptoms: [
      ALL_SYMPTOMS.REDNESS, ALL_SYMPTOMS.DISCHARGE, ALL_SYMPTOMS.FEVER,
      ALL_SYMPTOMS.NUMBNESS, ALL_SYMPTOMS.SWELLING,
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
      { key: 'sleepQuality', label: 'Sleep Quality', type: 'slider', min: 1, max: 5,  defaultValue: 3 },
    ],
    symptoms: [
      ALL_SYMPTOMS.INSOMNIA, ALL_SYMPTOMS.IRRITABILITY, ALL_SYMPTOMS.HOPELESSNESS,
      ALL_SYMPTOMS.ANXIETY, ALL_SYMPTOMS.FATIGUE,
    ],
  },

  [RecoveryCategory.GENERAL]: {
    category:    RecoveryCategory.GENERAL,
    displayName: 'General Recovery',
    emoji:       '🩺',
    description: 'General health and recovery tracking.',
    trendFields: ['pain', 'energy'],
    fields: [
      { key: 'pain',         label: 'Discomfort / Pain', type: 'slider', min: 0, max: 10, defaultValue: 3 },
      { key: 'energy',       label: 'Energy Level',      type: 'slider', min: 1, max: 10, defaultValue: 6 },
      { key: 'appetite',     label: 'Appetite',          type: 'slider', min: 1, max: 10, defaultValue: 6,
        description: '1 = no appetite, 10 = eating normally' },
    ],
    symptoms: [
      ALL_SYMPTOMS.FATIGUE, ALL_SYMPTOMS.HEADACHE, ALL_SYMPTOMS.NAUSEA,
      ALL_SYMPTOMS.FEVER, ALL_SYMPTOMS.BODY_ACHE, ALL_SYMPTOMS.LOSS_OF_APPETITE,
    ],
  },
}

// ── Keyword → Category mapping ────────────────────────────────────────────────

const KEYWORD_MAP: Array<{ keywords: string[]; category: RecoveryCategory }> = [
  {
    keywords: ['fever', 'flu', 'influenza', 'covid', 'dengue', 'malaria', 'typhoid',
               'viral', 'infection', 'sepsis', 'pneumonia bacterial', 'chickenpox',
               'measles', 'hepatitis'],
    category: RecoveryCategory.INFECTIOUS,
  },
  {
    keywords: ['fracture', 'broken', 'sprain', 'strain', 'acl', 'mcl', 'ligament',
               'tendon', 'tendinitis', 'arthritis', 'osteoporosis', 'dislocation',
               'cartilage', 'knee', 'hip', 'shoulder', 'rotator', 'scoliosis',
               'disc', 'back pain', 'sciatica'],
    category: RecoveryCategory.MUSCULOSKELETAL,
  },
  {
    keywords: ['gastroenteritis', 'diarrhea', 'diarrhoea', 'colitis', 'ibs',
               'crohn', 'gerd', 'acid reflux', 'food poisoning', 'nausea',
               'vomiting', 'bowel', 'intestinal', 'digestive', 'gastric', 'peptic'],
    category: RecoveryCategory.GI,
  },
  {
    keywords: ['asthma', 'bronchitis', 'copd', 'pneumonia', 'tuberculosis', 'tb',
               'respiratory', 'lung', 'pulmonary', 'pleural', 'emphysema',
               'sleep apnea', 'sinusitis', 'rhinitis'],
    category: RecoveryCategory.RESPIRATORY,
  },
  {
    keywords: ['cardiac', 'heart', 'myocardial', 'infarction', 'angina', 'arrhythmia',
               'atrial', 'fibrillation', 'hypertension', 'hypertensive', 'stroke',
               'heart failure', 'coronary', 'bypass', 'pacemaker', 'valve'],
    category: RecoveryCategory.CARDIAC,
  },
  {
    keywords: ['surgery', 'surgical', 'operation', 'post-op', 'postop', 'appendectomy',
               'appendix', 'cholecystectomy', 'gallbladder', 'hernia', 'laparoscopic',
               'laparotomy', 'mastectomy', 'hysterectomy', 'cesarean', 'c-section',
               'transplant', 'amputation', 'implant'],
    category: RecoveryCategory.POST_SURGICAL,
  },
  {
    keywords: ['depression', 'anxiety', 'bipolar', 'schizophrenia', 'ptsd',
               'ocd', 'panic', 'eating disorder', 'anorexia', 'bulimia',
               'mental health', 'psychiatric', 'phobia', 'adhd', 'autism'],
    category: RecoveryCategory.MENTAL_HEALTH,
  },
]

/**
 * Map a free-text condition name to a RecoveryCategory.
 * Falls back to GENERAL if no keyword matches.
 */
export function mapConditionToCategory(conditionName: string): RecoveryCategory {
  const lower = conditionName.toLowerCase()
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category
    }
  }
  return RecoveryCategory.GENERAL
}

/**
 * Get the RecoveryProfile for a condition name.
 */
export function getProfileForCondition(conditionName: string | null | undefined): RecoveryProfile {
  if (!conditionName) return RECOVERY_PROFILES[RecoveryCategory.GENERAL]
  const category = mapConditionToCategory(conditionName)
  return RECOVERY_PROFILES[category]
}
