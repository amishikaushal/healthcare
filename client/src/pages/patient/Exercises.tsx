import { useState, useEffect } from 'react'
import { CheckCircle2, Dumbbell, Play, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { fetchExercises, logExercise as apiLogExercise } from '@/services/patient'

const diffColor = { Easy: 'badge-green', Medium: 'badge-yellow', Hard: 'badge-red' } as const
const catColor  = { Flexibility: 'text-sky-400', Strengthening: 'text-brand-400', Circulation: 'text-green-400' } as const

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

  return (
    <div className={clsx('glass rounded-2xl overflow-hidden transition-all duration-200',
      ex.completed && 'border-success-500/20 bg-success-500/5')}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            ex.completed ? 'bg-success-500/20' : 'bg-brand-600/20')}>
            <Dumbbell className={clsx('w-5 h-5', ex.completed ? 'text-success-500' : 'text-brand-400')} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">{ex.name}</h3>
                <p className={clsx('text-xs mt-0.5', catColor[ex.category as keyof typeof catColor] || 'text-slate-500')}>
                  {ex.category}
                </p>
              </div>
              <span className={diffColor[ex.difficulty as keyof typeof diffColor] || 'badge-yellow'}>
                {ex.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
              {ex.sets && <span>{ex.sets} sets</span>}
              {ex.sets && ex.reps && <span>×</span>}
              {ex.reps && <span>{ex.reps} reps</span>}
              {ex.duration_mins && <span>· {ex.duration_mins} min</span>}
              {muscles.map((m: string) => (
                <span key={m} className="bg-surface-800 px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
            {ex.completed && (
              <div className="mt-2 flex items-center gap-2 text-xs text-success-500">
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
                className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-500 transition-colors">
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
        <div className="px-4 pb-4 border-t border-surface-800 pt-3 animate-slide-up">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Instructions</p>
          <ol className="space-y-1.5">
            {instructions.map((step: string, i: number) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-400">
                <span className="w-5 h-5 rounded-full bg-surface-800 text-slate-600 flex items-center justify-center text-xs shrink-0">
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
  const [loading,   setLoading]   = useState(true)

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
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Exercises</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Today's physiotherapy program · {done}/{exercises.length} done
          </p>
        </div>
      </div>

      {exercises.length > 0 && (
        <div className="glass p-4 rounded-2xl">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Session progress</span>
            <span className="font-bold text-brand-400">
              {exercises.length > 0 ? Math.round((done / exercises.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-600 to-sky-400 rounded-full transition-all duration-700"
              style={{ width: `${exercises.length > 0 ? (done / exercises.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center text-slate-500 text-sm">
          No exercises assigned for today. Your doctor will add them to your care plan.
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map(ex => (
            <ExerciseCard key={ex.id} ex={ex} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {done === exercises.length && exercises.length > 0 && (
        <div className="glass p-4 rounded-2xl flex items-center gap-3 border-success-500/20 bg-success-500/5">
          <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0" />
          <p className="text-sm text-success-400 font-medium">
            🎉 All exercises completed for today! Great work!
          </p>
        </div>
      )}
    </div>
  )
}
