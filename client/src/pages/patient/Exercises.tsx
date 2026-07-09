import { useState, useEffect } from 'react'
import { CheckCircle2, Dumbbell, Play, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { fetchExercises, logExercise as apiLogExercise } from '@/services/patient'

const diffConfig = {
  Easy: { cls: 'bg-success-50 text-success-700 border-success-100', badge: 'Easy' },
  Medium: { cls: 'bg-amber-50 text-amber-700 border-amber-100', badge: 'Medium' },
  Hard: { cls: 'bg-danger-50 text-danger-700 border-danger-100', badge: 'Hard' },
} as const

const catConfig = {
  Flexibility: 'text-sky-600',
  Strengthening: 'text-brand-600',
  Circulation: 'text-teal-600',
} as const

function ExerciseCard({ ex, onComplete }: { ex: any; onComplete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await apiLogExercise(ex.id, {
        setsCompleted: ex.sets,
        repsCompleted: ex.reps,
        durationMins: ex.duration_mins,
      })
      toast.success(`${ex.name} completed!`)
      onComplete(ex.id)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to log exercise')
    } finally {
      setCompleting(false)
    }
  }

  const instructions: string[] = ex.instructions ?? []
  const muscles: string[] = ex.muscle_groups ?? []
  const diff = diffConfig[ex.difficulty as keyof typeof diffConfig] ?? diffConfig.Medium

  return (
    <div className={clsx(
      'card overflow-hidden transition-all duration-200 p-0',
      ex.completed && 'border-success-100 bg-success-50/30'
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            ex.completed ? 'bg-success-100' : 'bg-blue-50'
          )}>
            <Dumbbell className={clsx('w-5 h-5', ex.completed ? 'text-success-600' : 'text-brand-600')} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-surface-800">{ex.name}</h3>
                <p className={clsx('text-xs mt-0.5', catConfig[ex.category as keyof typeof catConfig] || 'text-surface-400')}>
                  {ex.category}
                </p>
              </div>
              <span className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                diff.cls
              )}>
                {diff.badge}
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-2 text-xs text-surface-400 flex-wrap">
              {ex.sets && <span className="flex items-center gap-1 bg-surface-100 px-2 py-0.5 rounded-lg">{ex.sets} sets</span>}
              {ex.sets && ex.reps && <span className="text-surface-300">×</span>}
              {ex.reps && <span className="flex items-center gap-1 bg-surface-100 px-2 py-0.5 rounded-lg">{ex.reps} reps</span>}
              {ex.duration_mins && <span className="flex items-center gap-1 bg-surface-100 px-2 py-0.5 rounded-lg">{ex.duration_mins} min</span>}
              {muscles.map((m: string) => (
                <span key={m} className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg border border-brand-100">{m}</span>
              ))}
            </div>
            {ex.completed && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-success-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
                {ex.sets_completed && ` · ${ex.sets_completed} sets`}
                {ex.pain_during != null && ` · Pain: ${ex.pain_during}/10`}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {instructions.length > 0 && (
              <button onClick={() => setExpanded(e => !e)}
                className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            {!ex.completed && (
              <button onClick={handleComplete} disabled={completing}
                className="btn-primary text-xs py-1.5 px-3">
                {completing
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Play className="w-3 h-3" />}
                {completing ? '…' : 'Done'}
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && instructions.length > 0 && (
        <div className="px-4 pb-4 border-t border-surface-100 pt-3 animate-slide-up">
          <p className="section-label mb-2">Instructions</p>
          <ol className="space-y-2">
            {instructions.map((step: string, i: number) => (
              <li key={i} className="flex gap-2.5 text-sm text-surface-600">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center text-xs shrink-0 font-semibold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function Exercises() {
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExercises()
      .then(setExercises)
      .catch(() => toast.error('Failed to load exercises'))
      .finally(() => setLoading(false))
  }, [])

  const handleComplete = (exerciseId: string) => {
    setExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, completed: true } : e))
  }

  const done = exercises.filter(e => e.completed).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        <p className="text-sm text-surface-400">Loading exercises…</p>
      </div>
    </div>
  )

  const progressPct = exercises.length > 0 ? Math.round((done / exercises.length) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Exercises</h2>
          <p className="text-sm text-surface-400 mt-0.5">
            Today's physiotherapy program · <span className="font-semibold text-surface-600">{done}/{exercises.length}</span> done
          </p>
        </div>
      </div>

      {exercises.length > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-surface-500 font-medium">Session progress</span>
            <span className="font-bold text-teal-600">{progressPct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-teal transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="w-6 h-6 text-surface-400" />
          </div>
          <p className="text-surface-500 text-sm">No exercises assigned for today.</p>
          <p className="text-surface-400 text-xs mt-1">Your doctor will add them to your care plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map(ex => (
            <ExerciseCard key={ex.id} ex={ex} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {done === exercises.length && exercises.length > 0 && (
        <div className="card p-5 flex items-center gap-3 bg-success-50 border-success-100">
          <div className="w-10 h-10 rounded-2xl bg-success-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-success-700">All exercises completed!</p>
            <p className="text-xs text-success-600 mt-0.5">Great work — you're on track for a strong recovery.</p>
          </div>
        </div>
      )}
    </div>
  )
}
