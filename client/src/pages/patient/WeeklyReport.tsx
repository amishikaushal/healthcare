import { useState, useEffect } from 'react'
import {
  BarChart2,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, Sparkles, PlusCircle, TrendingUp, Target, ListChecks
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { fetchWeeklyReports, generateWeeklyReport } from '@/services/patient'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-200 shadow-card-md px-3 py-2.5 rounded-xl text-xs">
      <p className="text-surface-500 font-medium mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.fill }} />
          <span className="text-surface-600">
            {p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}: <strong>{p.value}</strong>
          </span>
        </p>
      ))}
    </div>
  )
}

export default function WeeklyReport() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandSummary, setExpandSummary] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const loadData = () => {
    setLoading(true)
    fetchWeeklyReports()
      .then(setData)
      .catch(() => toast.error('Failed to load weekly reports'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerate = async () => {
    if (!user?.patientId) return
    setGenerating(true)
    try {
      await generateWeeklyReport(user.patientId)
      toast.success('Generated new weekly report!')
      loadData()
      setSelectedIdx(0)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        <p className="text-sm text-surface-400">Loading weekly reports…</p>
      </div>
    </div>
  )

  const reports: any[] = data?.reports ?? []
  const dailyData: any[] = data?.dailyData ?? []

  if (reports.length === 0) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-surface-900">Weekly Insights</h2>
            <p className="text-sm text-surface-400 mt-0.5">AI-powered recovery analysis</p>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary py-2 text-sm flex items-center gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
            <BarChart2 className="w-6 h-6 text-surface-400" />
          </div>
          <p className="text-surface-500 text-sm">No weekly reports yet.</p>
          <p className="text-surface-400 text-xs mt-1">Generate a report to see AI insights on your progress.</p>
        </div>
      </div>
    )
  }

  const report = reports[selectedIdx]

  const metrics = [
    { label: 'Avg Pain', value: Number(report.avg_pain_score ?? 0).toFixed(1), unit: '/10' },
    { label: 'Avg Mood', value: Number(report.avg_mood_score ?? 0).toFixed(1), unit: '/10' },
    { label: 'Avg Energy', value: Number(report.avg_energy_score ?? 0).toFixed(1), unit: '/10' },
    { label: 'Med Adherence', value: Number(report.medication_adherence ?? 0).toFixed(1), unit: '%' },
    { label: 'Exercise Adherence', value: Number(report.exercise_adherence ?? 0).toFixed(1), unit: '%' },
    { label: 'Overall Progress', value: Number(report.overall_progress ?? 0).toFixed(0), unit: '%' },
  ]

  // Safely parse JSONB fields from the database
  const parseJsonField = (field: any) => {
    if (!field) return {}
    if (typeof field === 'string') {
      try { return JSON.parse(field) } catch { return { items: [] } }
    }
    if (Array.isArray(field)) return { items: field }
    return field
  }

  const highlightsObj = parseJsonField(report.highlights)
  const concernsObj = parseJsonField(report.concerns)
  const recsObj = parseJsonField(report.ai_recommendations)

  const highlights = highlightsObj.highlights || highlightsObj.items || []
  const achievements = highlightsObj.achievements || []
  const positiveTrends = highlightsObj.positiveTrends || []

  const areasForImprovement = concernsObj.areasForImprovement || concernsObj.items || []
  const riskFactors = concernsObj.riskFactors || []

  const recommendations = recsObj.recommendations || recsObj.items || []
  const goals = recsObj.goals || []

  const hasProgress = highlights.length > 0 || achievements.length > 0 || positiveTrends.length > 0
  const hasRisks = areasForImprovement.length > 0 || riskFactors.length > 0
  const hasActionPlan = recommendations.length > 0 || goals.length > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            Weekly Recovery Insights
            <span className="badge-teal text-xs ml-2"><Sparkles className="w-3 h-3 mr-1 inline"/>AI Powered</span>
          </h2>
          <p className="text-sm text-surface-500 mt-1">
            Week of {format(new Date(report.week_start), 'd MMM')} – {format(new Date(report.week_end), 'd MMM yyyy')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {reports.length > 1 && (
            <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mr-2">
              <button disabled={selectedIdx === 0} onClick={() => setSelectedIdx(i => i - 1)}
                className="hover:bg-white disabled:hover:bg-transparent rounded-lg text-xs py-1.5 px-3 disabled:opacity-30 transition-colors font-medium">← Newer</button>
              <button disabled={selectedIdx === reports.length - 1} onClick={() => setSelectedIdx(i => i + 1)}
                className="hover:bg-white disabled:hover:bg-transparent rounded-lg text-xs py-1.5 px-3 disabled:opacity-30 transition-colors font-medium">Older →</button>
            </div>
          )}
          <button onClick={handleGenerate} disabled={generating} className="btn-secondary py-2 text-sm flex items-center gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            Generate New
          </button>
        </div>
      </div>

      {/* AI Summary Banner */}
      {report.ai_summary && (
        <div className="glass overflow-hidden rounded-2xl border border-brand-100 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-400 to-teal-400" />
          <div className="p-5">
            <button onClick={() => setExpandSummary(e => !e)}
              className="w-full flex items-center justify-between text-base font-bold text-surface-800">
              <span className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                Clinical Summary
              </span>
              {expandSummary ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
            </button>
            {expandSummary && (
              <div className="mt-4 text-sm text-surface-700 leading-relaxed animate-slide-up whitespace-pre-line pl-11">
                {report.ai_summary}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="glass p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-xl font-bold text-surface-900">{m.value}<span className="text-xs font-medium text-surface-400 ml-0.5">{m.unit}</span></p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Progress & Achievements */}
        <div className="space-y-6">
          {hasProgress && (
            <div className="glass rounded-2xl p-6 border-t-4 border-t-success-500">
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-success-500" /> Progress & Achievements
              </h3>
              
              {achievements.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Key Achievements</h4>
                  <ul className="space-y-2">
                    {achievements.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-500 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {highlights.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Weekly Highlights</h4>
                  <ul className="space-y-2">
                    {highlights.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {positiveTrends.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Positive Trends</h4>
                  <ul className="space-y-2">
                    {positiveTrends.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Risks & Action Plan */}
        <div className="space-y-6">
          
          {hasActionPlan && (
            <div className="glass rounded-2xl p-6 border-t-4 border-t-brand-500">
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-brand-500" /> Action Plan
              </h3>
              
              {goals.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Goals for Next Week</h4>
                  <ul className="space-y-2">
                    {goals.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Personalized Recommendations</h4>
                  <ul className="space-y-2">
                    {recommendations.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <ListChecks className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {hasRisks && (
            <div className="glass rounded-2xl p-6 border-t-4 border-t-warning-500">
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning-500" /> Areas to Watch
              </h3>
              
              {areasForImprovement.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Areas for Improvement</h4>
                  <ul className="space-y-2">
                    {areasForImprovement.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning-500 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {riskFactors.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Potential Risk Factors</h4>
                  <ul className="space-y-2">
                    {riskFactors.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-surface-700 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-danger-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Doctor Notes */}
      {report.doctor_notes && (
        <div className="glass rounded-2xl p-6 bg-brand-50/50 border border-brand-100">
          <p className="text-sm text-brand-700 font-bold mb-3 flex items-center gap-2">
            👨‍⚕️ Doctor's Review Notes
          </p>
          <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-line pl-6 border-l-2 border-brand-200">{report.doctor_notes}</p>
          {report.reviewed_at && (
            <p className="text-xs text-surface-400 mt-3 pl-6">
              Reviewed {format(new Date(report.reviewed_at), 'd MMM yyyy')}
            </p>
          )}
        </div>
      )}

      {/* Chart fallback */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-base font-bold text-surface-900 mb-5">Daily Metrics — This Week</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pain" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.85} barSize={12} />
              <Bar dataKey="mood" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} barSize={12} />
              <Bar dataKey="energy" fill="#14b8a6" radius={[4, 4, 0, 0]} opacity={0.85} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-surface-400 text-sm">No daily logs found for this week.</p>
          </div>
        )}
      </div>

    </div>
  )
}
