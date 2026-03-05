'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { ArrowLeft } from 'lucide-react'

export default function IncomeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [income, setIncome] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIncome()
  }, [params.id])

  const loadIncome = async () => {
    try {
      const res = await api.get(`/finance/income/${params.id}`)
      setIncome(res.data)
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `UGX ${amount?.toLocaleString() || 0}`

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!income) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Income record not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Income Details</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="text-lg font-semibold text-gray-900 mt-1">{income.category}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(income.amount)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Source</label>
              <p className="text-lg text-gray-900 mt-1">{income.source || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Date</label>
              <p className="text-lg text-gray-900 mt-1">{new Date(income.date).toLocaleDateString()}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Term</label>
              <p className="text-lg text-gray-900 mt-1">{income.term || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Year</label>
              <p className="text-lg text-gray-900 mt-1">{income.year || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Receipt Number</label>
              <p className="text-lg text-gray-900 mt-1">{income.receipt_no || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Recorded On</label>
              <p className="text-lg text-gray-900 mt-1">{new Date(income.created_at).toLocaleString()}</p>
            </div>
          </div>

          {income.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-900 mt-1 p-4 bg-gray-50 rounded-lg">{income.description}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
