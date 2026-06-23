import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, HeartPulse, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import toast from 'react-hot-toast'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate  = useNavigate()
  const { setUser, setTokens } = useAuthStore()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      const { user, accessToken, refreshToken } = res.data.data
      setUser(user)
      setTokens(accessToken, refreshToken)
      toast.success(`Welcome back, ${user.firstName}!`)
      navigate(
        user.role === 'doctor'    ? '/doctor/dashboard' :
        user.role === 'admin'     ? '/admin/dashboard' :
        user.role === 'caregiver' ? '/caregiver/dashboard' :
        '/dashboard'
      )
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-slate-100 text-xl">RecoveryOS</span>
      </div>

      <h2 className="text-3xl font-bold text-slate-100 mb-2">Welcome back</h2>
      <p className="text-slate-400 mb-8">Sign in to continue your recovery journey</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="input"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1.5 text-xs text-danger-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              className="input pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-danger-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input type="checkbox" className="rounded bg-surface-800 border-surface-700" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
          Create account
        </Link>
      </p>
    </div>
  )
}
