import { Users, Database, Activity, Shield, Settings, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Total Users',    value: 1284, icon: Users,     color: 'bg-brand-600' },
  { label: 'Active Patients',value: 847,  icon: Activity,  color: 'bg-success-600' },
  { label: 'Doctors',        value: 38,   icon: Shield,    color: 'bg-indigo-600' },
  { label: 'DB Tables',      value: 24,   icon: Database,  color: 'bg-warning-600' },
]

const recentActivity = [
  { user: 'Sarah Connor',  action: 'Submitted recovery log',        time: '2 min ago' },
  { user: 'Dr. Sharma',    action: 'Created care plan',             time: '15 min ago' },
  { user: 'Raj Patel',     action: 'Risk alert triggered (pain 9)', time: '1h ago' },
  { user: 'System',        action: 'Weekly reports generated (42)', time: '3h ago' },
  { user: 'Meera Iyer',    action: 'Uploaded lab report',           time: '5h ago' },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Admin Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">System overview and management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass-hover p-5 rounded-2xl">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{s.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass p-5 rounded-2xl">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" /> Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-surface-800 last:border-0">
              <div className="w-7 h-7 rounded-xl bg-surface-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                {a.user[0]}
              </div>
              <div className="flex-1">
                <span className="text-sm text-slate-300 font-medium">{a.user}</span>
                <span className="text-sm text-slate-500"> · {a.action}</span>
              </div>
              <span className="text-xs text-slate-600">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-5 rounded-2xl flex items-center gap-4">
        <Settings className="w-8 h-8 text-slate-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">System Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage roles, permissions, email templates and integrations</p>
        </div>
        <button className="btn-secondary text-sm ml-auto">Configure</button>
      </div>
    </div>
  )
}
