import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Dumbbell, Pill, AlertTriangle, Activity, Plus,
  X, Loader2, RefreshCw, CheckCircle2, LinkIcon, BarChart3,
} from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchCaregiverPatientDetail, logExerciseForPatient, updateExerciseLog, linkPatient } from '@/services/caregiver'

const riskColor = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' } as const
const severityColor = {
  high: 'bg-danger-500/10 border-danger-500/30 text-danger-400',
  medium: 'bg-warning-500/10 border-warning-500/30 text-warning-500',
  low: 'bg-success-500/10 border-success-500/30 text-success-500',
  critical: 'bg-danger-500/10 border-danger-500/30 text-danger-400',
} as const

// ── Add Exercise Modal ─────────────────────────────────────────────────────────
function AddExerciseModal({
  patientId, catalogue, onClose, onSuccess,
}: {
  patientId: string
  catalogue: any[]
  onClose: () => void
  onSuccess: (log: any) => void
}) {
  const [mode, setMode] = useState<'catalogue' | 'custom'>('catalogue')
  const [selectedEx, setSelectedEx] = useState('')
  const [form, setForm] = useState({
    exerciseName: '', category: 'strength', difficulty: 'beginner',
    sets: '', reps: '', durationMins: '',
    setsCompleted: '', repsCompleted: '',
    painDuring: '', difficultyFelt: '', notes: '', completed: true,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleCatalogueSelect = (exId: string) => {
    const ex = catalogue.find(e => e.id === exId)
    if (ex) {
      setSelectedEx(exId)
      setForm(f => ({
        ...f,
        exerciseName: ex.name,
        category: ex.category || 'general',
        difficulty: ex.difficulty || 'beginner',
        sets: ex.sets?.toString() || '',
        reps: ex.reps?.toString() || '',
        durationMins: ex.duration_mins?.toString() || '',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.exerciseName) { setErr('Exercise name is required'); return }
    setSaving(true); setErr('')
    try {
      const log = await logExerciseForPatient(patientId, {
        exerciseName: form.exerciseName,
        category: form.category,
        difficulty: form.difficulty,
        sets: form.sets ? Number(form.sets) : undefined,
        reps: form.reps ? Number(form.reps) : undefined,
        durationMins: form.durationMins ? Number(form.durationMins) : undefined,
        setsCompleted: form.setsCompleted ? Number(form.setsCompleted) : undefined,
        repsCompleted: form.repsCompleted ? Number(form.repsCompleted) : undefined,
        painDuring: form.painDuring ? Number(form.painDuring) : undefined,
        difficultyFelt: form.difficultyFelt ? Number(form.difficultyFelt) : undefined,
        notes: form.notes || undefined,
        completed: form.completed,
      })
      onSuccess(log)
      onClose()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to log exercise')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-lg rounded-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-emerald-400" /> Log Exercise for Patient
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          {(['catalogue', 'custom'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={clsx('flex-1 py-2 rounded-xl text-sm font-medium transition-colors',
                mode === m ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-400'
              )}>
              {m === 'catalogue' ? '📋 From Catalogue' : '✏️ Custom'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'catalogue' ? (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Select Exercise</label>
              <select value={selectedEx} onChange={e => handleCatalogueSelect(e.target.value)} className="input w-full py-2 text-sm">
                <option value="">-- Choose from catalogue --</option>
                {catalogue.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name} ({ex.category})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Exercise Name *</label>
              <input value={form.exerciseName} onChange={e => setForm(f => ({ ...f, exerciseName: e.target.value }))}
                className="input w-full py-2 text-sm" placeholder="e.g. Knee Bends, Walking, Stretching" required />
            </div>
          )}

          {/* Category & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input w-full py-2 text-sm">
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility</option>
                <option value="balance">Balance</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className="input w-full py-2 text-sm">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Sets / Reps / Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Sets done</label>
              <input type="number" value={form.setsCompleted} onChange={e => setForm(f => ({ ...f, setsCompleted: e.target.value }))}
                className="input w-full py-2 text-sm" min={0} placeholder="3" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Reps done</label>
              <input type="number" value={form.repsCompleted} onChange={e => setForm(f => ({ ...f, repsCompleted: e.target.value }))}
                className="input w-full py-2 text-sm" min={0} placeholder="10" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Duration (min)</label>
              <input type="number" value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: e.target.value }))}
                className="input w-full py-2 text-sm" min={0} placeholder="15" />
            </div>
          </div>

          {/* Pain / Difficulty felt */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Pain during (0–10)</label>
              <input type="number" value={form.painDuring} onChange={e => setForm(f => ({ ...f, painDuring: e.target.value }))}
                className="input w-full py-2 text-sm" min={0} max={10} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Difficulty felt (1–5)</label>
              <input type="number" value={form.difficultyFelt} onChange={e => setForm(f => ({ ...f, difficultyFelt: e.target.value }))}
                className="input w-full py-2 text-sm" min={1} max={5} placeholder="3" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input w-full py-2 text-sm resize-none" rows={2} placeholder="Patient's feedback, observations…" />
          </div>

          {/* Completed toggle */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="completed" checked={form.completed}
              onChange={e => setForm(f => ({ ...f, completed: e.target.checked }))}
              className="w-4 h-4 accent-emerald-500" />
            <label htmlFor="completed" className="text-sm text-slate-400">Mark as completed</label>
          </div>

          {err && <p className="text-xs text-danger-400">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging…</> : 'Log Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CaregiverPatientDetail() {
  const { patientId } = useParams<{ patientId: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExModal, setShowExModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  const load = async () => {
    if (!patientId) return
    try {
      setLoading(true); setError(null)
      setData(await fetchCaregiverPatientDetail(patientId))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load patient')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [patientId])

  const handleToggleComplete = async (log: any) => {
    setTogglingId(log.log_id)
    try {
      await updateExerciseLog(patientId!, log.log_id, { completed: !log.completed })
      setData((prev: any) => ({
        ...prev,
        todayExercises: prev.todayExercises.map((e: any) =>
          e.log_id === log.log_id ? { ...e, completed: !e.completed } : e
        ),
      }))
    } catch { } finally { setTogglingId(null) }
  }

  const handleLink = async () => {
    setLinking(true)
    try {
      await linkPatient(patientId!, 'caregiver')
      setData((prev: any) => ({ ...prev, isLinked: true }))
    } catch { } finally { setLinking(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-danger-400">{error}</p>
      <button onClick={load} className="btn-secondary text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )

  if (!data) return null
  const { patient, score, riskLevel, alerts, medications, todayExercises, exHistory, exerciseCatalogue, isLinked } = data

  const exDone = todayExercises.filter((e: any) => e.completed).length
  const exTotal = todayExercises.length

  return (
    <div className="space-y-5 animate-fade-in">
      {showExModal && (
        <AddExerciseModal
          patientId={patientId!}
          catalogue={exerciseCatalogue || []}
          onClose={() => setShowExModal(false)}
          onSuccess={log => {
            setData((prev: any) => {
              const exists = prev.todayExercises.find((e: any) => e.log_id === log.log_id || e.id === log.exercise_id)
              if (exists) {
                return { ...prev, todayExercises: prev.todayExercises.map((e: any) => e.id === log.exercise_id ? { ...e, ...log } : e) }
              }
              return { ...prev, todayExercises: [{ ...log, id: log.exercise_id, name: log.exerciseName }, ...prev.todayExercises] }
            })
          }}
        />
      )}

      {/* Back */}
      <Link to="/caregiver/patients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </Link>

      {/* Header */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 text-emerald-300 text-xl font-bold flex items-center justify-center shrink-0">
              {patient.initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{patient.name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {patient.age ? `${patient.age} yrs` : ''}{patient.gender ? ` · ${patient.gender}` : ''}
              </p>
              {data.relationship && <p className="text-xs text-slate-600 mt-0.5 capitalize">{data.relationship}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!isLinked && (
              <button onClick={handleLink} disabled={linking}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl disabled:opacity-50">
                <LinkIcon className="w-3 h-3" />
                {linking ? 'Linking…' : 'Link as caregiver'}
              </button>
            )}
            <span className={(riskColor as any)[riskLevel]}>{riskLevel} risk</span>
            {score !== null && (
              <div className="text-right">
                <div className={clsx('text-2xl font-bold',
                  score >= 80 ? 'text-success-500' : score >= 60 ? 'text-warning-500' : 'text-danger-500')}>
                  {score}%
                </div>
                <div className="text-xs text-slate-600">recovery score</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts?.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <div key={a.id} className={clsx('flex items-start gap-3 px-4 py-3 rounded-xl text-sm border', severityColor[a.severity as keyof typeof severityColor])}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{a.title}</p>
                {a.description && <p className="text-xs opacity-75 mt-0.5">{a.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Exercise history chart */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> Exercise Completion — Last 7 Days
          </h3>
          {exHistory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={exHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="total" fill="#334155" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No exercise history yet</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="glass p-5 rounded-2xl space-y-4">
          {[
            { icon: Dumbbell,       label: "Today's Exercises", value: `${exDone}/${exTotal} done`,             color: exDone === exTotal && exTotal > 0 ? 'text-success-500' : 'text-warning-500' },
            { icon: Pill,           label: 'Active Medications', value: `${medications?.length || 0} prescribed`, color: 'text-brand-400' },
            { icon: AlertTriangle,  label: 'Active Alerts',      value: alerts?.length || 0,                     color: alerts?.length > 0 ? 'text-danger-400' : 'text-success-500' },
            { icon: Activity,       label: 'Recovery Score',     value: score !== null ? `${score}%` : '—',      color: score !== null ? (score >= 80 ? 'text-success-500' : score >= 60 ? 'text-warning-500' : 'text-danger-500') : 'text-slate-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-800 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={clsx('text-sm font-bold', s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Exercises */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-emerald-400" /> Today's Exercises
            {exTotal > 0 && (
              <span className="text-xs text-slate-500 ml-1">({exDone}/{exTotal} completed)</span>
            )}
          </h3>
          <button onClick={() => setShowExModal(true)}
            className="text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Exercise
          </button>
        </div>

        {todayExercises.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No exercises logged today</p>
            <p className="text-xs text-slate-600 mt-1">Click "Add Exercise" to log one for this patient</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayExercises.map((ex: any) => (
              <div key={ex.log_id || ex.id} className={clsx(
                'flex items-center gap-3 p-3 rounded-xl transition-colors',
                ex.completed ? 'bg-success-500/5 border border-success-500/20' : 'bg-surface-800/50'
              )}>
                <button
                  onClick={() => handleToggleComplete(ex)}
                  disabled={togglingId === ex.log_id}
                  className="shrink-0"
                >
                  {togglingId === ex.log_id
                    ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    : ex.completed
                      ? <CheckCircle2 className="w-5 h-5 text-success-500" />
                      : <div className="w-5 h-5 rounded-full border-2 border-slate-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium', ex.completed ? 'text-slate-400 line-through' : 'text-slate-200')}>
                    {ex.name}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {ex.category} · {ex.difficulty}
                    {ex.sets_completed ? ` · ${ex.sets_completed} sets` : ''}
                    {ex.reps_completed ? ` × ${ex.reps_completed} reps` : ''}
                    {ex.duration_mins ? ` · ${ex.duration_mins}min` : ''}
                    {ex.pain_during != null ? ` · Pain: ${ex.pain_during}/10` : ''}
                  </p>
                  {ex.log_notes && <p className="text-xs text-slate-500 mt-0.5 italic">{ex.log_notes}</p>}
                </div>
                {ex.logged_at && (
                  <span className="text-xs text-slate-600 shrink-0">
                    {format(new Date(ex.logged_at), 'h:mm a')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medications (read-only) */}
      <div className="glass p-5 rounded-2xl">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Pill className="w-4 h-4 text-brand-400" /> Active Medications
        </h3>
        {medications?.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">No active medications</p>
        ) : (
          <div className="space-y-2">
            {medications.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
                <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{m.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.dosage} · {m.frequency} · {m.times_per_day}×/day</p>
                </div>
                <span className={clsx('text-xs px-2 py-1 rounded-lg',
                  Number(m.taken_today) > 0 ? 'bg-success-500/10 text-success-500' : 'bg-surface-700 text-slate-500'
                )}>
                  {Number(m.taken_today) > 0 ? '✓ Taken' : 'Not taken'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
