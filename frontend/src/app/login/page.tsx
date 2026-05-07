'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { GraduationCap, Mail, Lock, ArrowRight, Sparkles, BookOpen, DollarSign, Users, BarChart3, Shield, Zap, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })
  const router = useRouter()

  const onSubmit = async (data: LoginForm) => {
    try {
      const isPhone = /^[0-9+]+$/.test(data.identifier)
      const payload = isPhone 
        ? { phone: data.identifier, password: data.password }
        : { email: data.identifier, password: data.password }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (res.ok) {
        localStorage.setItem('access_token', result.tokens.access_token)
        localStorage.setItem('refresh_token', result.tokens.refresh_token)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('user_role', result.user.role)
        
        notifications.show({ title: 'Success', message: 'Welcome back!', color: 'green' })
        
        const route = result.user.role === 'parent' ? '/parent'
          : result.user.role === 'system_admin' ? '/dashboard/system-admin' 
          : result.user.role === 'school_admin' ? '/dashboard/school-admin'
          : result.user.role === 'director_of_studies' ? '/dashboard'
          : result.user.role === 'nurse' ? '/clinic'
          : result.user.role === 'storekeeper' ? '/storekeeper'
          : '/dashboard'
        
        window.location.href = route
      } else {
        notifications.show({ title: 'Error', message: result.error || 'Login failed', color: 'red' })
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Connection failed', color: 'red' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
      </div>

      <div className="w-full max-w-7xl relative z-10 flex gap-8 items-center">
        {/* Left Panel - Testimonials & Trust */}
        <div className="hidden lg:flex flex-1 flex-col animate-slide-in-left">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="flex items-center gap-4 mb-8 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-xl animate-float">
                <GraduationCap className="w-9 h-9 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white mb-1">
                  Acadistra
                </h2>
                <p className="text-sm text-blue-200">Modern School Management</p>
              </div>
            </div>
            
            {/* Testimonial */}
            <div className="mb-8 animate-fade-in-delay-1">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-white/90 text-lg leading-relaxed mb-4 italic">
                  "Acadistra has transformed how we manage our school. The offline marks entry and automated grading save us hours every term."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                    TM
                  </div>
                  <div>
                    <p className="text-white font-semibold">School Administrator</p>
                    <p className="text-blue-200 text-sm">Secondary School, Uganda</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in-delay-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-all">
                <Users className="w-8 h-8 text-blue-300 mb-2" />
                <p className="text-3xl font-bold text-white">4+</p>
                <p className="text-sm text-blue-200">Schools Using</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-all">
                <Shield className="w-8 h-8 text-green-300 mb-2" />
                <p className="text-3xl font-bold text-white">100%</p>
                <p className="text-sm text-green-200">UNEB Compliant</p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="space-y-3 animate-fade-in-delay-3">
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Offline-ready marks entry</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Mobile money integration</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Automated SMS alerts</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Complete audit trails</span>
              </div>
            </div>

            {/* Support Contact */}
            <div className="mt-8 pt-6 border-t border-white/20 animate-fade-in-delay-4">
              <p className="text-white/80 text-sm mb-3">Need help?</p>
              <div className="flex flex-col gap-2">
                <a href="mailto:admin@acadistra.com" className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">admin@acadistra.com</span>
                </a>
                <a href="https://wa.me/256784828791" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-200 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="text-sm">+256 784 828 791</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full lg:w-[440px] flex-shrink-0 animate-slide-in-right">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-2xl mb-4 animate-float">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-2 animate-gradient">
              Acadistra
            </h1>
            <p className="text-blue-200 flex items-center justify-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-blue-300 animate-pulse" />
              Sign in to your account
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/30 hover:shadow-blue-500/20 transition-all duration-500">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2 animate-fade-in-delay-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  {...register('identifier')}
                  placeholder="email@acadistra.com or 0700123456"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300 bg-white hover:border-gray-300"
                />
                {errors.identifier && <p className="text-red-500 text-sm animate-shake">{errors.identifier.message}</p>}
              </div>

              <div className="space-y-2 animate-fade-in-delay-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register('password')}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300 bg-white hover:border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm animate-shake">{errors.password.message}</p>}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => router.push('/reset-password')}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-indigo-500/50 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group animate-fade-in-delay-3"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-blue-200 mt-6 animate-fade-in-delay-4">
            🇺🇬 Empowering Ugandan schools with world-class management tools
          </p>
        </div>
      </div>
    </div>
  )
}
