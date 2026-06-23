import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Pill, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { fetchMedications, markMedicationTaken as apiMarkTaken } from '@/services/patient'
import { format } from 'date-fns'

export default function Medications() {
  const [data,    setData]    = useState<any>(null)
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
      // Refresh data
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
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  const medications  = data?.medications  ?? []
  const adherence    = data?.adherence    ?? []

  const taken = medications.reduce((s: number, m: any) =>
    s + (m.today_logs?.filter((l: any) => l.status === 'taken').length ?? 0), 0)
  const total = medications.reduce((s: number, m: any) => s + (m.times_per_day ?? 1), 0)
  const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Medications</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Today's schedule · {taken}/{total} taken
          </p>
        </div>
      </div>

      {/* Weekly adherence chart */}
      {adherence.length > 0 && (
        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Weekly Adherence</h3>
            <span className={clsx('text-lg font-bold',
              adherencePct >= 80 ? 'text-success-500' : adherencePct >= 50 ? 'text-warning-500' : 'text-danger-500')}>
              {adherencePct}%
            </span>
          </div>
          <div className="flex gap-2 items-end h-16">
            {adherence.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${(d.pct / 100) * 52}px`,
                    background: d.pct === 100 ? '#22c55e' : d.pct >= 75 ? '#f59e0b' : '#f43f5e',
                    opacity: 0.8,
                    minHeight: d.pct > 0 ? '4px' : '0',
                  }} />
                <span className="text-xs text-slate-600">{d.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medication schedule cards */}
      {medications.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center text-slate-500 text-sm">
          No medications scheduled. Your doctor will add them to your care plan.
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((m: any) => {
            const todayLogs: any[] = m.today_logs ?? []
            const times: string[] = m.scheduled_times ?? []

            // Build dose slots from scheduled_times
            const doseSlots = times.length > 0
              ? times.map((t: string, i: number) => {
                  const log = todayLogs[i] ?? null
                  const taken = log?.status === 'taken'
                  const timeLabel = t // e.g. "08:00:00"
                  const display = timeLabel.length >= 5
                    ? format(new Date(`1970-01-01T${timeLabel}`), 'h:mm a')
                    : timeLabel
                  return { time: timeLabel, display, taken, log }
                })
              : [{ time: new Date().toISOString(), display: 'As needed', taken: todayLogs.length > 0, log: todayLogs[0] ?? null }]

            const colors = ['bg-danger-600','bg-amber-600','bg-purple-600','bg-indigo-600','bg-teal-600']
            const color  = colors[medications.indexOf(m) % colors.length]

            return (
              <div key={m.id} className="glass rounded-2xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-200">{m.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {m.dosage} · {m.frequency} · {m.drug_class ?? 'Medication'}
                            {m.with_food && ' · With food'}
                          </p>
                        </div>
                        {m.end_date && (
                          <span className="text-xs text-slate-600">
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
                              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all',
                              slot.taken
                                ? 'bg-success-500/15 border border-success-500/30'
                                : 'bg-surface-800 border border-surface-700'
                            )}>
                              {slot.taken
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
                                : <Clock className="w-3.5 h-3.5 text-slate-500" />}
                              <span className={slot.taken ? 'text-success-500' : 'text-slate-400'}>
                                {slot.display}
                                {slot.taken && slot.log?.takenAt
                                  ? ` · taken ${format(new Date(slot.log.takenAt), 'h:mm a')}`
                                  : ''}
                              </span>
                              {!slot.taken && (
                                <button
                                  onClick={() => handleMarkTaken(m.id, slot.time)}
                                  disabled={isMarking}
                                  className="ml-1 text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
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
              </div>
            )
          })}
        </div>
      )}

      {medications.length > 0 && (
        <div className="glass p-4 rounded-2xl flex items-start gap-3 border-warning-500/20 bg-warning-500/5">
          <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
          <p className="text-xs text-warning-500/80">
            <strong>Reminder:</strong> Always take medications as prescribed. Do not double-dose if you miss a scheduled time. Contact your doctor for guidance.
          </p>
        </div>
      )}
    </div>
  )
}
