import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AuthLayout() {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-white font-bold text-xl">RecoveryOS</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-6 text-balance">
            AI-Powered Recovery & Care Management
          </h1>
          <p className="text-sky-100 text-lg leading-relaxed max-w-md">
            Personalised care plans, intelligent monitoring, and real-time insights
            for patients, caregivers, and doctors.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Patients', value: '10K+' },
            { label: 'Recoveries', value: '98%' },
            { label: 'Doctors', value: '500+' },
          ].map((s) => (
            <div key={s.label} className="glass p-4 rounded-2xl text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sky-200 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
