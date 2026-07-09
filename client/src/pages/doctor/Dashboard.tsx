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
  high:     'bg-danger-50 border-danger-200 text-danger-700',
  medium:   'bg-warning-50 border-warning-200 text-warning-700',
  low:      'bg-success-50 border-success-200 text-success-700',
  critical: 'bg-danger-50 border-danger-200 text-danger-700',
} as const

function PatientRow({ p }: { p: any }) {
  const loggedToday = p.lastLogDate && isToday(new Date(p.lastLogDate))
  return (
    <Link to={`/doctor/patients/${p.patientId}`}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 transition-colors group">
      <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 text-sm font-bold flex items-center justify-center shrink-0">
        {p.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-900">{p.name}</span>
          {!p.isAssigned && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-600 border border-brand-200 font-bold uppercase tracking-wider">New</span>
          )}
          {p.alertCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-danger-600 text-white text-[10px] flex items-center justify-center font-bold shadow-sm">
              {p.alertCount}
            </span>
          )}
        </div>
        <p className="text-xs text-surface-500 mt-0.5 truncate">
          {p.conditionName}{p.phaseName ? ` · ${p.phaseName}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          {p.score !== null ? (
            <>
              <div className={clsx('text-sm font-bold', p.score >= 80 ? 'text-success-600' : p.score >= 60 ? 'text-warning-600' : 'text-danger-600')}>
                {p.score}%
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">score</div>
            </>
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mt-1">No score</div>
          )}
        </div>
        <span className={riskColor[p.riskLevel as keyof typeof riskColor]}>{p.riskLevel}</span>
        <div className="flex items-center gap-1 text-xs font-medium text-surface-500 w-16">
          {loggedToday
            ? <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
            : <XCircle className="w-3.5 h-3.5 text-danger-500" />}
          <span className="hidden md:inline">{loggedToday ? 'Logged' : 'No log'}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-surface-500 transition-colors" />
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
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-danger-600 font-medium text-sm">{error}</p>
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
    { label: 'Active Patients',    value: stats.totalPatients,          icon: Users,        color: 'bg-brand-50 text-brand-600 border border-brand-100',   trend: `${patients?.length || 0} assigned` },
    { label: 'Alerts Today',       value: stats.alertCount,             icon: AlertTriangle,color: 'bg-danger-50 text-danger-600 border border-danger-100',  trend: `${stats.alertCount} unresolved` },
    { label: 'Appointments Today', value: stats.todayAppointments,      icon: Calendar,     color: 'bg-warning-50 text-warning-600 border border-warning-100', trend: `${todayAppointments?.length || 0} scheduled` },
    { label: 'Avg Recovery Score', value: stats.avgRecoveryScore ? `${stats.avgRecoveryScore}%` : '—', icon: TrendingUp, color: 'bg-success-50 text-success-600 border border-success-100', trend: 'across all patients' },
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {user?.lastName} 👋
          </h2>
          <p className="text-surface-500 text-[13px] font-medium mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')} <span className="mx-1 opacity-50">·</span> {stats.todayAppointments} appointment{stats.todayAppointments !== 1 ? 's' : ''} today
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-[13px] font-medium flex items-center gap-2 py-2.5 px-4 shadow-sm hover:shadow-md transition-shadow">
          <RefreshCw className="w-3.5 h-3.5 text-surface-400" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="card hover:shadow-card-hover hover:border-surface-300 transition-all cursor-default p-5">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-4', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-surface-900 tracking-tight">{s.value}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mt-1">{s.label}</div>
            <div className="text-[12px] font-medium text-surface-500 mt-1">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient list */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-surface-900 text-[15px] flex items-center gap-2 tracking-tight">
              <Users className="w-4 h-4 text-brand-500" /> My Patients
              <span className="ml-1 text-[13px] font-medium text-surface-500">({filtered.length})</span>
            </h3>
            <Link to="/doctor/patients" className="text-[13px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2.5 bg-surface-50 rounded-xl px-3.5 py-2.5 border border-surface-200 focus-within:border-brand-300 focus-within:bg-white focus-within:shadow-sm transition-all">
              <Search className="w-4 h-4 text-surface-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search patients by name or condition…"
                className="bg-transparent text-[13px] font-medium text-surface-900 placeholder-surface-400 outline-none flex-1" />
            </div>
          </div>

          <div className="space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-surface-200 rounded-xl bg-surface-50/50 mt-2">
                <Users className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                <p className="text-[14px] font-bold text-surface-600">No patients found</p>
                <p className="text-[13px] font-medium text-surface-400 mt-1">Patients appear here after you assign a care plan.</p>
              </div>
            ) : (
              filtered.slice(0, 6).map((p: any) => <PatientRow key={p.patientId} p={p} />)
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Today's schedule */}
          <div className="card p-6">
            <h3 className="font-bold text-surface-900 text-[15px] flex items-center gap-2 mb-5 tracking-tight">
              <Calendar className="w-4 h-4 text-warning-500" /> Today's Schedule
            </h3>
            <div className="space-y-3">
              {todayAppointments?.length === 0 ? (
                <p className="text-[13px] font-medium text-surface-400 text-center py-6 bg-surface-50 border border-dashed border-surface-200 rounded-xl">No appointments today</p>
              ) : (
                todayAppointments?.map((a: any) => (
                  <div key={a.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl text-[13px] border',
                    a.status === 'completed' ? 'opacity-60 bg-surface-50 border-surface-100' : 'bg-white border-surface-200 shadow-sm'
                  )}>
                    <div className={clsx('w-1.5 h-8 rounded-full shrink-0',
                      a.status === 'completed' ? 'bg-surface-300'
                      : a.appointment_type === 'telehealth' ? 'bg-indigo-500' : 'bg-brand-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-surface-800 truncate tracking-tight">{a.patient_name}</p>
                      <p className="text-surface-500 font-medium mt-0.5">
                        {format(new Date(a.scheduled_at), 'h:mm a')} <span className="opacity-50">·</span> {a.duration_mins}m <span className="opacity-50">·</span> <span className="capitalize">{a.appointment_type}</span>
                      </p>
                    </div>
                    {a.status === 'completed'
                      ? <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                      : <Clock className="w-4 h-4 text-surface-300 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="card p-6">
            <h3 className="font-bold text-surface-900 text-[15px] flex items-center gap-2 mb-5 tracking-tight">
              <AlertTriangle className="w-4 h-4 text-danger-500" /> Risk Alerts
              {alerts?.length > 0 && (
                <span className="ml-auto badge-red">{alerts.length}</span>
              )}
            </h3>
            <div className="space-y-3">
              {alerts?.length === 0 ? (
                <div className="text-center py-6 bg-surface-50 border border-dashed border-surface-200 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-success-500/80 mx-auto mb-2" />
                  <p className="text-[13px] font-medium text-surface-500">All clear — no active alerts</p>
                </div>
              ) : (
                alerts?.slice(0, 4).map((a: any) => (
                  <div key={a.id} className={clsx('p-4 rounded-xl border text-[13px] shadow-sm', severityColor[a.severity as keyof typeof severityColor])}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold tracking-tight text-[14px]">{a.patient_name}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="font-medium opacity-90 leading-relaxed">{a.title}</p>
                    <button
                      onClick={() => handleResolveAlert(a.patient_id, a.id)}
                      disabled={resolvingId === a.id}
                      className="mt-3 text-[12px] font-bold tracking-wide flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      {resolvingId === a.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Resolving…</> : <>Resolve <ChevronRight className="w-3.5 h-3.5"/></>}
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
