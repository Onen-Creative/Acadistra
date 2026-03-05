'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { GraduationCap, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
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

      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10 flex gap-8 items-center">
        <div className="hidden lg:flex flex-1 flex-col space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Complete School Management Solution
            </h2>
            <p className="text-gray-600 mb-6">
              Acadistra is a comprehensive system designed specifically for Ugandan schools (ECCE → S6) with full UNEB/NCDC grading compliance.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📚</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Academic Management</h3>
                  <p className="text-sm text-gray-600">Student registration, class management, marks entry, report cards generation with UNEB grading</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Staff & Payroll</h3>
                  <p className="text-sm text-gray-600">Teacher management, salary structures, monthly payroll processing, payment tracking</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Attendance & Library</h3>
                  <p className="text-sm text-gray-600">Daily attendance tracking, library book management, health clinic records</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Finance & Inventory</h3>
                  <p className="text-sm text-gray-600">Fee management, expense tracking, inventory control, comprehensive reporting</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                Support: <a href="mailto:onendavid23@gmail.com" className="text-indigo-600 hover:underline">onendavid23@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4 transform hover:scale-110 transition-transform duration-300">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Acadistra
            </h1>
            <p className="text-gray-600 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Sign in to your account
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  {...register('identifier')}
                  placeholder="email@school.ug or 0700123456"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300 bg-white/50"
                />
                {errors.identifier && <p className="text-red-500 text-sm">{errors.identifier.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  Password
                </label>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300 bg-white/50"
                />
                {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
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

          <p className="text-center text-sm text-gray-500 mt-6">
            Excellence in school management for Ugandan schools (ECCE → S6)
          </p>
        </div>
      </div>
    </div>
  )
}
