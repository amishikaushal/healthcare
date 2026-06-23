import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface Milestone { text: string; done: boolean }
interface Phase {
  id: number; name: string; duration: string
  description: string; milestones: Milestone[]; open: boolean
}

const defaultPhases: Phase[] = [
  {
    id: 1, name: 'Phase 1: Acute Recovery', duration: '1-2 weeks',
    description: 'Immediate post-operative care and basic mobility',
    milestones: [{ text: 'Walk with walker', done: false }, { text: 'Manage pain with medication', done: false }],
    open: true,
  },
  {
    id: 2, name: 'Phase 2: Active Recovery', duration: '3-6 weeks',
    description: 'Progressive strengthening and increased range of motion',
    milestones: [{ text: 'Achieve 90° flexion', done: false }],
    open: false,
  },
]

export default function CarePlanBuilder() {
  const [title,    setTitle]    = useState('')
  const [condition,setCondition]= useState('')
  const [startDate,setStartDate]= useState('')
  const [endDate,  setEndDate]  = useState('')
  const [goals,    setGoals]    = useState([''])
  const [phases,   setPhases]   = useState<Phase[]>(defaultPhases)
  const [saving,   setSaving]   = useState(false)

  const addGoal    = () => setGoals(g => [...g, ''])
  const removeGoal = (i: number) => setGoals(g => g.filter((_, idx) => idx !== i))
  const updateGoal = (i: number, v: string) => setGoals(g => g.map((x, idx) => idx === i ? v : x))

  const addPhase = () => setPhases(p => [...p, {
    id: Date.now(), name: `Phase ${p.length + 1}`, duration: '2 weeks',
    description: '', milestones: [{ text: '', done: false }], open: true,
  }])

  const togglePhase = (id: number) =>
    setPhases(p => p.map(ph => ph.id === id ? { ...ph, open: !ph.open } : ph))

  const updatePhase = (id: number, key: keyof Phase, value: any) =>
    setPhases(p => p.map(ph => ph.id === id ? { ...ph, [key]: value } : ph))

  const addMilestone = (phaseId: number) =>
    setPhases(p => p.map(ph => ph.id === phaseId
      ? { ...ph, milestones: [...ph.milestones, { text: '', done: false }] }
      : ph))

  const updateMilestone = (phaseId: number, i: number, text: string) =>
    setPhases(p => p.map(ph => ph.id === phaseId
      ? { ...ph, milestones: ph.milestones.map((m, idx) => idx === i ? { ...m, text } : m) }
      : ph))

  const removeMilestone = (phaseId: number, i: number) =>
    setPhases(p => p.map(ph => ph.id === phaseId
      ? { ...ph, milestones: ph.milestones.filter((_, idx) => idx !== i) }
      : ph))

  const handleSave = async () => {
    if (!title || !condition) { toast.error('Title and condition are required'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast.success('Care plan saved!')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <Link to="/doctor/patients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Care Plan Builder</h2>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Plan'}
        </button>
      </div>

      {/* Basic info */}
      <div className="glass p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Plan Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-500 mb-1 block">Plan Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Total Knee Replacement Recovery" className="input" /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Condition / Procedure</label>
            <input value={condition} onChange={e => setCondition(e.target.value)}
              placeholder="e.g. Post-Op Knee Replacement" className="input" /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">End Date (Estimated)</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></div>
        </div>
      </div>

      {/* Goals */}
      <div className="glass p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Recovery Goals</h3>
          <button onClick={addGoal} className="btn-ghost text-xs py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add goal
          </button>
        </div>
        {goals.map((g, i) => (
          <div key={i} className="flex gap-2">
            <input value={g} onChange={e => updateGoal(i, e.target.value)}
              placeholder={`Goal ${i + 1}…`} className="input flex-1 text-sm" />
            {goals.length > 1 && (
              <button onClick={() => removeGoal(i)}
                className="p-2 text-danger-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Phases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Recovery Phases</h3>
          <button onClick={addPhase} className="btn-secondary text-xs py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Phase
          </button>
        </div>

        {phases.map((ph, phIdx) => (
          <div key={ph.id} className="glass rounded-2xl overflow-hidden">
            <button onClick={() => togglePhase(ph.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors">
              <GripVertical className="w-4 h-4 text-slate-600 cursor-grab shrink-0" />
              <div className="w-7 h-7 rounded-full border-2 border-brand-500 bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">
                {phIdx + 1}
              </div>
              <span className="flex-1 text-sm font-medium text-slate-200">{ph.name || `Phase ${phIdx + 1}`}</span>
              <span className="text-xs text-slate-500">{ph.duration}</span>
              {ph.open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {ph.open && (
              <div className="px-4 pb-4 space-y-3 border-t border-surface-800 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-slate-500 mb-1 block">Phase Name</label>
                    <input value={ph.name} onChange={e => updatePhase(ph.id, 'name', e.target.value)}
                      className="input text-sm" /></div>
                  <div><label className="text-xs text-slate-500 mb-1 block">Duration</label>
                    <input value={ph.duration} onChange={e => updatePhase(ph.id, 'duration', e.target.value)}
                      placeholder="e.g. 2 weeks" className="input text-sm" /></div>
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">Description</label>
                  <input value={ph.description} onChange={e => updatePhase(ph.id, 'description', e.target.value)}
                    placeholder="What does this phase involve?" className="input text-sm" /></div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-500">Milestones</label>
                    <button onClick={() => addMilestone(ph.id)} className="text-xs text-brand-400 hover:text-brand-300">
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ph.milestones.map((m, mi) => (
                      <div key={mi} className="flex gap-2">
                        <input value={m.text} onChange={e => updateMilestone(ph.id, mi, e.target.value)}
                          placeholder={`Milestone ${mi + 1}…`} className="input flex-1 text-sm" />
                        <button onClick={() => removeMilestone(ph.id, mi)}
                          className="p-2 text-danger-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
