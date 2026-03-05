'use client'

import { useState } from 'react'
import { api } from '@/services/api'
import { CreditCard, Smartphone, X, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface MobileMoneyPaymentProps {
  studentFeesId: string
  outstandingAmount: number
  studentName: string
  onSuccess?: () => void
  onClose?: () => void
}

export function MobileMoneyPayment({ studentFeesId, outstandingAmount, studentName, onSuccess, onClose }: MobileMoneyPaymentProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form')
  const [amount, setAmount] = useState(outstandingAmount.toString())
  const [phoneNumber, setPhoneNumber] = useState('')
  const [network, setNetwork] = useState<'MTN' | 'AIRTEL'>('MTN')
  const [email, setEmail] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStep('processing')

    try {
      const res = await api.post('/payments/mobile-money', {
        student_fees_id: studentFeesId,
        amount: parseFloat(amount),
        phone_number: phoneNumber,
        network,
        email: email || undefined
      })

      setPaymentId(res.data.payment_id)

      // Open payment link in new window
      if (res.data.payment_link) {
        window.open(res.data.payment_link, '_blank')
      }

      // Poll for payment status
      pollPaymentStatus(res.data.payment_id)
    } catch (error: any) {
      setStep('error')
      setErrorMessage(error.response?.data?.error || 'Payment initiation failed')
      setLoading(false)
    }
  }

  const pollPaymentStatus = async (id: string) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes (5 seconds interval)

    const interval = setInterval(async () => {
      attempts++

      try {
        const res = await api.get(`/payments/${id}/verify`)

        if (res.data.status === 'success') {
          clearInterval(interval)
          setStep('success')
          setLoading(false)
          setTimeout(() => {
            onSuccess?.()
          }, 2000)
        } else if (res.data.status === 'failed') {
          clearInterval(interval)
          setStep('error')
          setErrorMessage('Payment failed. Please try again.')
          setLoading(false)
        }
      } catch (error) {
        console.error('Verification error:', error)
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setStep('error')
        setErrorMessage('Payment verification timeout. Please check payment history.')
        setLoading(false)
      }
    }, 5000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        )}

        {step === 'form' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Pay with Mobile Money</h2>
                <p className="text-sm text-gray-600">For {studentName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (UGX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={outstandingAmount}
                  min="1000"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent font-bold text-lg"
                  placeholder="500000"
                />
                <p className="text-xs text-gray-500 mt-1">Outstanding: UGX {outstandingAmount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Network</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNetwork('MTN')}
                    className={`p-4 rounded-xl border-2 font-semibold transition ${
                      network === 'MTN'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">📱</div>
                      <div>MTN</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNetwork('AIRTEL')}
                    className={`p-4 rounded-xl border-2 font-semibold transition ${
                      network === 'AIRTEL'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">📱</div>
                      <div>Airtel</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+256700000000 or 0700000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="parent@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pay UGX {parseFloat(amount || '0').toLocaleString()}
              </button>
            </form>

            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-800">
                <strong>How it works:</strong> You'll receive a prompt on your phone to enter your Mobile Money PIN. Complete the payment and we'll automatically update your balance.
              </p>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment...</h3>
            <p className="text-gray-600 mb-4">Check your phone for the payment prompt</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              <p className="font-semibold mb-1">📱 Complete payment on your phone</p>
              <p>Enter your Mobile Money PIN when prompted</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">Waiting for payment confirmation...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">UGX {parseFloat(amount).toLocaleString()} has been paid</p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <p>✅ Fees balance updated</p>
              <p>✅ SMS confirmation sent</p>
              <p>✅ Receipt emailed</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h3>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => setStep('form')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
