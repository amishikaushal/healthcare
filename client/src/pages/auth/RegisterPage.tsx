import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, HeartPulse } from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'

const schema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must include uppercase')
    .regex(/[0-9]/, 'Must include number')
    .regex(/[!@#$%^&*]/, 'Must include special character'),
  role: z.enum(['patient', 'caregiver', 'doctor']),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', data)
      toast.success('Account created! Please verify your email.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-surface-900 text-xl">RecoveryOS</span>
      </div>

      <h2 className="text-3xl font-bold text-surface-900 mb-2">Create account</h2>
      <p className="text-surface-500 mb-8">Start your recovery journey today</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">First name</label>
            <input {...register('firstName')} placeholder="John" className="input" />
            {errors.firstName && <p className="mt-1 text-xs text-danger-500">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Last name</label>
            <input {...register('lastName')} placeholder="Doe" className="input" />
            {errors.lastName && <p className="mt-1 text-xs text-danger-500">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Email</label>
          <input {...register('email')} type="email" placeholder="you@example.com" className="input" />
          {errors.email && <p className="mt-1 text-xs text-danger-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPw ? 'text' : 'password'}
              placeholder="Min 8 chars with uppercase, number, symbol"
              className="input pr-12 text-sm"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-700">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-danger-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">I am a…</label>
          <div className="grid grid-cols-3 gap-3">
            {(['patient', 'caregiver', 'doctor'] as const).map((r) => (
              <label key={r} className="relative cursor-pointer">
                <input {...register('role')} type="radio" value={r} className="peer sr-only" />
                <div className="glass p-3 rounded-xl text-center text-sm capitalize text-surface-500
                  peer-checked:bg-brand-600/20 peer-checked:border-brand-500 peer-checked:text-brand-300
                  transition-all duration-200 hover:bg-surface-100">
                  {r}
                </div>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-2">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
      </p>
    </div>
  )
}
