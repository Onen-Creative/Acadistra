'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { GraduationCap, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'

const resetSchema = z.object({
  email: z.string().email('Valid email required'),
})

type ResetForm = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'success'>('request')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })
  const router = useRouter()

  const onSubmit = async (data: ResetForm) => {
    try {
      await api.post('/api/v1/auth/reset-password-request', { email: data.email })
      setStep('success')
      notifications.show({ title: 'Success', message: 'Contact your school admin to reset your password', color: 'green' })
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to process request', color: 'red' })
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
          <p className="text-blue-200">Contact your school administrator</p>
        </div>

        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/30">
          {step === 'request' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Your Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="your.email@school.ug"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-300"
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Your school administrator will be notified to reset your password. You'll receive new credentials via email.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Request Password Reset'}
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
              <h3 className="text-xl font-bold text-gray-900">Request Submitted</h3>
              <p className="text-gray-600">
                Your school administrator has been notified. You'll receive an email with your new password shortly.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
