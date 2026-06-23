import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { fetchDashboard } from '@/services/patient'
import {
  HeartPulse, Pill, Activity, Moon, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, ChevronRight, Zap, Calendar, Loader2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { format, differenceInDays } from 'date-fns'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, trend, color }: {
  icon: any; label: string; value: string | number
  sub?: string; trend?: 'up' | 'down' | null; color: string
}) {
  return (
    <div className="glass-hover p-5 rounded-2xl group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={clsx('flex items-center gap-1 text-xs font-semibold',
            trend === 'up' ? 'text-success-500' : 'text-danger-500')}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-100 mb-0.5">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'pain' ? 'Pain' : 'Mood'}: {p.value}/10
        </p>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message, cta, to }: { message: string; cta: string; to: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-slate-500 text-sm mb-3">{message}</p>
      <Link to={to} className="btn-primary text-xs">{cta}</Link>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(e => setError(e.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  if (error) return (
    <div className="glass p-6 rounded-2xl text-center">
      <AlertTriangle className="w-8 h-8 text-warning-500 mx-auto mb-2" />
      <p className="text-slate-400">{error}</p>
    </div>
  )

  const {
    today, recoveryScore, weekTrend, medications, medicationStats,
    exercises, exerciseStats, nextAppointment, alerts, carePlan,
  } = data || {}

  const scoreVal  = recoveryScore?.score ?? 0
  const scoreData = [{ name: 'Score', value: scoreVal }]

  // Build header subtitle from care plan
  const planSubtitle = carePlan
    ? `Week ${carePlan.weekNumber ?? '?'} of ${carePlan.title}${carePlan.phaseName ? ` · ${carePlan.phaseName}` : ''}`
    : 'No active care plan'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">
            {greeting}, {user?.firstName} 👋
          </h2>
          <p className="text-slate-400 text-sm mt-1">{planSubtitle}</p>
        </div>
        <Link to="/recovery-log" className="btn-primary text-sm">
          {today?.hasLoggedToday ? 'Update Log' : 'Log Today'} <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Alerts from backend */}
      {alerts?.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <div key={a.id} className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm border',
              a.severity === 'high' || a.severity === 'critical'
                ? 'bg-warning-500/10 border-warning-500/30 text-warning-500'
                : 'bg-brand-500/10 border-brand-500/30 text-brand-400'
            )}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a.title} — {a.description}
            </div>
          ))}
        </div>
      )}

      {/* Next appointment banner */}
      {nextAppointment && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border bg-brand-500/10 border-brand-500/30 text-brand-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Next appointment in {differenceInDays(new Date(nextAppointment.scheduledAt), new Date())} days
          — {nextAppointment.doctorName} · {format(new Date(nextAppointment.scheduledAt), 'EEE d MMM, h:mm a')}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={HeartPulse} label="Pain Level"
          value={today?.painLevel != null ? `${today.painLevel}/10` : '—'}
          sub={today?.hasLoggedToday ? 'Logged today' : 'Not logged yet'}
          trend={today?.painLevel != null ? (today.painLevel <= 4 ? 'up' : 'down') : null}
          color="bg-danger-600"
        />
        <StatCard
          icon={Activity} label="Recovery Score"
          value={scoreVal > 0 ? `${scoreVal}%` : '—'}
          sub={recoveryScore?.delta != null ? `${recoveryScore.delta > 0 ? '↑' : '↓'} ${Math.abs(recoveryScore.delta)} pts this week` : 'No score yet'}
          trend={recoveryScore?.delta != null ? (recoveryScore.delta >= 0 ? 'up' : 'down') : null}
          color="bg-brand-600"
        />
        <StatCard
          icon={Pill} label="Medications"
          value={medicationStats?.total > 0 ? `${medicationStats.taken}/${medicationStats.total}` : '—'}
          sub={medicationStats?.total > 0 ? `${medicationStats.total - medicationStats.taken} remaining today` : 'No meds scheduled'}
          trend={null}
          color="bg-warning-600"
        />
        <StatCard
          icon={Moon} label="Sleep"
          value={today?.sleepHours != null ? `${today.sleepHours}h` : '—'}
          sub={today?.sleepQuality != null ? `Quality: ${'★'.repeat(today.sleepQuality)}` : 'Not logged yet'}
          trend={today?.sleepHours != null ? (today.sleepHours >= 7 ? 'up' : 'down') : null}
          color="bg-indigo-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pain & Mood trend */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-200 text-sm">Pain & Mood — This Week</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lower pain, higher mood = progress</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />Pain
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-brand-400 inline-block" />Mood
              </span>
            </div>
          </div>
          {weekTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weekTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pain" stroke="#f43f5e" fill="url(#painGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="mood" stroke="#38bdf8" fill="url(#moodGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No recovery logs this week." cta="Log today" to="/recovery-log" />
          )}
        </div>

        {/* Recovery score radial */}
        <div className="glass p-5 rounded-2xl flex flex-col items-center justify-center">
          <h3 className="font-semibold text-slate-200 text-sm mb-4 self-start">Recovery Score</h3>
          {scoreVal > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                    data={scoreData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }}
                      dataKey="value" angleAxisId={0} fill="#0ea5e9" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-100">{scoreVal}</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className={clsx('text-sm font-medium',
                  scoreVal >= 70 ? 'text-success-500' : scoreVal >= 50 ? 'text-warning-500' : 'text-danger-500')}>
                  {scoreVal >= 70 ? 'Good Progress' : scoreVal >= 50 ? 'On Track' : 'Needs Attention'}
                </p>
                {recoveryScore?.delta != null && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {recoveryScore.delta >= 0 ? '+' : ''}{recoveryScore.delta} pts from last week
                  </p>
                )}
              </div>
              {recoveryScore && (
                <div className="mt-4 w-full space-y-2">
                  {[
                    { label: 'Medication', val: recoveryScore.medication ?? 0, color: '#22c55e' },
                    { label: 'Exercise',   val: recoveryScore.exercise   ?? 0, color: '#38bdf8' },
                    { label: 'Mobility',   val: recoveryScore.mobility   ?? 0, color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{s.label}</span><span>{s.val}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${s.val}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState message="No recovery score yet. Log your first day!" cta="Log today" to="/recovery-log" />
          )}
        </div>
      </div>

      {/* Medications & Exercises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Medications */}
        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-warning-500" /> Today's Medications
            </h3>
            <Link to="/medications" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {medications?.length > 0 ? (
            <div className="space-y-2.5">
              {medications.slice(0, 4).map((m: any) => {
                const taken = m.takenCount >= m.timesPerDay
                return (
                  <div key={m.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    taken ? 'bg-success-500/10' : 'bg-surface-800/50'
                  )}>
                    <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0',
                      taken ? 'bg-success-500' : 'bg-brand-500')} />
                    <div className="flex-1">
                      <p className={clsx('text-sm font-medium', taken ? 'text-slate-400 line-through' : 'text-slate-200')}>
                        {m.name}
                      </p>
                      <p className="text-xs text-slate-500">{m.dosage} · {m.frequency}</p>
                    </div>
                    {taken
                      ? <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-surface-600 shrink-0" />}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="No medications scheduled." cta="View medications" to="/medications" />
          )}
        </div>

        {/* Today's Exercises */}
        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" /> Today's Exercises
            </h3>
            <Link to="/exercises" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {exercises?.length > 0 ? (
            <>
              <div className="space-y-2.5">
                {exercises.slice(0, 4).map((e: any) => (
                  <div key={e.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    e.completed ? 'bg-success-500/10' : 'bg-surface-800/50'
                  )}>
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      e.completed ? 'bg-success-500/20' : 'bg-surface-700')}>
                      <Zap className={clsx('w-4 h-4', e.completed ? 'text-success-500' : 'text-slate-500')} />
                    </div>
                    <div className="flex-1">
                      <p className={clsx('text-sm font-medium', e.completed ? 'text-slate-400' : 'text-slate-200')}>
                        {e.name}
                      </p>
                      <p className="text-xs text-slate-500">{e.sets} sets × {e.reps} reps</p>
                    </div>
                    {e.completed && <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{exerciseStats?.done ?? 0}/{exerciseStats?.total ?? 0} completed</span>
                <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden w-32">
                  <div className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${exerciseStats?.total > 0 ? (exerciseStats.done / exerciseStats.total) * 100 : 0}%` }} />
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No exercises assigned yet. Your doctor will add them." cta="View exercises" to="/exercises" />
          )}
        </div>
      </div>

      {/* Upcoming appointment */}
      {nextAppointment ? (
        <div className="glass p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex flex-col items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-200">Upcoming: {nextAppointment.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {nextAppointment.doctorName} · {nextAppointment.specialty} ·{' '}
              {format(new Date(nextAppointment.scheduledAt), 'EEE, d MMM · h:mm a')} ·{' '}
              {nextAppointment.type === 'telehealth' ? 'Telehealth' : nextAppointment.location || 'In-person'}
            </p>
          </div>
          <Link to="/appointments" className="btn-secondary text-xs py-2 px-3">View</Link>
        </div>
      ) : (
        <div className="glass p-4 rounded-2xl flex items-center gap-3 text-slate-500">
          <Calendar className="w-5 h-5 shrink-0" />
          <span className="text-sm">No upcoming appointments</span>
          <Link to="/appointments" className="ml-auto btn-secondary text-xs py-2 px-3">Book</Link>
        </div>
      )}
    </div>
  )
}
