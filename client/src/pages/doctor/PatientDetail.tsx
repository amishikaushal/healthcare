import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Activity, Pill, Dumbbell, Calendar, AlertTriangle, TrendingUp, Plus, X, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { fetchDoctorPatientDetail, createAppointment, prescribeMedication, stopMedication, resolveAlert } from '@/services/doctor'
import api from '@/services/api'

const riskColor = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' } as const
const scoreColor = (s: number | null) =>
  s === null ? 'text-surface-500' : s >= 80 ? 'text-success-500' : s >= 60 ? 'text-warning-500' : 'text-danger-500'
const severityColor = {
  high: 'bg-danger-500/10 border-danger-500/30 text-danger-400',
  medium: 'bg-warning-500/10 border-warning-500/30 text-warning-500',
  low: 'bg-success-500/10 border-success-500/30 text-success-500',
  critical: 'bg-danger-500/10 border-danger-500/30 text-danger-400',
} as const

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="text-surface-500">{label}</p>
      <p className="text-danger-400">Pain: {payload[0]?.value}/10</p>
    </div>
  )
}

// ── Add Appointment Modal ─────────────────────────────────────────────────────
function AddAppointmentModal({ patientId, onClose, onSuccess }: { patientId: string; onClose: () => void; onSuccess: (appt: any) => void }) {
  const [form, setForm] = useState<{
    title: string
    appointmentType: 'in_person' | 'telehealth' | 'home_visit'
    scheduledAt: string
    durationMins: number
    location: string
    preNotes: string
  }>({
    title: 'Follow-up',
    appointmentType: 'in_person',
    scheduledAt: '',
    durationMins: 30,
    location: '',
    preNotes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.scheduledAt) { setErr('Please pick a date & time'); return }
    setSaving(true); setErr('')
    try {
      const appt = await createAppointment(patientId, { ...form, durationMins: Number(form.durationMins) })
      onSuccess(appt)
      onClose()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to create appointment')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-surface-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-400" /> New Appointment</h3>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input w-full py-2 text-sm" placeholder="e.g. Follow-up, Check-up" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Type</label>
              <select value={form.appointmentType} onChange={e => setForm(f => ({ ...f, appointmentType: e.target.value as 'in_person' | 'telehealth' | 'home_visit' }))} className="input w-full py-2 text-sm">
                <option value="in_person">In Person</option>
                <option value="telehealth">Telehealth</option>
                <option value="home_visit">Home Visit</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Duration (mins)</label>
              <input type="number" value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: +e.target.value }))}
                className="input w-full py-2 text-sm" min={15} step={15} />
            </div>
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Date & Time *</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="input w-full py-2 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="input w-full py-2 text-sm" placeholder="Room 204, Clinic B…" />
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Pre-appointment Notes</label>
            <textarea value={form.preNotes} onChange={e => setForm(f => ({ ...f, preNotes: e.target.value }))}
              className="input w-full py-2 text-sm resize-none" rows={2} placeholder="Instructions for patient…" />
          </div>
          {err && <p className="text-xs text-danger-400">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Prescribe Medication Modal ─────────────────────────────────────────────────
function PrescribeMedModal({ patientId, onClose, onSuccess }: { patientId: string; onClose: () => void; onSuccess: (med: any) => void }) {
  const [form, setForm] = useState<{
    medicationName: string
    dosage: string
    frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed'
    timesPerDay: number
    startDate: string
    endDate: string
    withFood: boolean
    notes: string
  }>({
    medicationName: '',
    dosage: '',
    frequency: 'daily',
    timesPerDay: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    withFood: false,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.medicationName || !form.dosage) { setErr('Medication name and dosage are required'); return }
    setSaving(true); setErr('')
    try {
      const med = await prescribeMedication(patientId, { ...form, timesPerDay: Number(form.timesPerDay) })
      onSuccess(med)
      onClose()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to prescribe medication')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-surface-900 flex items-center gap-2"><Pill className="w-4 h-4 text-brand-400" /> Prescribe Medication</h3>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Medication Name *</label>
            <input value={form.medicationName} onChange={e => setForm(f => ({ ...f, medicationName: e.target.value }))}
              className="input w-full py-2 text-sm" placeholder="e.g. Naproxen, Ibuprofen" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Dosage *</label>
              <input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
                className="input w-full py-2 text-sm" placeholder="500mg" required />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Times per day</label>
              <input type="number" value={form.timesPerDay} onChange={e => setForm(f => ({ ...f, timesPerDay: +e.target.value }))}
                className="input w-full py-2 text-sm" min={1} max={6} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Frequency</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'as_needed' }))} className="input w-full py-2 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="as_needed">As Needed</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" id="withFood" checked={form.withFood} onChange={e => setForm(f => ({ ...f, withFood: e.target.checked }))}
                className="w-4 h-4 accent-brand-500" />
              <label htmlFor="withFood" className="text-xs text-surface-500">Take with food</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="input w-full py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">End Date (optional)</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="input w-full py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input w-full py-2 text-sm resize-none" rows={2} placeholder="Special instructions…" />
          </div>
          {err && <p className="text-xs text-danger-400">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Prescribing…</> : 'Prescribe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApptModal, setShowApptModal] = useState(false)
  const [showMedModal, setShowMedModal] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [stoppingMed, setStoppingMed] = useState<string | null>(null)
  const [latestReport, setLatestReport] = useState<any>(null)
  const [showInsightsModal, setShowInsightsModal] = useState(false)

  const load = async () => {
    if (!patientId) return
    try {
      setLoading(true); setError(null)
      const d = await fetchDoctorPatientDetail(patientId)
      setData(d)
      
      try {
        const { data: reports } = await api.get(`/patients/${patientId}/weekly-reports`)
        if (reports && reports.length > 0) setLatestReport(reports[0])
      } catch (err) {
        console.error('Failed to load weekly report', err)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load patient')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [patientId])

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId)
    try {
      await resolveAlert(patientId!, alertId)
      setData((prev: any) => ({ ...prev, alerts: prev.alerts.filter((a: any) => a.id !== alertId), alertCount: Math.max(0, prev.alertCount - 1) }))
    } catch { } finally { setResolvingId(null) }
  }

  const handleStopMed = async (scheduleId: string) => {
    setStoppingMed(scheduleId)
    try {
      await stopMedication(patientId!, scheduleId)
      setData((prev: any) => ({ ...prev, medications: prev.medications.filter((m: any) => m.id !== scheduleId) }))
    } catch { } finally { setStoppingMed(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
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
  const { patient, score, riskLevel, alerts, appointments, medications, painTrend, stats, conditionName, carePlan } = data

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Modals */}
      {showApptModal && (
        <AddAppointmentModal
          patientId={patientId!}
          onClose={() => setShowApptModal(false)}
          onSuccess={appt => setData((p: any) => ({ ...p, appointments: [appt, ...p.appointments] }))}
        />
      )}
      {showMedModal && (
        <PrescribeMedModal
          patientId={patientId!}
          onClose={() => setShowMedModal(false)}
          onSuccess={med => setData((p: any) => ({ ...p, medications: [med, ...p.medications] }))}
        />
      )}
      {showInsightsModal && latestReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-3xl rounded-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowInsightsModal(false)} className="absolute top-6 right-6 text-surface-500 hover:text-surface-700">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2 mb-4">
              Weekly AI Insights <span className="badge-teal text-xs ml-2">Generated {format(new Date(latestReport.created_at), 'd MMM yyyy')}</span>
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl">
                <h3 className="text-sm font-semibold text-brand-700 mb-2">Clinical Summary</h3>
                <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-line">{latestReport.ai_summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-50 border border-surface-100 rounded-xl">
                  <h3 className="text-sm font-semibold text-success-600 mb-2">Progress & Highlights</h3>
                  <ul className="text-sm text-surface-700 space-y-1 pl-4 list-disc">
                    {(() => {
                      const highlightsObj = typeof latestReport.highlights === 'string' ? JSON.parse(latestReport.highlights) : (latestReport.highlights || {});
                      const list = highlightsObj.highlights || highlightsObj.items || highlightsObj.achievements || [];
                      return list.map((item: string, i: number) => <li key={i}>{item}</li>)
                    })()}
                  </ul>
                </div>
                <div className="p-4 bg-surface-50 border border-surface-100 rounded-xl">
                  <h3 className="text-sm font-semibold text-warning-600 mb-2">Areas of Concern</h3>
                  <ul className="text-sm text-surface-700 space-y-1 pl-4 list-disc">
                    {(() => {
                      const concernsObj = typeof latestReport.concerns === 'string' ? JSON.parse(latestReport.concerns) : (latestReport.concerns || {});
                      const list = concernsObj.areasForImprovement || concernsObj.items || concernsObj.riskFactors || [];
                      return list.map((item: string, i: number) => <li key={i}>{item}</li>)
                    })()}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <Link to="/doctor/patients" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </Link>

      {/* Header */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/30 text-brand-300 text-xl font-bold flex items-center justify-center shrink-0">
              {patient.initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900">{patient.name}</h2>
              <p className="text-sm text-surface-500 mt-0.5">
                {patient.age ? `${patient.age} yrs` : ''}{patient.gender ? ` · ${patient.gender}` : ''} · {conditionName}
              </p>
              {carePlan && (
                <p className="text-xs text-surface-600 mt-1">
                  {carePlan.phase_name || carePlan.title}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={(riskColor as any)[riskLevel]}>{riskLevel} risk</span>
            
            {latestReport && (
              <button onClick={() => setShowInsightsModal(true)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 ml-2 mr-2 border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100">
                <Activity className="w-3.5 h-3.5" />
                View AI Insights
              </button>
            )}

            <div className="text-right border-l border-surface-200 pl-4">
              <div className="flex items-end gap-2 justify-end">
                <div className={clsx('text-2xl font-bold', scoreColor(score))}>{score !== null ? `${score}%` : '—'}</div>
                {patient.scoreStatus && (
                  <div className={clsx('text-xs px-2 py-0.5 rounded-full mb-1', 
                    patient.scoreStatus === 'Excellent' ? 'bg-success-500/10 text-success-600' :
                    patient.scoreStatus === 'On Track' ? 'bg-brand-500/10 text-brand-600' :
                    patient.scoreStatus === 'Needs Attention' ? 'bg-warning-500/10 text-warning-600' : 'bg-danger-500/10 text-danger-600')}>
                    {patient.scoreStatus}
                  </div>
                )}
              </div>
              <div className="text-xs text-surface-600">recovery score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts?.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <div key={a.id} className={clsx('flex items-start gap-3 px-4 py-3 rounded-xl text-sm border', severityColor[a.severity as keyof typeof severityColor])}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.title}</p>
                {a.description && <p className="text-xs opacity-75 mt-0.5">{a.description}</p>}
              </div>
              <button
                onClick={() => handleResolveAlert(a.id)}
                disabled={resolvingId === a.id}
                className="ml-auto text-brand-400 hover:text-brand-300 text-xs shrink-0 disabled:opacity-50"
              >
                {resolvingId === a.id ? 'Resolving…' : 'Resolve'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="glass p-5 rounded-2xl">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Recovery Trajectory</h3>
            {patient.scoreTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={patient.scoreTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', background: '#fff', color: '#334155'}} />
                  <Area type="monotone" dataKey="score" stroke="#14b8a6" fill="url(#scoreGrad2)" strokeWidth={2} dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-surface-600 text-sm">No recovery scores yet</div>
            )}
          </div>

          <div className="glass p-5 rounded-2xl">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Pain & Mood Trend</h3>
            {painTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={painTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="painGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pain" stroke="#f43f5e" fill="url(#painGrad2)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-surface-600 text-sm">No recovery logs yet</div>
            )}
          </div>

        </div>

        <div className="glass p-5 rounded-2xl space-y-4">
          {[
            { icon: Pill,     label: 'Med Adherence',      value: stats.medAdherence !== null ? `${stats.medAdherence}%` : '—', color: stats.medAdherence >= 80 ? 'text-success-500' : 'text-warning-500' },
            { icon: Dumbbell, label: 'Exercise Adherence', value: stats.exAdherence !== null ? `${stats.exAdherence}%` : '—',  color: stats.exAdherence >= 80 ? 'text-success-500' : 'text-warning-500' },
            { icon: Activity, label: 'Avg Sleep',          value: stats.avgSleep ? `${stats.avgSleep}h` : '—',                  color: 'text-indigo-400' },
            { icon: AlertTriangle, label: 'Active Alerts', value: alerts?.length ?? 0,                                          color: alerts?.length > 0 ? 'text-danger-400' : 'text-success-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center">
                <s.icon className="w-4 h-4 text-surface-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-surface-500">{s.label}</p>
                <p className={clsx('text-sm font-bold', s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appointments */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-warning-500" /> Appointments
          </h3>
          <button onClick={() => setShowApptModal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {appointments?.length === 0 ? (
          <div className="text-center py-6 text-surface-600 text-sm">No appointments yet. Click Add to schedule one.</div>
        ) : (
          <div className="space-y-2">
            {appointments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 text-sm">
                <div className={clsx('w-2 h-8 rounded-full shrink-0',
                  a.status === 'completed' ? 'bg-slate-600' :
                  a.status === 'cancelled' ? 'bg-danger-600' :
                  a.appointment_type === 'telehealth' ? 'bg-indigo-500' : 'bg-brand-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 truncate">{a.title || 'Appointment'}</p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {format(new Date(a.scheduled_at), 'MMM d, yyyy h:mm a')} · {a.duration_mins}min · {a.appointment_type}
                  </p>
                </div>
                <span className={clsx('text-xs px-2 py-1 rounded-lg',
                  a.status === 'completed' ? 'bg-success-500/10 text-success-500' :
                  a.status === 'cancelled' ? 'bg-danger-500/10 text-danger-400' :
                  'bg-brand-500/10 text-brand-400'
                )}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medications */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-brand-400" /> Active Medications
          </h3>
          <button onClick={() => setShowMedModal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Prescribe
          </button>
        </div>
        {medications?.length === 0 ? (
          <div className="text-center py-6 text-surface-600 text-sm">No active medications. Click Prescribe to add one.</div>
        ) : (
          <div className="space-y-2">
            {medications.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">{m.name}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{m.dosage} · {m.frequency} · {m.times_per_day}x/day</p>
                </div>
                <button
                  onClick={() => handleStopMed(m.id)}
                  disabled={stoppingMed === m.id}
                  className="text-xs text-danger-400 hover:text-danger-300 disabled:opacity-50 shrink-0"
                >
                  {stoppingMed === m.id ? 'Stopping…' : 'Stop'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => setShowApptModal(true)} className="btn-primary text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Schedule Appointment
        </button>
        <button onClick={() => setShowMedModal(true)} className="btn-secondary text-sm flex items-center gap-2">
          <Pill className="w-4 h-4" /> Prescribe Medication
        </button>
        <Link to="/doctor/care-plans/new" state={{ patientId: patient.patientId }} className="btn-secondary text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Care Plan
        </Link>
      </div>
    </div>
  )
}
