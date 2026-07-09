import { useState, useEffect } from 'react'
import {
  Save, Loader2, CheckCircle2, Thermometer, Droplets, Activity,
  Heart, Brain, Stethoscope, Info, ChevronDown, X,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import {
  fetchTodayLog, createRecoveryLog, updateRecoveryLog, getConditionProfile,
} from '@/services/patient'
import {
  RecoveryProfile, RecoveryField, RecoveryCategory, RECOVERY_PROFILES,
  getDefaultVitals,
} from '@/config/recoveryProfiles'

// ── Universal fields ────────────────────────────────────────────────────────
interface UniversalFields {
  overallFeeling: number
  energyLevel: number
  sleepHours: number
  notes: string
}

// ── Category picker config ──────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { category: RecoveryCategory.INFECTIOUS, icon: Thermometer },
  { category: RecoveryCategory.MUSCULOSKELETAL, icon: Activity },
  { category: RecoveryCategory.GI, icon: Droplets },
  { category: RecoveryCategory.RESPIRATORY, icon: Stethoscope },
  { category: RecoveryCategory.CARDIAC, icon: Heart },
  { category: RecoveryCategory.POST_SURGICAL, icon: Stethoscope },
  { category: RecoveryCategory.MENTAL_HEALTH, icon: Brain },
  { category: RecoveryCategory.GENERAL, icon: Stethoscope },
]

// ── Category Picker Modal ───────────────────────────────────────────────────
function CategoryPicker({
  current, onSelect, onClose,
}: {
  current: RecoveryCategory
  onSelect: (cat: RecoveryCategory) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white border border-surface-200 rounded-2xl p-6 w-full max-w-md shadow-card-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-surface-900">Recovery Type</h3>
            <p className="text-xs text-surface-400 mt-0.5">Select the category that matches your condition</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-surface-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-surface-500" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-1">
          {CATEGORY_OPTIONS.map(({ category, icon: Icon }) => {
            const p = RECOVERY_PROFILES[category]
            const isActive = current === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => { onSelect(category); onClose() }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                  isActive
                    ? 'bg-brand-50 border border-brand-100'
                    : 'hover:bg-surface-50 border border-transparent'
                )}
              >
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  isActive ? 'bg-brand-100' : 'bg-surface-100')}>
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-brand-600' : 'text-surface-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={clsx('text-sm font-medium', isActive ? 'text-brand-700' : 'text-surface-700')}>
                    {p.displayName}
                  </span>
                  <span className="ml-2 text-xs text-surface-400">{p.description}</span>
                </div>
                {isActive && (
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Dynamic field renderer ──────────────────────────────────────────────────
function DynamicField({
  field, value, onChange,
}: {
  field: RecoveryField
  value: any
  onChange: (key: string, val: any) => void
}) {
  const pct = field.min !== undefined && field.max !== undefined
    ? ((Number(value) - field.min) / (field.max - field.min)) * 100
    : 50

  switch (field.type) {
    case 'slider':
      return (
        <div className="card-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-surface-700">{field.label}</span>
              {field.unit && <span className="ml-1 text-xs text-surface-400">({field.unit})</span>}
            </div>
            <span className="text-xl font-bold text-brand-600 tabular-nums">
              {value}<span className="text-xs text-surface-400 font-normal">/{field.max}</span>
            </span>
          </div>
          {field.description && (
            <p className="text-xs text-surface-400 mb-3 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" /> {field.description}
            </p>
          )}
          <input type="range" min={field.min ?? 0} max={field.max ?? 10} step={field.step ?? 1}
            value={Number(value)}
            onChange={e => onChange(field.key, Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-200"
            style={{ background: `linear-gradient(to right, #2563eb ${pct}%, #e2e8f0 ${pct}%)` }}
          />
          <div className="flex justify-between mt-1.5 text-xs text-surface-400">
            <span>{field.min ?? 0}</span><span>{field.max ?? 10}</span>
          </div>
        </div>
      )

    case 'number':
      return (
        <div className="card-sm">
          <label className="block text-sm font-medium text-surface-700 mb-1">
            {field.label}
            {field.unit && <span className="ml-1 text-xs text-surface-400">({field.unit})</span>}
          </label>
          {field.description && (
            <p className="text-xs text-surface-400 mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" /> {field.description}
            </p>
          )}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={field.min} max={field.max} step={field.step ?? 1}
              value={value}
              onChange={e => onChange(field.key, parseFloat(e.target.value) || 0)}
              className="input text-center text-2xl font-bold w-32"
            />
            {field.unit && <span className="text-surface-500 font-medium text-lg">{field.unit}</span>}
          </div>
        </div>
      )

    case 'checkbox':
      return (
        <div className="card-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-surface-700">{field.label}</span>
            {field.description && (
              <p className="text-xs text-surface-400 mt-0.5">{field.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(field.key, !value)}
            className={clsx(
              'w-11 h-6 rounded-full transition-all relative shrink-0',
              value ? 'bg-brand-600' : 'bg-surface-200'
            )}
          >
            <span className={clsx(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all',
              value ? 'left-6' : 'left-1'
            )} />
          </button>
        </div>
      )

    case 'select':
      return (
        <div className="card-sm">
          <label className="block text-sm font-medium text-surface-700 mb-2.5">{field.label}</label>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map(opt => (
              <button key={opt.value} type="button"
                onClick={() => onChange(field.key, opt.value)}
                className={clsx(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  value === opt.value
                    ? 'bg-brand-50 border border-brand-200 text-brand-700'
                    : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border border-surface-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}

// ── Universal slider ─────────────────────────────────────────────────────────
function UniversalSlider({
  label, value, onChange, min = 1, max = 10,
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="card-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-surface-700">{label}</span>
        <span className="text-xl font-bold text-brand-600 tabular-nums">
          {value}<span className="text-xs text-surface-400 font-normal">/{max}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #2563eb ${pct}%, #e2e8f0 ${pct}%)` }}
      />
      <div className="flex justify-between mt-1.5 text-xs text-surface-400">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RecoveryLog() {
  const { user } = useAuthStore()
  const patientId = user?.patientId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingLogId, setExistingLogId] = useState<string | null>(null)
  const [alreadySaved, setAlreadySaved] = useState(false)

  const [profile, setProfile] = useState<RecoveryProfile>(RECOVERY_PROFILES[RecoveryCategory.GENERAL])
  const [conditionName, setConditionName] = useState<string | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const [universal, setUniversal] = useState<UniversalFields>({
    overallFeeling: 6,
    energyLevel: 6,
    sleepHours: 7,
    notes: '',
  })

  const [vitals, setVitals] = useState<Record<string, any>>({})
  const [symptoms, setSymptoms] = useState<string[]>([])

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    if (!patientId) { setLoading(false); return }

    Promise.all([
      getConditionProfile(patientId).catch(() => null),
      fetchTodayLog(patientId).catch(() => null),
    ]).then(([profileData, log]) => {
      if (profileData?.profile && profileData.condition) {
        setProfile(RECOVERY_PROFILES[profileData.category as RecoveryCategory] ?? RECOVERY_PROFILES[RecoveryCategory.GENERAL])
        setConditionName(profileData.condition)
        setAutoDetected(true)
        setVitals(getDefaultVitals(RECOVERY_PROFILES[profileData.category as RecoveryCategory] ?? RECOVERY_PROFILES[RecoveryCategory.GENERAL]))
      } else {
        const savedPref = localStorage.getItem(`recovery_category_preference_${patientId}`)
        if (savedPref && RECOVERY_PROFILES[savedPref as RecoveryCategory]) {
          setProfile(RECOVERY_PROFILES[savedPref as RecoveryCategory])
          setConditionName(null)
          setAutoDetected(true)
          setVitals(getDefaultVitals(RECOVERY_PROFILES[savedPref as RecoveryCategory]))
        } else {
          setProfile(RECOVERY_PROFILES[RecoveryCategory.GENERAL])
          setAutoDetected(false)
          setConditionName(null)
          setVitals(getDefaultVitals(RECOVERY_PROFILES[RecoveryCategory.GENERAL]))
        }
      }

      if (log) {
        setExistingLogId(log.id)
        setAlreadySaved(true)
        setUniversal({
          overallFeeling: log.overall_feeling ?? 6,
          energyLevel: log.energy_level ?? 6,
          sleepHours: parseFloat(log.sleep_hours) || 7,
          notes: log.notes ?? '',
        })
        if (log.vitals && Object.keys(log.vitals).length > 0) {
          const { symptoms: storedSymptoms = [], recoveryCategory, ...rest } = log.vitals
          setSymptoms(storedSymptoms)
          setVitals(prev => ({ ...prev, ...rest }))
          
          if (recoveryCategory && RECOVERY_PROFILES[recoveryCategory as RecoveryCategory]) {
            setProfile(RECOVERY_PROFILES[recoveryCategory as RecoveryCategory])
            setAutoDetected(true)
          }
        }
      }
    }).finally(() => setLoading(false))
  }, [patientId])

  const handleCategorySelect = (category: RecoveryCategory) => {
    const newProfile = RECOVERY_PROFILES[category]
    setProfile(newProfile)
    setVitals(getDefaultVitals(newProfile))
    setSymptoms([])
    if (patientId) {
      localStorage.setItem(`recovery_category_preference_${patientId}`, category)
    }
    setAutoDetected(true)
    setConditionName(null)
  }

  const setVital = (key: string, val: any) =>
    setVitals(prev => ({ ...prev, [key]: val }))

  const toggleSymptom = (id: string) =>
    setSymptoms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    if (!patientId) { toast.error('Patient profile not found'); return }
    setSaving(true)
    try {
      const payload = {
        overallFeeling: universal.overallFeeling,
        energyLevel: universal.energyLevel,
        sleepHours: universal.sleepHours,
        notes: universal.notes,
        vitals: { ...vitals, symptoms, recoveryCategory: profile.category },
      }

      if (existingLogId) {
        await updateRecoveryLog(existingLogId, payload)
        toast.success('Recovery log updated!')
      } else {
        const log = await createRecoveryLog(patientId, payload)
        setExistingLogId(log.id)
        setAlreadySaved(true)
        toast.success('Recovery log saved!')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save log')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        <p className="text-sm text-surface-400">Loading your log…</p>
      </div>
    </div>
  )

  const catOption = CATEGORY_OPTIONS.find(o => o.category === profile.category)
  const CategoryIcon = catOption?.icon ?? Stethoscope

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Daily Recovery Log</h2>
          <p className="text-sm text-surface-400 mt-0.5 flex items-center gap-2 flex-wrap">
            {today}
            {alreadySaved && (
              <span className="text-success-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logged today
              </span>
            )}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : existingLogId ? 'Update Log' : 'Save Log'}
        </button>
      </div>

      {/* Condition / Category Badge */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
          <CategoryIcon className="w-4.5 h-4.5 text-teal-600" />
        </div>

        <div className="flex-1 min-w-0">
          {autoDetected ? (
            <>
              <p className="text-sm font-semibold text-surface-800">{profile.displayName}</p>
              <p className="text-xs text-surface-400 mt-0.5">
                {conditionName ? (
                  <>Detected from: <span className="text-surface-600 font-medium">{conditionName}</span></>
                ) : (
                  'Your selected recovery type'
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-surface-800">{profile.displayName}</p>
              <p className="text-xs text-surface-400 mt-0.5">Select a recovery type to see relevant metrics</p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 hover:text-surface-800 text-xs font-medium transition-all shrink-0"
        >
          Change <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* No-condition selector */}
      {!autoDetected && (
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="section-label">Select Recovery Type</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-surface-100">
            {CATEGORY_OPTIONS.map(({ category, icon: Icon }) => {
              const p = RECOVERY_PROFILES[category]
              const isActive = profile.category === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={clsx(
                    'flex items-center gap-2.5 px-4 py-3.5 text-left transition-colors',
                    isActive
                      ? 'bg-brand-50'
                      : 'hover:bg-surface-50'
                  )}
                >
                  <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-brand-600' : 'text-surface-400')} />
                  <span className={clsx('text-sm font-medium', isActive ? 'text-brand-700' : 'text-surface-600')}>
                    {p.displayName}
                  </span>
                  {isActive && <CheckCircle2 className="ml-auto w-3.5 h-3.5 text-brand-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Condition-specific fields */}
      <div className="space-y-3">
        <p className="section-label px-1">{profile.displayName} Metrics</p>
        {profile.fields.map(field => (
          <DynamicField
            key={`${profile.category}-${field.key}`}
            field={field}
            value={vitals[field.key] ?? field.defaultValue}
            onChange={setVital}
          />
        ))}
      </div>

      {/* Universal fields */}
      <div className="space-y-3">
        <p className="section-label px-1">General Wellbeing</p>
        <UniversalSlider
          label="Overall Feeling"
          value={universal.overallFeeling}
          onChange={v => setUniversal(p => ({ ...p, overallFeeling: v }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <UniversalSlider
            label="Energy Level"
            value={universal.energyLevel}
            onChange={v => setUniversal(p => ({ ...p, energyLevel: v }))}
          />
          <div className="card-sm">
            <label className="block text-sm font-medium text-surface-700 mb-2">Sleep (hours)</label>
            <input
              type="number" min={0} max={24} step={0.5}
              value={universal.sleepHours}
              onChange={e => setUniversal(p => ({ ...p, sleepHours: parseFloat(e.target.value) || 0 }))}
              className="input text-center text-xl font-bold"
            />
          </div>
        </div>
      </div>

      {/* Symptoms */}
      {profile.symptoms.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-surface-700 mb-3">
            Symptoms today{' '}
            <span className="text-surface-400 font-normal text-xs">(select all that apply)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.symptoms.map(s => (
              <button key={s.id} type="button" onClick={() => toggleSymptom(s.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                  symptoms.includes(s.id)
                    ? 'bg-danger-50 text-danger-700 border-danger-200'
                    : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border-surface-200'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card p-4">
        <label className="text-sm font-semibold text-surface-700 mb-2.5 block">Notes & observations</label>
        <textarea
          rows={3}
          value={universal.notes}
          onChange={e => setUniversal(p => ({ ...p, notes: e.target.value }))}
          placeholder="How did today go? Any concerns or milestones to note…"
          className="input resize-none"
        />
      </div>

      {/* Category Picker Modal */}
      {showPicker && (
        <CategoryPicker
          current={profile.category}
          onSelect={handleCategorySelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
