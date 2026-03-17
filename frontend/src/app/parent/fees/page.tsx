'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { MobileMoneyPayment } from '@/components/MobileMoneyPayment'
import { api } from '@/services/api'
import { DollarSign, CreditCard, Calendar, CheckCircle, Smartphone } from 'lucide-react'

export default function ParentFeesPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const [fees, setFees] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) loadFees()
  }, [selectedChild, term, year])

  const loadChildren = async () => {
    try {
      const res = await api.get('/api/v1/parent/dashboard')
      const childrenData = res.data?.children || []
      setChildren(childrenData)
      if (childrenData.length > 0) setSelectedChild(childrenData[0])
    } catch (error) {
      console.error('Load children error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFees = async () => {
    if (!selectedChild) return
    try {
      const res = await api.get(`/parent/children/${selectedChild.id}/fees`, { params: { term, year } })
      setFees(res.data?.fees || null)
      setPayments(res.data?.payments || [])
    } catch (error) {
      console.error('Load fees error:', error)
      setFees(null)
      setPayments([])
    }
  }

  const formatCurrency = (amount: number) => `UGX ${amount?.toLocaleString() || 0}`

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    loadFees()
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl text-white">
          <h1 className="text-4xl font-bold mb-3">Fees Management</h1>
          <p className="text-purple-100 text-lg">Track fees and payment history</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
              <select value={selectedChild?.id || ''} onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.first_name} {child.last_name} - {child.class_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
        </div>

        {fees ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Fees</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(fees.total_fees)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(fees.amount_paid)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                    <CreditCard className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Outstanding</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(fees.outstanding)}</p>
              </div>
            </div>

            {fees.fee_breakdown && Object.keys(fees.fee_breakdown).length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Fee Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(fees.fee_breakdown).map(([category, total]: [string, any]) => {
                    const paid = fees.paid_breakdown?.[category] || 0
                    const outstanding = total - paid
                    return (
                      <div key={category} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-900 capitalize">{category}</span>
                          <span className="text-sm text-gray-600">{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Paid: {formatCurrency(paid)}</span>
                          <span className="text-red-600">Outstanding: {formatCurrency(outstanding)}</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-green-600" 
                            style={{ width: `${(paid / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Receipt No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                          {payment.payment_breakdown && Object.keys(payment.payment_breakdown).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-blue-600 cursor-pointer">View breakdown</summary>
                              <div className="mt-1 text-xs space-y-1">
                                {Object.entries(payment.payment_breakdown).map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-600 capitalize">{key}:</span>
                                    <span className="font-medium">{formatCurrency(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {payment.payment_method || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{payment.receipt_no || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No payment records found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl border border-blue-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Progress</h3>
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-sm font-bold" 
                  style={{ width: `${(fees.amount_paid / fees.total_fees) * 100}%` }}
                >
                  {Math.round((fees.amount_paid / fees.total_fees) * 100)}%
                </div>
              </div>
              <div className="flex justify-between mt-3 text-sm text-gray-600">
                <span>Paid: {formatCurrency(fees.amount_paid)}</span>
                <span>Remaining: {formatCurrency(fees.outstanding)}</span>
              </div>
            </div>

            {fees.outstanding > 0 && (
              <button
                onClick={() => setShowPayment(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" />
                Pay with Mobile Money
              </button>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Fees Record</h3>
            <p className="text-gray-600">No fees information available for this term</p>
          </div>
        )}

        {showPayment && fees && selectedChild && (
          <MobileMoneyPayment
            studentFeesId={fees.id}
            outstandingAmount={fees.outstanding}
            studentName={`${selectedChild.first_name} ${selectedChild.last_name}`}
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowPayment(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
