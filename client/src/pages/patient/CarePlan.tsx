import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertCircle, Loader2, Activity } from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { fetchCarePlan } from '@/services/patient'

const phaseStatusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  pending:   { label: 'Upcoming',  cls: 'badge-yellow', icon: Clock },
  active:    { label: 'Active',    cls: 'badge-blue',   icon: Activity },
  completed: { label: 'Completed', cls: 'badge-green',  icon: CheckCircle2 },
  skipped:   { label: 'Skipped',   cls: 'badge-red',    icon: AlertCircle },
}

export default function CarePlan() {
  const [carePlan, setCarePlan] = useState<any>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetchCarePlan()
      .then(setCarePlan)
      .catch(() => toast.error('Failed to load care plan'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  if (!carePlan) return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Care Plan</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your personalised recovery roadmap</p>
      </div>
      <div className="glass p-8 rounded-2xl text-center">
        <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm mb-1">No active care plan</p>
        <p className="text-slate-600 text-xs">Your doctor will create and assign a care plan to you.</p>
      </div>
    </div>
  )

  const phases: any[] = carePlan.phases ?? []
  const goals: any[]  = carePlan.goals  ?? []
  const completedPhases = phases.filter((p: any) => p.status === 'completed').length

  const startDate    = carePlan.start_date ? new Date(carePlan.start_date) : null
  const endDate      = carePlan.end_date   ? new Date(carePlan.end_date)   : null
  const today        = new Date()
  const totalDays    = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) : null
  const elapsedDays  = startDate ? Math.ceil((today.getTime() - startDate.getTime()) / 86400000) : null
  const progressPct  = totalDays && elapsedDays ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Care Plan</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your personalised recovery roadmap</p>
      </div>

      {/* Plan overview */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-100 text-lg">{carePlan.title}</h3>
            {carePlan.condition_name && (
              <p className="text-sm text-slate-400 mt-0.5">
                Condition: <span className="text-brand-400">{carePlan.condition_name}</span>
                {carePlan.icd_code && <span className="text-slate-600"> ({carePlan.icd_code})</span>}
              </p>
            )}
            {carePlan.doctor_name && (
              <p className="text-xs text-slate-500 mt-1">
                Dr. {carePlan.doctor_name} · {carePlan.specialty}
              </p>
            )}
          </div>
          <span className="badge-blue text-xs">Active</span>
        </div>

        {carePlan.description && (
          <p className="text-sm text-slate-400 mb-4">{carePlan.description}</p>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="glass p-3 rounded-xl text-center">
            <p className="text-lg font-bold text-slate-100">{carePlan.duration_weeks ?? '?'}</p>
            <p className="text-xs text-slate-500">Weeks total</p>
          </div>
          <div className="glass p-3 rounded-xl text-center">
            <p className="text-lg font-bold text-brand-400">{completedPhases}</p>
            <p className="text-xs text-slate-500">Phases done</p>
          </div>
          <div className="glass p-3 rounded-xl text-center">
            <p className="text-lg font-bold text-success-500">{progressPct}%</p>
            <p className="text-xs text-slate-500">Progress</p>
          </div>
        </div>

        {startDate && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{format(startDate, 'd MMM yyyy')}</span>
              {endDate && <span>{format(endDate, 'd MMM yyyy')}</span>}
            </div>
            <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-600 to-sky-400 rounded-full transition-all"
                style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="glass p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Treatment Goals</h3>
          <ul className="space-y-2">
            {goals.map((g: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                {typeof g === 'string' ? g : g.goal ?? JSON.stringify(g)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phases timeline */}
      {phases.length > 0 && (
        <div className="glass p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Recovery Phases</h3>
          <div className="space-y-4">
            {phases.map((phase: any, idx: number) => {
              const cfg = phaseStatusConfig[phase.status] ?? phaseStatusConfig.pending
              const phaseGoals: any[] = phase.goals ?? []

              return (
                <div key={phase.id} className={clsx(
                  'relative pl-6 pb-4',
                  idx < phases.length - 1 && 'border-l border-surface-700 ml-2'
                )}>
                  <div className={clsx(
                    'absolute left-0 top-0 w-4 h-4 rounded-full border-2 -translate-x-1/2 flex items-center justify-center',
                    phase.status === 'completed' ? 'bg-success-500 border-success-500' :
                    phase.status === 'active'    ? 'bg-brand-500 border-brand-500' :
                    'bg-surface-800 border-surface-600'
                  )}>
                    {phase.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    {phase.status === 'active'    && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </div>

                  <div className={clsx(
                    'glass p-4 rounded-xl ml-3',
                    phase.status === 'active' && 'border border-brand-500/30 bg-brand-500/5'
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-200">
                        Phase {phase.phase_order}: {phase.name}
                      </h4>
                      <span className={cfg.cls}>{cfg.label}</span>
                    </div>
                    {phase.description && (
                      <p className="text-xs text-slate-500 mb-2">{phase.description}</p>
                    )}
                    {(phase.start_date || phase.end_date) && (
                      <p className="text-xs text-slate-600">
                        {phase.start_date ? format(new Date(phase.start_date), 'd MMM') : '?'}
                        {' – '}
                        {phase.end_date ? format(new Date(phase.end_date), 'd MMM yyyy') : 'TBD'}
                        {phase.duration_days && ` · ${phase.duration_days} days`}
                      </p>
                    )}
                    {phaseGoals.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {phaseGoals.map((g: any, i: number) => (
                          <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                            <span className="text-brand-500 mt-0.5">›</span>
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
