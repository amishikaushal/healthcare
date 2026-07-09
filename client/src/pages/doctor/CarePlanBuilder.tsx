import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save, ArrowLeft, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createCarePlan, generateCarePlanAI } from '@/services/doctor'

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
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiInstructions, setAiInstructions] = useState('')

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

  const location = useLocation()
  const navigate = useNavigate()
  const patientId = location.state?.patientId

  const handleSave = async () => {
    if (!title || !condition) { toast.error('Title and condition are required'); return }
    if (!patientId) { toast.error('Patient ID is missing, please return to the patient profile and try again'); return }
    setSaving(true)
    try {
      await createCarePlan(patientId, {
        title, condition, startDate, endDate, goals, phases
      })
      toast.success('Care plan saved!')
      navigate(`/doctor/patients/${patientId}`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save care plan')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!patientId) { toast.error('Patient ID is missing'); return }
    setGeneratingAI(true)
    try {
      const aiPlan = await generateCarePlanAI(patientId, condition, aiInstructions)
      if (aiPlan.title) setTitle(aiPlan.title)
      if (aiPlan.condition) setCondition(aiPlan.condition)
      if (aiPlan.goals && aiPlan.goals.length > 0) setGoals(aiPlan.goals)
      if (aiPlan.phases && aiPlan.phases.length > 0) {
        setPhases(aiPlan.phases.map((ph: any, i: number) => ({
          id: Date.now() + i,
          name: ph.name || `Phase ${i + 1}`,
          duration: ph.duration || '1 week',
          description: ph.description || '',
          milestones: (ph.milestones || []).map((m: any) => ({ text: m.text, done: false })),
          open: i === 0
        })))
      }
      
      // Calculate start/end dates if durationWeeks is provided
      if (aiPlan.durationWeeks) {
        const start = new Date()
        const end = new Date(start)
        end.setDate(start.getDate() + (aiPlan.durationWeeks * 7))
        setStartDate(start.toISOString().split('T')[0])
        setEndDate(end.toISOString().split('T')[0])
      } else {
        const start = new Date()
        setStartDate(start.toISOString().split('T')[0])
      }

      toast.success('Care plan generated successfully!')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to generate care plan')
    } finally {
      setGeneratingAI(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 transition-colors bg-transparent border-none p-0 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Patient
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-surface-900">Care Plan Builder</h2>
        <div className="flex gap-3">
          <button onClick={handleGenerateAI} disabled={generatingAI || saving} className="btn-secondary bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200">
            {generatingAI ? <span className="w-4 h-4 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
                          : <Sparkles className="w-4 h-4" />}
            {generatingAI ? 'Analyzing…' : '✨ AI Generate Plan'}
          </button>
          <button onClick={handleSave} disabled={saving || generatingAI} className="btn-primary">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Plan'}
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="glass p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-semibold text-surface-900">Plan Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs text-surface-500 mb-1 block">Plan Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Total Knee Replacement Recovery" className="input" /></div>
          <div><label className="text-xs text-surface-500 mb-1 block">Condition / Procedure</label>
            <input value={condition} onChange={e => setCondition(e.target.value)}
              placeholder="e.g. Post-Op Knee Replacement" className="input" /></div>
          <div><label className="text-xs text-surface-500 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
          <div><label className="text-xs text-surface-500 mb-1 block">End Date (Estimated)</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></div>
          <div className="md:col-span-2">
            <label className="text-xs text-brand-600 font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Instructions (Optional)</label>
            <textarea value={aiInstructions} onChange={e => setAiInstructions(e.target.value)}
              placeholder="e.g. Focus on light mobility, avoid heavy lifting for first 2 weeks. Patient is elderly." 
              className="input resize-y min-h-[60px] text-sm" />
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="glass p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-900">Recovery Goals</h3>
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
          <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider">Recovery Phases</h3>
          <button onClick={addPhase} className="btn-secondary text-xs py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Phase
          </button>
        </div>

        {phases.map((ph, phIdx) => (
          <div key={ph.id} className="glass rounded-2xl overflow-hidden">
            <button onClick={() => togglePhase(ph.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-surface-50 transition-colors">
              <GripVertical className="w-4 h-4 text-surface-600 cursor-grab shrink-0" />
              <div className="w-7 h-7 rounded-full border-2 border-brand-500 bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">
                {phIdx + 1}
              </div>
              <span className="flex-1 text-sm font-medium text-surface-900">{ph.name || `Phase ${phIdx + 1}`}</span>
              <span className="text-xs text-surface-500">{ph.duration}</span>
              {ph.open ? <ChevronUp className="w-4 h-4 text-surface-500" /> : <ChevronDown className="w-4 h-4 text-surface-500" />}
            </button>

            {ph.open && (
              <div className="px-4 pb-4 space-y-3 border-t border-surface-200 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-surface-500 mb-1 block">Phase Name</label>
                    <input value={ph.name} onChange={e => updatePhase(ph.id, 'name', e.target.value)}
                      className="input text-sm" /></div>
                  <div><label className="text-xs text-surface-500 mb-1 block">Duration</label>
                    <input value={ph.duration} onChange={e => updatePhase(ph.id, 'duration', e.target.value)}
                      placeholder="e.g. 2 weeks" className="input text-sm" /></div>
                </div>
                <div><label className="text-xs text-surface-500 mb-1 block">Description</label>
                  <input value={ph.description} onChange={e => updatePhase(ph.id, 'description', e.target.value)}
                    placeholder="What does this phase involve?" className="input text-sm" /></div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-surface-500">Milestones</label>
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
