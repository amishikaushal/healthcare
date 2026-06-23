import { useState, useEffect } from 'react'
import {
  Users, AlertTriangle, Calendar, TrendingUp,
  ChevronRight, Clock, Search,
  CheckCircle2, XCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { format, isToday, formatDistanceToNow } from 'date-fns'
import { fetchDoctorDashboard, resolveAlert } from '@/services/doctor'
import { useAuthStore } from '@/store/authStore'

const riskColor = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' } as const
const severityColor = {
  high:     'bg-danger-500/10 border-danger-500/30 text-danger-400',
  medium:   'bg-warning-500/10 border-warning-500/30 text-warning-500',
  low:      'bg-success-500/10 border-success-500/30 text-success-500',
  critical: 'bg-danger-500/10 border-danger-500/30 text-danger-400',
} as const

function PatientRow({ p }: { p: any }) {
  const loggedToday = p.lastLogDate && isToday(new Date(p.lastLogDate))
  return (
    <Link to={`/doctor/patients/${p.patientId}`}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/60 transition-colors group">
      <div className="w-9 h-9 rounded-xl bg-brand-600/30 text-brand-300 text-sm font-bold flex items-center justify-center shrink-0">
        {p.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{p.name}</span>
          {!p.isAssigned && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30 font-medium">New</span>
          )}
          {p.alertCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-danger-600 text-white text-[10px] flex items-center justify-center font-bold">
              {p.alertCount}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {p.conditionName}{p.phaseName ? ` · ${p.phaseName}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          {p.score !== null ? (
            <>
              <div className={clsx('text-sm font-bold', p.score >= 80 ? 'text-success-500' : p.score >= 60 ? 'text-warning-500' : 'text-danger-500')}>
                {p.score}%
              </div>
              <div className="text-xs text-slate-600">score</div>
            </>
          ) : (
            <div className="text-xs text-slate-600">No score</div>
          )}
        </div>
        <span className={riskColor[p.riskLevel as keyof typeof riskColor]}>{p.riskLevel}</span>
        <div className="flex items-center gap-1 text-xs text-slate-600">
          {loggedToday
            ? <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
            : <XCircle className="w-3.5 h-3.5 text-danger-500" />}
          <span className="hidden md:inline">{loggedToday ? 'Logged' : 'No log'}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </Link>
  )
}

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await fetchDoctorDashboard()
      setData(d)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleResolveAlert = async (patientId: string, alertId: string) => {
    setResolvingId(alertId)
    try {
      await resolveAlert(patientId, alertId, 'Reviewed by doctor')
      setData((prev: any) => ({
        ...prev,
        alerts: prev.alerts.filter((a: any) => a.id !== alertId),
        stats: { ...prev.stats, alertCount: Math.max(0, prev.stats.alertCount - 1) },
      }))
    } catch {
      // ignore
    } finally {
      setResolvingId(null)
    }
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

  const { stats, patients, todayAppointments, alerts } = data

  const filtered = (patients || []).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.conditionName.toLowerCase().includes(search.toLowerCase())
  )

  const statCards = [
    { label: 'Active Patients',    value: stats.totalPatients,          icon: Users,        color: 'bg-brand-600',   trend: `${patients?.length || 0} assigned` },
    { label: 'Alerts Today',       value: stats.alertCount,             icon: AlertTriangle,color: 'bg-danger-600',  trend: `${stats.alertCount} unresolved` },
    { label: 'Appointments Today', value: stats.todayAppointments,      icon: Calendar,     color: 'bg-warning-600', trend: `${todayAppointments?.length || 0} scheduled` },
    { label: 'Avg Recovery Score', value: stats.avgRecoveryScore ? `${stats.avgRecoveryScore}%` : '—', icon: TrendingUp, color: 'bg-success-600', trend: 'across all patients' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {user?.lastName} 👋
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')} · {stats.todayAppointments} appointment{stats.todayAppointments !== 1 ? 's' : ''} today
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="glass-hover p-5 rounded-2xl">
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.color)}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-600 mt-1">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient list */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" /> My Patients
              <span className="ml-1 text-xs text-slate-500">({filtered.length})</span>
            </h3>
            <Link to="/doctor/patients" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center gap-2 bg-surface-800 rounded-xl px-3 py-2 border border-surface-700">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search patients…"
                className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none flex-1" />
            </div>
          </div>

          <div className="space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No patients found</p>
                <p className="text-xs text-slate-600 mt-1">Patients appear here after you create a care plan for them</p>
              </div>
            ) : (
              filtered.slice(0, 6).map((p: any) => <PatientRow key={p.patientId} p={p} />)
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Today's schedule */}
          <div className="glass p-5 rounded-2xl">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-warning-500" /> Today's Schedule
            </h3>
            <div className="space-y-2.5">
              {todayAppointments?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">No appointments today</p>
              ) : (
                todayAppointments?.map((a: any) => (
                  <div key={a.id} className={clsx(
                    'flex items-center gap-3 p-2.5 rounded-xl text-xs',
                    a.status === 'completed' ? 'opacity-50' : 'bg-surface-800/50'
                  )}>
                    <div className={clsx('w-1.5 h-6 rounded-full shrink-0',
                      a.status === 'completed' ? 'bg-slate-600'
                      : a.appointment_type === 'telehealth' ? 'bg-indigo-500' : 'bg-brand-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-300 truncate">{a.patient_name}</p>
                      <p className="text-slate-600">
                        {format(new Date(a.scheduled_at), 'h:mm a')} · {a.duration_mins}min · {a.appointment_type}
                      </p>
                    </div>
                    {a.status === 'completed'
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-success-500 shrink-0" />
                      : <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="glass p-5 rounded-2xl">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-danger-500" /> Risk Alerts
              {alerts?.length > 0 && (
                <span className="ml-auto badge-red">{alerts.length}</span>
              )}
            </h3>
            <div className="space-y-2.5">
              {alerts?.length === 0 ? (
                <div className="text-center py-3">
                  <CheckCircle2 className="w-6 h-6 text-success-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">All clear — no active alerts</p>
                </div>
              ) : (
                alerts?.slice(0, 4).map((a: any) => (
                  <div key={a.id} className={clsx('p-3 rounded-xl border text-xs', severityColor[a.severity as keyof typeof severityColor])}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{a.patient_name}</span>
                      <span className="text-slate-600">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="opacity-80">{a.title}</p>
                    <button
                      onClick={() => handleResolveAlert(a.patient_id, a.id)}
                      disabled={resolvingId === a.id}
                      className="mt-2 text-brand-400 hover:text-brand-300 font-medium disabled:opacity-50"
                    >
                      {resolvingId === a.id ? 'Resolving…' : 'Resolve →'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
