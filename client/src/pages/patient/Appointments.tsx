import { useState, useEffect } from 'react'
import { Calendar, Video, MapPin, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import { fetchAppointments, cancelAppointment as apiCancel } from '@/services/patient'

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  scheduled: { label: 'Scheduled', cls: 'badge-yellow', icon: AlertCircle },
  confirmed: { label: 'Confirmed', cls: 'badge-blue',   icon: CheckCircle2 },
  completed: { label: 'Completed', cls: 'badge-green',  icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'badge-red',    icon: XCircle },
  no_show:   { label: 'No-show',   cls: 'badge-red',    icon: XCircle },
}

function dateLabel(d: Date) {
  if (isToday(d))    return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEE, d MMM')
}

function AppointmentCard({ appt, onCancel }: { appt: any; onCancel: (id: string) => void }) {
  const cfg  = statusConfig[appt.status] ?? statusConfig.scheduled
  const date = new Date(appt.scheduledAt)
  const past = isPast(date) && appt.status !== 'confirmed' && appt.status !== 'scheduled'

  return (
    <div className={clsx('glass rounded-2xl p-4 transition-all duration-200',
      !past && 'glass-hover',
      appt.status === 'completed' && 'opacity-70')}>
      <div className="flex items-start gap-4">
        <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0',
          appt.type === 'telehealth' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-brand-600/30 text-brand-300')}>
          {appt.doctor?.initials ?? '??'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{appt.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {appt.doctor?.name} · {appt.doctor?.specialty}
              </p>
            </div>
            <span className={cfg.cls}>{cfg.label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {dateLabel(date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {format(date, 'h:mm a')} ({appt.durationMins} min)
            </span>
            {appt.type === 'telehealth'
              ? <span className="flex items-center gap-1 text-indigo-400"><Video className="w-3.5 h-3.5" /> Telehealth</span>
              : appt.location && <span className="flex items-center gap-1 truncate max-w-xs"><MapPin className="w-3.5 h-3.5 shrink-0" />{appt.location}</span>}
          </div>
          {appt.preNotes && (
            <p className="mt-2 text-xs text-slate-600 bg-surface-800/50 px-3 py-1.5 rounded-lg">
              📝 {appt.preNotes}
            </p>
          )}
          {(appt.status === 'confirmed' || appt.status === 'scheduled') && (
            <div className="mt-3 flex gap-2">
              {appt.type === 'telehealth' && appt.meetingUrl && (
                <a href={appt.meetingUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-xs py-1.5 px-3">
                  <Video className="w-3 h-3" /> Join Call
                </a>
              )}
              <button onClick={() => onCancel(appt.id)}
                className="btn-ghost text-xs py-1.5 px-3 text-danger-500 hover:text-danger-400">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    fetchAppointments()
      .then(setAppointments)
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await apiCancel(id)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
      toast.success('Appointment cancelled')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel')
    }
  }

  const upcoming = appointments.filter(a => {
    const d = new Date(a.scheduledAt)
    return (!isPast(d) || a.status === 'confirmed' || a.status === 'scheduled')
      && a.status !== 'cancelled'
  })
  const past = appointments.filter(a => {
    const d = new Date(a.scheduledAt)
    return (isPast(d) && a.status !== 'confirmed' && a.status !== 'scheduled') || a.status === 'cancelled'
  })

  const nextAppt = upcoming[0]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Appointments</h2>
          <p className="text-sm text-slate-500 mt-0.5">{upcoming.length} upcoming</p>
        </div>
      </div>

      {nextAppt && (
        <div className="glass p-4 rounded-2xl border border-brand-500/20 bg-brand-500/5">
          <p className="text-xs text-brand-400 font-semibold mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> NEXT APPOINTMENT
          </p>
          <p className="text-sm font-bold text-slate-100">{nextAppt.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {nextAppt.doctor?.name} · {dateLabel(new Date(nextAppt.scheduledAt))} at {format(new Date(nextAppt.scheduledAt), 'h:mm a')}
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-surface-900 p-1 rounded-xl w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
            {t} ({t === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(tab === 'upcoming' ? upcoming : past).map(a => (
          <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} />
        ))}
        {(tab === 'upcoming' ? upcoming : past).length === 0 && (
          <div className="glass p-8 rounded-2xl text-center text-slate-500 text-sm">
            No {tab} appointments
          </div>
        )}
      </div>
    </div>
  )
}
