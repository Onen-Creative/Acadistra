'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { ArrowLeft } from 'lucide-react'

export default function ExpenditureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [expenditure, setExpenditure] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExpenditure()
  }, [params.id])

  const loadExpenditure = async () => {
    try {
      const res = await api.get(`/finance/expenditure/${params.id}`)
      setExpenditure(res.data)
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

  if (!expenditure) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Expenditure record not found</p>
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
          <h1 className="text-2xl font-bold">Expenditure Details</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="text-lg font-semibold text-gray-900 mt-1">{expenditure.category}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(expenditure.amount)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Vendor</label>
              <p className="text-lg text-gray-900 mt-1">{expenditure.vendor || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Date</label>
              <p className="text-lg text-gray-900 mt-1">{new Date(expenditure.date).toLocaleDateString()}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Term</label>
              <p className="text-lg text-gray-900 mt-1">{expenditure.term || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Year</label>
              <p className="text-lg text-gray-900 mt-1">{expenditure.year || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Invoice Number</label>
              <p className="text-lg text-gray-900 mt-1">{expenditure.invoice_no || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                expenditure.status === 'approved' ? 'bg-green-100 text-green-700' :
                expenditure.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {expenditure.status}
              </span>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Recorded On</label>
              <p className="text-lg text-gray-900 mt-1">{new Date(expenditure.created_at).toLocaleString()}</p>
            </div>
          </div>

          {expenditure.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-900 mt-1 p-4 bg-gray-50 rounded-lg">{expenditure.description}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
