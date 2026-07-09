import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertCircle, Loader2, Activity } from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { fetchCarePlan } from '@/services/patient'

const phaseStatusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: 'Upcoming', cls: 'badge-yellow', icon: Clock },
  active: { label: 'Active', cls: 'badge-blue', icon: Activity },
  completed: { label: 'Completed', cls: 'badge-green', icon: CheckCircle2 },
  skipped: { label: 'Skipped', cls: 'badge-red', icon: AlertCircle },
}

export default function CarePlan() {
  const [carePlan, setCarePlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCarePlan()
      .then(setCarePlan)
      .catch(() => toast.error('Failed to load care plan'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        <p className="text-sm text-surface-400">Loading care plan…</p>
      </div>
    </div>
  )

  if (!carePlan) return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-surface-900">Care Plan</h2>
        <p className="text-sm text-surface-400 mt-0.5">Your personalised recovery roadmap</p>
      </div>
      <div className="card p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-7 h-7 text-surface-400" />
        </div>
        <p className="text-surface-600 text-sm font-medium mb-1">No active care plan</p>
        <p className="text-surface-400 text-xs">Your doctor will create and assign a care plan to you.</p>
      </div>
    </div>
  )

  const phases: any[] = carePlan.phases ?? []
  const goals: any[] = carePlan.goals ?? []
  const completedPhases = phases.filter((p: any) => p.status === 'completed').length

  const startDate = carePlan.start_date ? new Date(carePlan.start_date) : null
  const endDate = carePlan.end_date ? new Date(carePlan.end_date) : null
  const today = new Date()
  const totalDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) : null
  const elapsedDays = startDate ? Math.ceil((today.getTime() - startDate.getTime()) / 86400000) : null
  const progressPct = totalDays && elapsedDays ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-surface-900">Care Plan</h2>
        <p className="text-sm text-surface-400 mt-0.5">Your personalised recovery roadmap</p>
      </div>

      {/* Plan overview */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-surface-900 text-lg">{carePlan.title}</h3>
            {carePlan.condition_name && (
              <p className="text-sm text-surface-500 mt-0.5">
                Condition: <span className="text-brand-600 font-medium">{carePlan.condition_name}</span>
                {carePlan.icd_code && <span className="text-surface-400"> ({carePlan.icd_code})</span>}
              </p>
            )}
            {carePlan.doctor_name && (
              <p className="text-xs text-surface-400 mt-1">
                Dr. {carePlan.doctor_name} · {carePlan.specialty}
              </p>
            )}
          </div>
          <span className="badge-blue">Active</span>
        </div>

        {carePlan.description && (
          <p className="text-sm text-surface-500 mb-5 leading-relaxed">{carePlan.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-surface-50 border border-surface-200 p-3 rounded-xl text-center">
            <p className="text-xl font-bold text-surface-900 tabular-nums">{carePlan.duration_weeks ?? '?'}</p>
            <p className="text-xs text-surface-400 mt-0.5">Weeks total</p>
          </div>
          <div className="bg-brand-50 border border-brand-100 p-3 rounded-xl text-center">
            <p className="text-xl font-bold text-brand-600 tabular-nums">{completedPhases}</p>
            <p className="text-xs text-surface-400 mt-0.5">Phases done</p>
          </div>
          <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl text-center">
            <p className="text-xl font-bold text-teal-600 tabular-nums">{progressPct}%</p>
            <p className="text-xs text-surface-400 mt-0.5">Progress</p>
          </div>
        </div>

        {startDate && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-surface-400">
              <span>{format(startDate, 'd MMM yyyy')}</span>
              {endDate && <span>{format(endDate, 'd MMM yyyy')}</span>}
            </div>
            <div className="progress-track">
              <div className="progress-blue" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-800 mb-4">Treatment Goals</h3>
          <ul className="space-y-2.5">
            {goals.map((g: any, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-surface-600">
                <div className="w-5 h-5 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-brand-500" />
                </div>
                {typeof g === 'string' ? g : g.goal ?? JSON.stringify(g)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phases timeline */}
      {phases.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-800 mb-5">Recovery Phases</h3>
          <div className="space-y-4">
            {phases.map((phase: any, idx: number) => {
              const cfg = phaseStatusConfig[phase.status] ?? phaseStatusConfig.pending
              const phaseGoals: any[] = phase.goals ?? []

              return (
                <div key={phase.id} className={clsx(
                  'relative pl-7 pb-4',
                  idx < phases.length - 1 && 'border-l-2 border-surface-200 ml-2.5'
                )}>
                  <div className={clsx(
                    'absolute left-0 top-0 w-5 h-5 rounded-full border-2 -translate-x-1/2 flex items-center justify-center',
                    phase.status === 'completed'
                      ? 'bg-success-500 border-success-500'
                      : phase.status === 'active'
                        ? 'bg-brand-600 border-brand-600'
                        : 'bg-white border-surface-300'
                  )}>
                    {phase.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                    {phase.status === 'active' && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  </div>

                  <div className={clsx(
                    'bg-surface-50 border rounded-xl p-4 ml-2',
                    phase.status === 'active'
                      ? 'border-brand-200 bg-brand-50/50'
                      : 'border-surface-200'
                  )}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-semibold text-surface-800">
                        Phase {phase.phase_order}: {phase.name}
                      </h4>
                      <span className={cfg.cls}>{cfg.label}</span>
                    </div>
                    {phase.description && (
                      <p className="text-xs text-surface-500 mb-2 leading-relaxed">{phase.description}</p>
                    )}
                    {(phase.start_date || phase.end_date) && (
                      <p className="text-xs text-surface-400">
                        {phase.start_date ? format(new Date(phase.start_date), 'd MMM') : '?'}
                        {' – '}
                        {phase.end_date ? format(new Date(phase.end_date), 'd MMM yyyy') : 'TBD'}
                        {phase.duration_days && ` · ${phase.duration_days} days`}
                      </p>
                    )}
                    {phaseGoals.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {phaseGoals.map((g: any, i: number) => (
                          <li key={i} className="text-xs text-surface-500 flex items-start gap-1.5">
                            <span className="text-brand-400 mt-0.5 font-bold shrink-0">›</span>
                            {typeof g === 'string' ? g : g.goal ?? JSON.stringify(g)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
