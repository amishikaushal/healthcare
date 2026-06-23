import { useState, useEffect } from 'react'
import { Save, Smile, Frown, Meh, Heart, Moon, Zap, Activity, Loader2, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { fetchTodayLog, createRecoveryLog, updateRecoveryLog } from '@/services/patient'

const SYMPTOMS = [
  'Swelling', 'Stiffness', 'Numbness', 'Tingling', 'Bruising',
  'Redness', 'Fever', 'Fatigue', 'Nausea', 'Dizziness',
]

function Slider({ label, value, onChange, min = 1, max = 10, icon: Icon, colorFn }: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; icon: any; colorFn: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="glass p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={clsx('w-4 h-4', colorFn(value))} />
          <span className="text-sm font-medium text-slate-300">{label}</span>
        </div>
        <span className={clsx('text-lg font-bold tabular-nums', colorFn(value))}>
          {value}<span className="text-xs text-slate-500">/{max}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${pct > 70 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#f43f5e'} ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-xs text-slate-600">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

function MoodPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const moods = [
    { v: 2, icon: Frown,  label: 'Terrible', color: 'text-danger-500' },
    { v: 4, icon: Frown,  label: 'Bad',      color: 'text-orange-500' },
    { v: 6, icon: Meh,   label: 'Okay',     color: 'text-warning-500' },
    { v: 8, icon: Smile,  label: 'Good',     color: 'text-brand-400' },
    { v: 10,icon: Smile,  label: 'Great',    color: 'text-success-500' },
  ]
  return (
    <div className="glass p-4 rounded-2xl">
      <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Smile className="w-4 h-4 text-brand-400" /> How are you feeling today?
      </p>
      <div className="flex justify-between gap-2">
        {moods.map(m => (
          <button key={m.v} type="button" onClick={() => onChange(m.v)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all',
              value === m.v ? 'bg-brand-600/20 border border-brand-500/40' : 'hover:bg-surface-800'
            )}>
            <m.icon className={clsx('w-6 h-6', m.color)} />
            <span className="text-xs text-slate-500">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function RecoveryLog() {
  const { user } = useAuthStore()
  const patientId = user?.patientId

  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [existingLogId,setExistingLogId]= useState<string | null>(null)
  const [alreadySaved, setAlreadySaved] = useState(false)

  const [painLevel,     setPainLevel]     = useState(5)
  const [moodScore,     setMoodScore]     = useState(6)
  const [energyLevel,   setEnergyLevel]   = useState(6)
  const [mobilityScore, setMobilityScore] = useState(5)
  const [sleepHours,    setSleepHours]    = useState(7)
  const [sleepQuality,  setSleepQuality]  = useState(3)
  const [symptoms,      setSymptoms]      = useState<string[]>([])
  const [notes,         setNotes]         = useState('')

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // Load today's existing log if any
  useEffect(() => {
    if (!patientId) { setLoading(false); return }
    fetchTodayLog(patientId)
      .then(log => {
        if (log) {
          setExistingLogId(log.id)
          setAlreadySaved(true)
          setPainLevel(log.pain_level ?? 5)
          setMoodScore(log.overall_feeling ?? 6)
          setEnergyLevel(log.energy_level ?? 6)
          setMobilityScore(log.mobility_score ?? 5)
          setSleepHours(parseFloat(log.sleep_hours) ?? 7)
          setSleepQuality(log.sleep_quality ?? 3)
          setNotes(log.notes ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patientId])

  const toggleSymptom = (s: string) =>
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = async () => {
    if (!patientId) { toast.error('Patient profile not found'); return }
    setSaving(true)
    try {
      const payload = {
        painLevel, overallFeeling: moodScore, energyLevel,
        mobilityScore, sleepHours, sleepQuality, notes,
        vitals: { symptoms },
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

  const painColor  = (v: number) => v <= 3 ? 'text-success-500' : v <= 6 ? 'text-warning-500' : 'text-danger-500'
  const scoreColor = (v: number) => v >= 7 ? 'text-success-500' : v >= 4 ? 'text-warning-500' : 'text-danger-500'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Daily Recovery Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {today} {alreadySaved && <span className="text-success-500 ml-2 flex items-center gap-1 inline-flex">
              <CheckCircle2 className="w-3.5 h-3.5" /> Logged today
            </span>}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : existingLogId ? 'Update Log' : 'Save Log'}
        </button>
      </div>

      <Slider label="Pain Level" value={painLevel} onChange={setPainLevel}
        min={0} max={10} icon={Heart} colorFn={painColor} />

      <MoodPicker value={moodScore} onChange={setMoodScore} />

      <div className="grid grid-cols-2 gap-4">
        <Slider label="Energy Level" value={energyLevel} onChange={setEnergyLevel}
          icon={Zap} colorFn={scoreColor} />
        <Slider label="Mobility" value={mobilityScore} onChange={setMobilityScore}
          icon={Activity} colorFn={scoreColor} />
      </div>

      <div className="glass p-4 rounded-2xl">
        <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-400" /> Sleep
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Hours slept</label>
            <input type="number" min={0} max={24} step={0.5} value={sleepHours}
              onChange={e => setSleepHours(Number(e.target.value))}
              className="input text-center text-xl font-bold" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Sleep quality (1–5)</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(q => (
                <button key={q} type="button" onClick={() => setSleepQuality(q)}
                  className={clsx(
                    'flex-1 h-10 rounded-lg text-sm font-bold transition-all',
                    sleepQuality >= q
                      ? 'bg-indigo-500/30 text-indigo-400 border border-indigo-500/40'
                      : 'bg-surface-800 text-slate-600'
                  )}>★</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-2xl">
        <p className="text-sm font-medium text-slate-300 mb-3">
          Symptoms today <span className="text-slate-600 text-xs">(select all that apply)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map(s => (
            <button key={s} type="button" onClick={() => toggleSymptom(s)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                symptoms.includes(s)
                  ? 'bg-danger-500/20 text-danger-400 border border-danger-500/30'
                  : 'bg-surface-800 text-slate-400 hover:bg-surface-700'
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass p-4 rounded-2xl">
        <label className="text-sm font-medium text-slate-300 mb-2 block">Notes & observations</label>
        <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="How did today go? Any concerns or milestones to note…"
          className="input resize-none" />
      </div>
    </div>
  )
}
