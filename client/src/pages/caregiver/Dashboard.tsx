import { useState, useEffect } from 'react'
import { Users, AlertTriangle, Dumbbell, Activity, ChevronRight, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { format, isToday, formatDistanceToNow } from 'date-fns'
import { fetchCaregiverDashboard } from '@/services/caregiver'
import { useAuthStore } from '@/store/authStore'

const riskColor = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' } as const
const severityColor = {
  high:     'bg-danger-500/10 border-danger-500/30 text-danger-400',
  medium:   'bg-warning-500/10 border-warning-500/30 text-warning-500',
  low:      'bg-success-500/10 border-success-500/30 text-success-500',
  critical: 'bg-danger-500/10 border-danger-500/30 text-danger-400',
} as const

function PatientCard({ p }: { p: any }) {
  const loggedToday = p.lastLogDate && isToday(new Date(p.lastLogDate))
  return (
    <Link to={`/caregiver/patients/${p.patientId}`}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-100/60 transition-colors group">
      <div className="w-9 h-9 rounded-xl bg-emerald-600/30 text-emerald-300 text-sm font-bold flex items-center justify-center shrink-0">
        {p.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-900">{p.name}</span>
          {!p.isLinked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">New</span>
          )}
          {p.alertCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-danger-600 text-white text-[10px] flex items-center justify-center font-bold">{p.alertCount}</span>
          )}
        </div>
        <p className="text-xs text-surface-500 mt-0.5 truncate">
          {p.conditionName}{p.relationship ? ` · ${p.relationship}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          {p.score !== null ? (
            <>
              <div className={clsx('text-sm font-bold', p.score >= 80 ? 'text-success-500' : p.score >= 60 ? 'text-warning-500' : 'text-danger-500')}>
                {p.score}%
              </div>
              <div className="text-xs text-surface-600">score</div>
            </>
          ) : (
            <div className="text-xs text-surface-600">No data</div>
          )}
        </div>
        <span className={riskColor[p.riskLevel as keyof typeof riskColor]}>{p.riskLevel}</span>
        <div className="flex items-center gap-1 text-xs text-surface-600">
          {loggedToday ? <CheckCircle2 className="w-3.5 h-3.5 text-success-500" /> : <XCircle className="w-3.5 h-3.5 text-danger-500" />}
        </div>
        <ChevronRight className="w-4 h-4 text-surface-600 group-hover:text-surface-500 transition-colors" />
      </div>
    </Link>
  )
}

export default function CaregiverDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const d = await fetchCaregiverDashboard()
      setData(d)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load dashboard')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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

  const { stats, patients, alerts } = data
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const statCards = [
    { label: 'Total Patients',   value: stats.totalPatients,             icon: Users,        color: 'bg-emerald-600' },
    { label: 'Linked Patients',  value: stats.linkedCount,               icon: Activity,     color: 'bg-brand-600' },
    { label: 'Active Alerts',    value: stats.alertCount,                icon: AlertTriangle,color: 'bg-danger-600' },
    { label: 'Exercises Today',  value: `${stats.exerciseStats.completed}/${stats.exerciseStats.total}`, icon: Dumbbell, color: 'bg-success-600' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">
            Good {greeting}, {user?.firstName} 👋
          </h2>
          <p className="text-surface-500 text-sm mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')} · Caregiver Dashboard
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
            <div className="text-2xl font-bold text-surface-900">{s.value}</div>
            <div className="text-xs text-surface-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient list */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> My Patients
              <span className="text-xs text-surface-500">({patients?.length ?? 0})</span>
            </h3>
            <Link to="/caregiver/patients" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {patients?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-surface-500">No patients yet</p>
                <p className="text-xs text-surface-600 mt-1">Patients appear here once they register</p>
              </div>
            ) : (
              patients.slice(0, 6).map((p: any) => <PatientCard key={p.patientId} p={p} />)
            )}
          </div>
        </div>

        {/* Risk Alerts */}
        <div className="glass p-5 rounded-2xl">
          <h3 className="font-semibold text-surface-900 text-sm flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-danger-500" /> Risk Alerts
            {alerts?.length > 0 && <span className="ml-auto badge-red">{alerts.length}</span>}
          </h3>
          <div className="space-y-2.5">
            {alerts?.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-6 h-6 text-success-500 mx-auto mb-1" />
                <p className="text-xs text-surface-500">No active alerts</p>
              </div>
            ) : (
              alerts.slice(0, 5).map((a: any) => (
                <div key={a.id} className={clsx('p-3 rounded-xl border text-xs', severityColor[a.severity as keyof typeof severityColor])}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{a.patient_name}</span>
                    <span className="text-surface-600 text-[10px]">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="opacity-80">{a.title}</p>
                  <Link to={`/caregiver/patients/${a.patient_id}`} className="mt-1.5 text-brand-400 hover:text-brand-300 font-medium block">
                    View patient →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
