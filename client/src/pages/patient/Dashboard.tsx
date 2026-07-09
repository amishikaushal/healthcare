import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { fetchDashboard } from '@/services/patient'
import {
  HeartPulse, Pill, Activity, Moon, TrendingUp, TrendingDown,
  CheckCircle2, ChevronRight, Zap, Calendar, Loader2, Sparkles,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { format, differenceInDays } from 'date-fns'

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, trend, iconBg, iconColor }: {
  icon: any; label: string; value: string | number
  sub?: string; trend?: 'up' | 'down' | null
  iconBg: string; iconColor: string
}) {
  return (
    <div className="card-hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={clsx('w-5 h-5', iconColor)} />
        </div>
        {trend && (
          <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            trend === 'up'
              ? 'bg-success-50 text-success-600'
              : 'bg-danger-50 text-danger-600')}>
            {trend === 'up'
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-surface-900 mb-0.5 tabular-nums">{value}</div>
      <div className="text-sm text-surface-500">{label}</div>
      {sub && <div className="text-xs text-surface-400 mt-1">{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-200 shadow-card-md px-3 py-2.5 rounded-xl text-xs">
      <p className="text-surface-500 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 mb-0.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.dataKey === 'pain' ? 'Pain' : 'Mood'}: <strong>{p.value}/10</strong>
        </p>
      ))}
    </div>
  )
}

// ── AI Insights card ──────────────────────────────────────────────────────────
function AIInsightsCard({ alerts }: { alerts: any[] }) {
  const hasAlerts = alerts && alerts.length > 0
  return (
    <div className="card p-5 border-teal-100 bg-gradient-to-br from-teal-50/60 to-blue-50/40">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-surface-800">AI Recovery Insights</h3>
          <p className="text-xs text-surface-400">Personalised recommendations</p>
        </div>
        <Link to="/ai-assistant" className="ml-auto text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors">
          Ask AI <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {hasAlerts ? (
        <div className="space-y-2.5">
          {alerts.map((a: any) => (
            <div key={a.id} className={clsx(
              'flex items-start gap-3 p-3 rounded-xl text-sm',
              a.severity === 'high' || a.severity === 'critical'
                ? 'bg-amber-50 border border-amber-100'
                : 'bg-blue-50 border border-blue-100'
            )}>
              <AlertTriangle className={clsx('w-4 h-4 shrink-0 mt-0.5',
                a.severity === 'high' || a.severity === 'critical'
                  ? 'text-amber-500' : 'text-brand-500')} />
              <div>
                <p className={clsx('font-medium text-xs',
                  a.severity === 'high' || a.severity === 'critical'
                    ? 'text-amber-700' : 'text-brand-700')}>{a.title}</p>
                <p className="text-xs text-surface-500 mt-0.5">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[
            'Keep up your current medication schedule — adherence is key.',
            'Consider logging your recovery daily for accurate insights.',
            'Ask your AI assistant about today\'s exercises.',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-surface-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message, cta, to }: { message: string; cta: string; to: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
        <Activity className="w-5 h-5 text-surface-400" />
      </div>
      <p className="text-surface-500 text-sm mb-3">{message}</p>
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
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        <p className="text-sm text-surface-400">Loading your dashboard…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="card p-8 text-center">
      <AlertTriangle className="w-8 h-8 text-warning-500 mx-auto mb-3" />
      <p className="text-surface-600 text-sm">{error}</p>
    </div>
  )

  const {
    today, recoveryScore, weekTrend, scoreTrend, medications, medicationStats,
    exercises, exerciseStats, nextAppointment, alerts, carePlan,
  } = data || {}

  const scoreVal = recoveryScore?.score ?? 0
  const scoreData = [{ name: 'Score', value: scoreVal }]

  const planSubtitle = carePlan
    ? `Week ${carePlan.weekNumber ?? '?'} of ${carePlan.title}${carePlan.phaseName ? ` · ${carePlan.phaseName}` : ''}`
    : 'No active care plan'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">
            {greeting}, {user?.firstName} 👋
          </h2>
          <p className="text-surface-400 text-sm mt-1">{planSubtitle}</p>
        </div>
        <Link to="/recovery-log" className="btn-primary text-sm">
          {today?.hasLoggedToday ? 'Update Log' : 'Log Today'}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* AI Insights card (replaces raw alert banners) */}
      <AIInsightsCard alerts={alerts ?? []} />

      {/* Next appointment banner */}
      {nextAppointment && (
        <div className="card p-4 flex items-center gap-3 border-brand-100 bg-brand-50/50">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-sm text-surface-700 flex-1">
            <span className="font-semibold text-brand-700">Next appointment</span> in{' '}
            {differenceInDays(new Date(nextAppointment.scheduledAt), new Date())} days
            &mdash; {nextAppointment.doctorName} &middot;{' '}
            {format(new Date(nextAppointment.scheduledAt), 'EEE d MMM, h:mm a')}
          </p>
          <Link to="/appointments" className="btn-secondary text-xs py-1.5 px-3 shrink-0">View</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={HeartPulse} label="Pain Level"
          value={today?.painLevel != null ? `${today.painLevel}/10` : '—'}
          sub={today?.hasLoggedToday ? 'Logged today' : 'Not logged yet'}
          trend={today?.painLevel != null ? (today.painLevel <= 4 ? 'up' : 'down') : null}
          iconBg="bg-rose-50" iconColor="text-rose-500"
        />
        <StatCard
          icon={Activity} label="Recovery Score"
          value={scoreVal > 0 ? `${scoreVal}%` : '—'}
          sub={recoveryScore?.delta != null ? `${recoveryScore.delta > 0 ? '↑' : '↓'} ${Math.abs(recoveryScore.delta)} pts this week` : 'No score yet'}
          trend={recoveryScore?.delta != null ? (recoveryScore.delta >= 0 ? 'up' : 'down') : null}
          iconBg="bg-blue-50" iconColor="text-brand-600"
        />
        <StatCard
          icon={Pill} label="Medications"
          value={medicationStats?.total > 0 ? `${medicationStats.taken}/${medicationStats.total}` : '—'}
          sub={medicationStats?.total > 0 ? `${medicationStats.total - medicationStats.taken} remaining today` : 'No meds scheduled'}
          trend={null}
          iconBg="bg-amber-50" iconColor="text-amber-600"
        />
        <StatCard
          icon={Moon} label="Sleep"
          value={today?.sleepHours != null ? `${today.sleepHours}h` : '—'}
          sub={today?.sleepQuality != null ? `Quality: ${'★'.repeat(today.sleepQuality)}` : 'Not logged yet'}
          trend={today?.sleepHours != null ? (today.sleepHours >= 7 ? 'up' : 'down') : null}
          iconBg="bg-violet-50" iconColor="text-violet-600"
        />
      </div>

      {/* Charts & Recovery Score Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Recovery Score Card (Radial + Breakdown) */}
        <div className="card p-5 flex flex-col items-center justify-center border-t-4 border-t-brand-500">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 text-sm">Recovery Intelligence</h3>
            <Sparkles className="w-4 h-4 text-brand-500" />
          </div>
          {scoreVal > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                    data={scoreData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#f1f5f9' }}
                      dataKey="value" angleAxisId={0} 
                      fill={recoveryScore.breakdown?.status === 'Excellent' ? '#10b981' : 
                            recoveryScore.breakdown?.status === 'On Track' ? '#3b82f6' : 
                            recoveryScore.breakdown?.status === 'Needs Attention' ? '#f59e0b' : '#ef4444'} 
                      cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-surface-900 tabular-nums">{scoreVal}</span>
                </div>
              </div>
              <div className="mt-2 text-center w-full">
                <p className={clsx('text-sm font-bold',
                  recoveryScore.breakdown?.status === 'Excellent' ? 'text-success-600' :
                  recoveryScore.breakdown?.status === 'On Track' ? 'text-brand-600' :
                  recoveryScore.breakdown?.status === 'Needs Attention' ? 'text-warning-600' : 'text-danger-600')}>
                  Status: {recoveryScore.breakdown?.status || 'Unknown'}
                </p>
                {recoveryScore?.delta != null && (
                  <p className="text-xs text-surface-500 mt-1 font-medium bg-surface-50 inline-block px-2 py-0.5 rounded-full">
                    {recoveryScore.delta >= 0 ? '+' : ''}{recoveryScore.delta} pts from last week
                  </p>
                )}
              </div>
              
              {/* Score Explanation / Breakdown */}
              {recoveryScore.breakdown?.components && (
                <div className="mt-5 w-full space-y-3 pt-4 border-t border-surface-100">
                  <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Score Breakdown</h4>
                  {[
                    { label: 'Medication', val: recoveryScore.breakdown.components.medication, color: '#22c55e' },
                    { label: 'Exercise', val: recoveryScore.breakdown.components.exercise, color: '#3b82f6' },
                    { label: 'Log Completion', val: recoveryScore.breakdown.components.logCompletion, color: '#a855f7' },
                    { label: 'Pain Reduction', val: recoveryScore.breakdown.components.pain, color: '#f43f5e' },
                    { label: 'Sleep Quality', val: recoveryScore.breakdown.components.sleep, color: '#6366f1' },
                    { label: 'Appointments', val: recoveryScore.breakdown.components.appointment, color: '#eab308' },
                  ].filter(s => s.val !== null && s.val !== undefined).map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[11px] text-surface-600 mb-1">
                        <span>{s.label}</span><span className="font-semibold">{s.val}%</span>
                      </div>
                      <div className="progress-track h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className="progress-fill h-full transition-all duration-700"
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

        {/* Charts Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Recovery Trajectory (Score Trend) */}
          <div className="card p-5 flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-surface-800 text-sm">Recovery Trajectory</h3>
                <p className="text-xs text-surface-400 mt-0.5">Your overall recovery score over the last 7 days</p>
              </div>
            </div>
            {scoreTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={scoreTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="score" stroke="#14b8a6" fill="url(#scoreGrad)" strokeWidth={3} dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-xs text-surface-400">Not enough data to show trajectory.</div>
            )}
          </div>

          {/* Pain & Mood trend */}
          <div className="card p-5 flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-surface-800 text-sm">Pain & Mood</h3>
                <p className="text-xs text-surface-400 mt-0.5">Daily tracking</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-surface-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />Pain
                </span>
                <span className="flex items-center gap-1.5 text-surface-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-400 inline-block" />Mood
                </span>
              </div>
            </div>
            {weekTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weekTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pain" stroke="#f43f5e" fill="url(#painGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="mood" stroke="#3b82f6" fill="url(#moodGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-xs text-surface-400">Not enough data.</div>
            )}
          </div>
          
        </div>
      </div>

      {/* Medications & Exercises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Medications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <Pill className="w-3.5 h-3.5 text-amber-600" />
              </span>
              Today's Medications
            </h3>
            <Link to="/medications" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {medications?.length > 0 ? (
            <div className="space-y-2">
              {medications.slice(0, 4).map((m: any) => {
                const taken = m.takenCount >= m.timesPerDay
                return (
                  <div key={m.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    taken ? 'bg-success-50 border border-success-100' : 'bg-surface-50 border border-surface-100'
                  )}>
                    <div className={clsx('w-2 h-2 rounded-full shrink-0',
                      taken ? 'bg-success-500' : 'bg-brand-400')} />
                    <div className="flex-1">
                      <p className={clsx('text-sm font-medium', taken ? 'text-surface-400 line-through' : 'text-surface-700')}>
                        {m.name}
                      </p>
                      <p className="text-xs text-surface-400">{m.dosage} · {m.frequency}</p>
                    </div>
                    {taken
                      ? <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-surface-300 shrink-0" />}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="No medications scheduled." cta="View medications" to="/medications" />
          )}
        </div>

        {/* Today's Exercises */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-brand-600" />
              </span>
              Today's Exercises
            </h3>
            <Link to="/exercises" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {exercises?.length > 0 ? (
            <>
              <div className="space-y-2">
                {exercises.slice(0, 4).map((e: any) => (
                  <div key={e.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    e.completed ? 'bg-success-50 border border-success-100' : 'bg-surface-50 border border-surface-100'
                  )}>
                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      e.completed ? 'bg-success-100' : 'bg-blue-50')}>
                      <Zap className={clsx('w-3.5 h-3.5', e.completed ? 'text-success-600' : 'text-brand-500')} />
                    </div>
                    <div className="flex-1">
                      <p className={clsx('text-sm font-medium', e.completed ? 'text-surface-400' : 'text-surface-700')}>
                        {e.name}
                      </p>
                      <p className="text-xs text-surface-400">{e.sets} sets × {e.reps} reps</p>
                    </div>
                    {e.completed && <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-surface-500">
                <span className="font-medium">{exerciseStats?.done ?? 0}/{exerciseStats?.total ?? 0} completed</span>
                <div className="progress-track w-28">
                  <div className="progress-teal"
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
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex flex-col items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-800">Upcoming: {nextAppointment.title}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              {nextAppointment.doctorName} · {nextAppointment.specialty} ·{' '}
              {format(new Date(nextAppointment.scheduledAt), 'EEE, d MMM · h:mm a')} ·{' '}
              {nextAppointment.type === 'telehealth' ? 'Telehealth' : nextAppointment.location || 'In-person'}
            </p>
          </div>
          <Link to="/appointments" className="btn-secondary text-xs py-2 px-3">View</Link>
        </div>
      ) : (
        <div className="card p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 shrink-0 text-surface-400" />
          <span className="text-sm text-surface-500">No upcoming appointments</span>
          <Link to="/appointments" className="ml-auto btn-secondary text-xs py-2 px-3">Book</Link>
        </div>
      )}
    </div>
  )
}
