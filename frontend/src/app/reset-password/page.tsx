'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { GraduationCap, Mail, ArrowLeft, CheckCircle, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/services/api'

const resetSchema = z.object({
  email: z.string().email('Valid email required'),
})

const confirmSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetForm = z.infer<typeof resetSchema>
type ConfirmForm = z.infer<typeof confirmSchema>

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'success'>('request')
  const [isConfirmMode, setIsConfirmMode] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const { register: registerRequest, handleSubmit: handleSubmitRequest, formState: { errors: errorsRequest, isSubmitting: isSubmittingRequest } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const { register: registerConfirm, handleSubmit: handleSubmitConfirm, formState: { errors: errorsConfirm, isSubmitting: isSubmittingConfirm } } = useForm<ConfirmForm>({
    resolver: zodResolver(confirmSchema),
  })

  useEffect(() => {
    if (token) {
      setIsConfirmMode(true)
    }
  }, [token])

  const onSubmitRequest = async (data: ResetForm) => {
    try {
      await api.post('/api/v1/auth/password-reset/request', { email: data.email })
      setStep('success')
      notifications.show({ title: 'Success', message: 'Check your email for password reset link', color: 'green' })
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to process request', color: 'red' })
    }
  }

  const onSubmitConfirm = async (data: ConfirmForm) => {
    try {
      await api.post('/api/v1/auth/password-reset/confirm', { token, new_password: data.password })
      notifications.show({ title: 'Success', message: 'Password reset successfully! You can now login.', color: 'green' })
      setTimeout(() => router.push('/login'), 2000)
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to reset password', color: 'red' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-2xl mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-blue-200">{isConfirmMode ? 'Set your new password' : 'We\'ll send you a reset link'}</p>
        </div>

        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/30">
          {!isConfirmMode ? (
            // Request Reset Form
            step === 'request' ? (
              <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    {...registerRequest('email')}
                    placeholder="your.email@acadistra.com"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300"
                  />
                  {errorsRequest.email && <p className="text-red-500 text-sm">{errorsRequest.email.message}</p>}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> You&apos;ll receive a password reset link via email. Click the link to set your new password.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  {isSubmittingRequest ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Check Your Email</h3>
                <p className="text-gray-600">
                  We&apos;ve sent a password reset link to your email. Click the link to set your new password.
                </p>
                <p className="text-sm text-gray-500">
                  The link will expire in 1 hour.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  Return to Login
                </button>
              </div>
            )
          ) : (
            // Confirm Reset Form
            <form onSubmit={handleSubmitConfirm(onSubmitConfirm)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  New Password
                </label>
                <input
                  type="password"
                  {...registerConfirm('password')}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300"
                />
                {errorsConfirm.password && <p className="text-red-500 text-sm">{errorsConfirm.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  {...registerConfirm('confirmPassword')}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300"
                />
                {errorsConfirm.confirmPassword && <p className="text-red-500 text-sm">{errorsConfirm.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmittingConfirm}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
              >
                {isSubmittingConfirm ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
