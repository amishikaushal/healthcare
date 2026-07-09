import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Info, Pill, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { fetchMedications, markMedicationTaken as apiMarkTaken } from '@/services/patient'
import { format } from 'date-fns'

const PILL_COLORS = [
  { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'bg-rose-500' },
  { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-500' },
  { bg: 'bg-violet-50', border: 'border-violet-100', icon: 'bg-violet-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'bg-indigo-500' },
  { bg: 'bg-teal-50', border: 'border-teal-100', icon: 'bg-teal-500' },
]

export default function Medications() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    fetchMedications()
      .then(setData)
      .catch(() => toast.error('Failed to load medications'))
      .finally(() => setLoading(false))
  }, [])

  const handleMarkTaken = async (scheduleId: string, scheduledTime: string) => {
    setMarking(`${scheduleId}-${scheduledTime}`)
    try {
      await apiMarkTaken(scheduleId, scheduledTime)
      toast.success('Marked as taken!')
      const fresh = await fetchMedications()
      setData(fresh)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to mark as taken')
    } finally {
      setMarking(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        <p className="text-sm text-surface-400">Loading medications…</p>
      </div>
    </div>
  )

  const medications = data?.medications ?? []
  const adherence = data?.adherence ?? []

  const taken = medications.reduce((s: number, m: any) =>
    s + (m.today_logs?.filter((l: any) => l.status === 'taken').length ?? 0), 0)
  const total = medications.reduce((s: number, m: any) => s + (m.times_per_day ?? 1), 0)
  const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Medications</h2>
          <p className="text-sm text-surface-400 mt-0.5">
            Today's schedule · <span className="font-semibold text-surface-600">{taken}/{total}</span> taken
          </p>
        </div>
      </div>

      {/* Weekly adherence chart */}
      {adherence.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-800">Weekly Adherence</h3>
            <span className={clsx('text-xl font-bold tabular-nums',
              adherencePct >= 80 ? 'text-success-600' : adherencePct >= 50 ? 'text-warning-600' : 'text-danger-600')}>
              {adherencePct}%
            </span>
          </div>
          <div className="flex gap-2 items-end h-16">
            {adherence.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${(d.pct / 100) * 52}px`,
                    background: d.pct === 100
                      ? '#22c55e'
                      : d.pct >= 75 ? '#f59e0b' : '#f43f5e',
                    opacity: 0.75,
                    minHeight: d.pct > 0 ? '4px' : '0',
                  }} />
                <span className="text-xs text-surface-400">{d.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medication schedule cards */}
      {medications.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
            <Pill className="w-6 h-6 text-surface-400" />
          </div>
          <p className="text-surface-500 text-sm">No medications scheduled.</p>
          <p className="text-surface-400 text-xs mt-1">Your doctor will add them to your care plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((m: any, idx: number) => {
            const todayLogs: any[] = m.today_logs ?? []
            const times: string[] = m.scheduled_times ?? []
            const colorScheme = PILL_COLORS[idx % PILL_COLORS.length]

            const doseSlots = times.length > 0
              ? times.map((t: string, i: number) => {
                const log = todayLogs[i] ?? null
                const isTaken = log?.status === 'taken'
                const timeLabel = t
                const display = timeLabel.length >= 5
                  ? format(new Date(`1970-01-01T${timeLabel}`), 'h:mm a')
                  : timeLabel
                return { time: timeLabel, display, taken: isTaken, log }
              })
              : [{ time: new Date().toISOString(), display: 'As needed', taken: todayLogs.length > 0, log: todayLogs[0] ?? null }]

            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', colorScheme.bg, 'border', colorScheme.border)}>
                    <Pill className={clsx('w-5 h-5', colorScheme.icon.replace('bg-', 'text-'))} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-surface-800">{m.name}</h3>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {m.dosage} · {m.frequency} · {m.drug_class ?? 'Medication'}
                          {m.with_food && ' · With food'}
                        </p>
                      </div>
                      {m.end_date && (
                        <span className="text-xs text-surface-400 shrink-0">
                          Until {format(new Date(m.end_date), 'd MMM yyyy')}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {doseSlots.map((slot: any, i: number) => {
                        const key = `${m.id}-${slot.time}`
                        const isMarking = marking === key
                        return (
                          <div key={i} className={clsx(
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all border',
                            slot.taken
                              ? 'bg-success-50 border-success-100'
                              : 'bg-surface-50 border-surface-200'
                          )}>
                            {slot.taken
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
                              : <Clock className="w-3.5 h-3.5 text-surface-400" />}
                            <span className={slot.taken ? 'text-success-600 font-medium' : 'text-surface-600'}>
                              {slot.display}
                              {slot.taken && slot.log?.takenAt
                                ? ` · taken ${format(new Date(slot.log.takenAt), 'h:mm a')}`
                                : ''}
                            </span>
                            {!slot.taken && (
                              <button
                                onClick={() => handleMarkTaken(m.id, slot.time)}
                                disabled={isMarking}
                                className="ml-1 text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
                                {isMarking ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Mark taken
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {medications.length > 0 && (
        <div className="card p-4 flex items-start gap-3 bg-amber-50 border-amber-100">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Reminder:</strong> Always take medications as prescribed. Do not double-dose if you miss a scheduled time. Contact your doctor for guidance.
          </p>
        </div>
      )}
    </div>
  )
}
