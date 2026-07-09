import { useState, useEffect } from 'react'
import { Search, ChevronRight, CheckCircle2, XCircle, Loader2, RefreshCw, Users, LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { isToday } from 'date-fns'
import { fetchCaregiverPatients, linkPatient } from '@/services/caregiver'

const riskBadge = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' } as const
const scoreColor = (s: number | null) =>
  s === null ? 'text-surface-500' : s >= 80 ? 'text-success-500' : s >= 60 ? 'text-warning-500' : 'text-danger-500'

export default function CaregiverPatientList() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [sort, setSort] = useState<'name' | 'score' | 'alerts'>('alerts')
  const [linkingId, setLinkingId] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true); setError(null)
      setPatients(await fetchCaregiverPatients())
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load patients')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleLink = async (patientId: string) => {
    setLinkingId(patientId)
    try {
      await linkPatient(patientId, 'caregiver')
      setPatients(prev => prev.map(p =>
        p.patientId === patientId ? { ...p, isLinked: true } : p
      ))
    } catch { } finally { setLinkingId(null) }
  }

  const filtered = patients
    .filter(p =>
      (filter === 'all' || (filter === 'linked' ? p.isLinked : !p.isLinked)) &&
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
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
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
          <h2 className="text-xl font-bold text-surface-900">Patients</h2>
          <p className="text-sm text-surface-500 mt-0.5">{patients.length} total · {patients.filter(p => p.isLinked).length} linked</p>
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
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="input py-2.5 text-sm">
          <option value="all">All patients</option>
          <option value="linked">Linked only</option>
          <option value="unlinked">New / Unlinked</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as any)} className="input py-2.5 text-sm">
          <option value="alerts">Sort: Alerts</option>
          <option value="score">Sort: Score</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'New (unlinked)', count: patients.filter(p => !p.isLinked).length,   cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
          { label: 'High risk',      count: patients.filter(p => p.riskLevel === 'high').length, cls: 'bg-danger-500/10 text-danger-400 border border-danger-500/20' },
          { label: 'No log today',   count: patients.filter(p => !p.lastLogDate || !isToday(new Date(p.lastLogDate))).length, cls: 'bg-warning-500/10 text-warning-500 border border-warning-500/20' },
        ].map(c => (
          <span key={c.label} className={clsx('text-xs px-3 py-1.5 rounded-xl', c.cls)}>{c.count} {c.label}</span>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl flex flex-col items-center justify-center py-16 gap-3">
          <Users className="w-12 h-12 text-slate-700" />
          <p className="text-surface-500 font-medium">No patients found</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3">Patient</th>
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3 hidden md:table-cell">Condition</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3">Score</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3">Risk</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3 hidden sm:table-cell">Logged</th>
                <th className="text-center text-xs text-surface-500 font-medium px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.patientId} className="border-b border-surface-200/50 hover:bg-surface-100/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {p.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-surface-900">{p.name}</p>
                          {!p.isLinked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">New</span>
                          )}
                        </div>
                        <p className="text-xs text-surface-600">{p.age ? `${p.age} yrs` : '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-surface-500">{p.conditionName}</td>
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
                    {p.isLinked ? (
                      <span className="text-xs text-emerald-400">Linked</span>
                    ) : (
                      <button
                        onClick={() => handleLink(p.patientId)}
                        disabled={linkingId === p.patientId}
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 mx-auto disabled:opacity-50"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {linkingId === p.patientId ? 'Linking…' : 'Link'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/caregiver/patients/${p.patientId}`}
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
