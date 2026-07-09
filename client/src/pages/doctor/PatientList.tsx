import { useState, useEffect } from 'react'
import { Search, ChevronRight, CheckCircle2, XCircle, Loader2, RefreshCw, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { isToday } from 'date-fns'
import { fetchDoctorPatients } from '@/services/doctor'

const riskBadge = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' } as const
const scoreColor = (s: number | null) =>
  s === null ? 'text-surface-500' : s >= 80 ? 'text-success-500' : s >= 60 ? 'text-warning-500' : 'text-danger-500'

export default function PatientList() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [sort, setSort] = useState<'name' | 'score' | 'alerts'>('alerts')

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchDoctorPatients()
      setPatients(data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = patients
    .filter(p =>
      (riskFilter === 'all' || p.riskLevel === riskFilter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       (p.conditionName || '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) =>
      sort === 'score'  ? (b.score ?? -1) - (a.score ?? -1) :
      sort === 'alerts' ? b.alertCount - a.alertCount :
      a.name.localeCompare(b.name)
    )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-danger-400">{error}</p>
      <button onClick={load} className="btn-secondary text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">My Patients</h2>
          <p className="text-sm text-surface-500 mt-0.5">{patients.length} assigned patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 flex items-center gap-2 input py-2.5">
          <Search className="w-4 h-4 text-surface-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or condition…"
            className="bg-transparent text-sm text-surface-700 placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value as any)}
          className="input py-2.5 text-sm">
          <option value="all">All risk levels</option>
          <option value="low">Low risk</option>
          <option value="medium">Medium risk</option>
          <option value="high">High risk</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as any)}
          className="input py-2.5 text-sm">
          <option value="alerts">Sort: Alerts</option>
          <option value="score">Sort: Score</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'New (unassigned)', count: patients.filter(p => !p.isAssigned).length,             cls: 'bg-brand-500/10 text-brand-400 border border-brand-500/20' },
          { label: 'High risk',        count: patients.filter(p => p.riskLevel === 'high').length,      cls: 'bg-danger-500/10 text-danger-400 border border-danger-500/20' },
          { label: 'No log today',     count: patients.filter(p => !p.lastLogDate || !isToday(new Date(p.lastLogDate))).length, cls: 'bg-warning-500/10 text-warning-500 border border-warning-500/20' },
          { label: 'Active alerts',    count: patients.reduce((a, p) => a + p.alertCount, 0),            cls: 'bg-danger-500/10 text-danger-400 border border-danger-500/20' },
        ].map(c => (
          <span key={c.label} className={clsx('text-xs px-3 py-1.5 rounded-xl', c.cls)}>
            {c.count} {c.label}
          </span>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl flex flex-col items-center justify-center py-16 gap-3">
          <Users className="w-12 h-12 text-slate-700" />
          <p className="text-surface-500 font-medium">No patients found</p>
          <p className="text-surface-600 text-sm">Create a care plan for a patient to have them appear here</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3">Patient</th>
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3 hidden md:table-cell">Condition</th>
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3 hidden lg:table-cell">Phase</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3">Score</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3">Risk</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3 hidden sm:table-cell">Logged</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3">Alerts</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.patientId} className="border-b border-surface-200/50 hover:bg-surface-100/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-600/30 text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {p.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-surface-900">{p.name}</p>
                          {!p.isAssigned && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30 font-medium">New</span>
                          )}
                        </div>
                        <p className="text-xs text-surface-600">{p.age ? `${p.age} yrs` : '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-surface-500">{p.conditionName}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-surface-500">
                    {p.phaseName || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('text-sm font-bold', scoreColor(p.score))}>
                      {p.score !== null ? `${p.score}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={riskBadge[p.riskLevel as keyof typeof riskBadge]}>{p.riskLevel}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {p.lastLogDate && isToday(new Date(p.lastLogDate))
                      ? <CheckCircle2 className="w-4 h-4 text-success-500 mx-auto" />
                      : <XCircle className="w-4 h-4 text-danger-500 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.alertCount > 0
                      ? <span className="w-5 h-5 rounded-full bg-danger-600 text-white text-xs flex items-center justify-center mx-auto font-bold">{p.alertCount}</span>
                      : <span className="text-slate-700 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/doctor/patients/${p.patientId}`}
                      className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-700 text-surface-500 hover:text-surface-700 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
