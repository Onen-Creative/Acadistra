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
        {/* Features Panel */}
        <div className="hidden lg:flex flex-1 flex-col animate-slide-in-left">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="flex items-center gap-4 mb-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-xl animate-float">
                <GraduationCap className="w-9 h-9 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white mb-1">
                  Acadistra
                </h2>
                <p className="text-sm text-blue-200">Excellence in School Management</p>
              </div>
            </div>
            
            <p className="text-white/90 mb-8 text-lg leading-relaxed animate-fade-in-delay-1">
              Transform your school operations with Uganda's most comprehensive management system. Built for ECCE → S6 with full UNEB & NCDC compliance.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 backdrop-blur-sm hover:scale-105 transition-all duration-300 animate-fade-in-delay-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">Academic Excellence</h3>
                  <p className="text-sm text-blue-100 leading-relaxed">Complete student management, marks entry, UNEB grading, and automated report cards</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 backdrop-blur-sm hover:scale-105 transition-all duration-300 animate-fade-in-delay-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">Finance & Payroll</h3>
                  <p className="text-sm text-purple-100 leading-relaxed">Streamlined fee management, expense tracking, and automated payroll processing</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 backdrop-blur-sm hover:scale-105 transition-all duration-300 animate-fade-in-delay-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">Smart Operations</h3>
                  <p className="text-sm text-emerald-100 leading-relaxed">Attendance tracking, library management, clinic records, and parent portal</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 backdrop-blur-sm hover:scale-105 transition-all duration-300 animate-fade-in-delay-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">Multi-Role Access</h3>
                  <p className="text-sm text-amber-100 leading-relaxed">Role-based dashboards for admins, teachers, bursars, librarians, nurses, and parents</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 animate-fade-in-delay-6">
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                <Shield className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">UNEB</p>
                <p className="text-xs text-blue-200 mt-1">Compliant</p>
              </div>
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                <Zap className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">Offline</p>
                <p className="text-xs text-purple-200 mt-1">Ready</p>
              </div>
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                <GraduationCap className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">ECCE→S6</p>
                <p className="text-xs text-emerald-200 mt-1">All Levels</p>
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
