import { useState, useEffect } from 'react'
import {
  BarChart2,
  CheckCircle2, AlertTriangle, Star, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { clsx as _clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { fetchWeeklyReports } from '@/services/patient'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs space-y-1">
      <p className="text-slate-400 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function WeeklyReport() {
  const [data,          setData]          = useState<any>(null)
  const [loading,       setLoading]       = useState(true)
  const [expandSummary, setExpandSummary] = useState(false)
  const [selectedIdx,   setSelectedIdx]   = useState(0)

  useEffect(() => {
    fetchWeeklyReports()
      .then(setData)
      .catch(() => toast.error('Failed to load weekly reports'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )

  const reports: any[]   = data?.reports   ?? []
  const dailyData: any[] = data?.dailyData  ?? []
  const radarData: any[] = data?.radarData  ?? []

  if (reports.length === 0) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Weekly Report</h2>
          <p className="text-sm text-slate-500 mt-0.5">Generated automatically each week</p>
        </div>
        <div className="glass p-8 rounded-2xl text-center text-slate-500 text-sm">
          No weekly reports yet. Reports are generated after your first full week of logging.
        </div>
      </div>
    )
  }

  const report = reports[selectedIdx]

  const metrics = [
    { label: 'Avg Pain',           value: Number(report.avg_pain_score    ?? 0).toFixed(1), unit: '/10',  prev: null, lower: true },
    { label: 'Avg Mood',           value: Number(report.avg_mood_score     ?? 0).toFixed(1), unit: '/10',  prev: null, lower: false },
    { label: 'Avg Energy',         value: Number(report.avg_energy_score   ?? 0).toFixed(1), unit: '/10',  prev: null, lower: false },
    { label: 'Med Adherence',      value: Number(report.medication_adherence ?? 0).toFixed(1), unit: '%', prev: null, lower: false },
    { label: 'Exercise Adherence', value: Number(report.exercise_adherence  ?? 0).toFixed(1), unit: '%', prev: null, lower: false },
    { label: 'Overall Progress',   value: Number(report.overall_progress   ?? 0).toFixed(0), unit: '%',  prev: null, lower: false },
  ]

  const highlights: string[] = report.highlights ?? []
  const concerns:   string[] = report.concerns   ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Weekly Report — Week {selectedIdx + 1}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(report.week_start), 'd MMM')} – {format(new Date(report.week_end), 'd MMM yyyy')}
          </p>
        </div>
        {/* Report selector if multiple */}
        {reports.length > 1 && (
          <div className="flex gap-1">
            <button disabled={selectedIdx === 0} onClick={() => setSelectedIdx(i => i - 1)}
              className="btn-secondary text-xs py-2 px-3 disabled:opacity-30">← Newer</button>
            <button disabled={selectedIdx === reports.length - 1} onClick={() => setSelectedIdx(i => i + 1)}
              className="btn-secondary text-xs py-2 px-3 disabled:opacity-30">Older →</button>
          </div>
        )}
      </div>

      {/* Overall progress banner */}
      <div className="glass p-5 rounded-2xl flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex flex-col items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-brand-400">
            {Number(report.overall_progress ?? 0).toFixed(0)}
          </span>
          <span className="text-xs text-slate-500">%</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-200">Overall Recovery Progress</h3>
          <div className="mt-2 h-2 bg-surface-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-600 to-sky-400 rounded-full transition-all"
              style={{ width: `${Number(report.overall_progress ?? 0)}%` }} />
          </div>
        </div>
        <div className="text-right">
          {report.is_reviewed ? (
            <span className="text-xs badge-green">Doctor reviewed</span>
          ) : (
            <span className="text-xs badge-yellow">Pending review</span>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="glass p-4 rounded-2xl">
            <p className="text-xs text-slate-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-slate-100">{m.value}{m.unit}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Daily Metrics — This Week</h3>
          {dailyData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pain"   fill="#f43f5e" radius={[3,3,0,0]} opacity={0.8} />
                  <Bar dataKey="mood"   fill="#38bdf8" radius={[3,3,0,0]} opacity={0.8} />
                  <Bar dataKey="energy" fill="#22c55e" radius={[3,3,0,0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-danger-500 inline-block" />Pain</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-400 inline-block" />Mood</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success-500 inline-block" />Energy</span>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No daily logs for this week</p>
          )}
        </div>

        {radarData.length > 0 && (
          <div className="glass p-5 rounded-2xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Category Scores</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Score" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Highlights & Concerns */}
      {(highlights.length > 0 || concerns.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {highlights.length > 0 && (
            <div className="glass p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-success-500 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Highlights
              </h3>
              <ul className="space-y-2">
                {highlights.map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <Star className="w-3.5 h-3.5 text-warning-500 shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {concerns.length > 0 && (
            <div className="glass p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-warning-500 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Concerns
              </h3>
              <ul className="space-y-2">
                {concerns.map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning-500 shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* AI Summary */}
      {report.ai_summary && (
        <div className="glass p-5 rounded-2xl">
          <button onClick={() => setExpandSummary(e => !e)}
            className="w-full flex items-center justify-between text-sm font-semibold text-slate-200">
            <span className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-400" /> AI-Generated Summary
              <span className="badge-blue text-xs">Gemini</span>
            </span>
            {expandSummary ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {expandSummary && (
            <div className="mt-4 text-sm text-slate-400 leading-relaxed animate-slide-up whitespace-pre-line">
              {report.ai_summary}
            </div>
          )}
        </div>
      )}

      {/* Doctor Notes */}
      {report.doctor_notes && (
        <div className="glass p-5 rounded-2xl border border-brand-500/20 bg-brand-500/5">
          <p className="text-xs text-brand-400 font-semibold mb-2">👨‍⚕️ Doctor's Notes</p>
          <p className="text-sm text-slate-300">{report.doctor_notes}</p>
          {report.reviewed_at && (
            <p className="text-xs text-slate-500 mt-2">
              Reviewed {format(new Date(report.reviewed_at), 'd MMM yyyy')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
