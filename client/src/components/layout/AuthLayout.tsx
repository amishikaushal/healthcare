import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { HeartPulse, Shield, Activity, Users } from 'lucide-react'

const stats = [
  { label: 'Active Patients', value: '10K+', icon: Users },
  { label: 'Recovery Rate', value: '98%', icon: Activity },
  { label: 'Verified Doctors', value: '500+', icon: Shield },
]

export default function AuthLayout() {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-surface-100 flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-brand-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, #fff 0%, transparent 50%),
                              radial-gradient(circle at 80% 80%, #1d4ed8 0%, transparent 50%)`
          }}
        />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">RecoveryOS</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5 text-balance">
            Your recovery,<br />guided by AI
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Personalised care plans, intelligent monitoring, and real-time insights
            for a smarter path to recovery.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white/10 backdrop-blur border border-white/15 p-4 rounded-2xl text-center">
              <Icon className="w-4 h-4 text-blue-200 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-blue-200 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-100">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-surface-900 tracking-tight">RecoveryOS</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
