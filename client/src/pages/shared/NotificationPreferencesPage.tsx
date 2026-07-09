import { useEffect, useState } from 'react'
import { Bell, ArrowLeft, Loader2, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchPreferences, updatePreferences } from '@/services/notification'

export default function NotificationPreferencesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState({
    medication_reminders: true,
    appointment_reminders: true,
    care_plan_updates: true,
    doctor_messages: true,
    risk_alerts: true,
    ai_weekly_reports: true,
  })

  useEffect(() => {
    fetchPreferences().then(data => {
      setPrefs(data)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load preferences')
      setLoading(false)
    })
  }, [])

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences(prefs)
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-brand-500" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/notifications" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Notifications
      </Link>

      <div className="glass p-8 rounded-2xl border border-surface-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
              <Bell className="w-6 h-6 text-brand-500" /> Notification Preferences
            </h1>
            <p className="text-sm text-surface-500 mt-2">Choose what you want to be notified about.</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 py-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        <div className="space-y-4">
          {[
            { id: 'medication_reminders', label: 'Medication Reminders', desc: 'Alerts when it is time to take your medication.' },
            { id: 'appointment_reminders', label: 'Appointment Reminders', desc: 'Reminders for upcoming doctor appointments.' },
            { id: 'care_plan_updates', label: 'Care Plan Updates', desc: 'Notifications when your doctor assigns or changes your care plan.' },
            { id: 'doctor_messages', label: 'Doctor Messages', desc: 'Direct messages and notes from your clinical team.' },
            { id: 'risk_alerts', label: 'High Risk Alerts', desc: 'Important alerts if your recovery score drops or if anomalies are detected.' },
            { id: 'ai_weekly_reports', label: 'Weekly AI Reports', desc: 'Your personalized weekly summary and AI insights.' },
          ].map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200 cursor-pointer hover:bg-surface-100 transition-colors" onClick={() => handleToggle(item.id as keyof typeof prefs)}>
              <div>
                <p className="font-medium text-surface-800">{item.label}</p>
                <p className="text-sm text-surface-500 mt-0.5">{item.desc}</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2" style={{ backgroundColor: prefs[item.id as keyof typeof prefs] ? '#2563EB' : '#CBD5E1' }}>
                <span className={`${prefs[item.id as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
