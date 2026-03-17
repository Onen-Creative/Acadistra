'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

export default function FeesReportsPage() {
  const [term, setTerm] = useState('Term1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async (period: string) => {
    setLoading(true)
    try {
      const params: any = { type: period }
      if (period === 'termly') {
        params.term = term
        params.year = year
      } else if (period === 'yearly') {
        params.year = year
      }
      const response = await api.get('/api/v1/fees/reports', { params })
      setReportData(response.data)
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (period: string) => {
    try {
      const params: any = { period }
      if (period === 'termly') {
        params.term = term
        params.year = year
      } else if (period === 'yearly') {
        params.year = year
      }
      const response = await api.get('/api/v1/finance/export-fees', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `fees_report_${period}_${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fees Reports</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium mb-3">Report Filters</h3>
          <div className="flex gap-4">
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="Term1">Term 1</option>
              <option value="Term2">Term 2</option>
              <option value="Term3">Term 3</option>
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-2 border rounded-lg" />
          </div>
        </div>

        {/* Report Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Generate Report</h2>
          <div className="space-y-4">
            <select onChange={(e) => e.target.value && generateReport(e.target.value)} className="w-full px-4 py-2 border rounded-lg" defaultValue="">
              <option value="" disabled>Choose period...</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="termly">Termly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Report Preview */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating report...</p>
          </div>
        )}

        {reportData && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Report Preview</h2>
              <button onClick={() => exportReport('termly')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Export Excel</button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Expected</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.fees?.reduce((sum: number, f: any) => sum + f.total_fees, 0) || 0)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.fees?.reduce((sum: number, f: any) => sum + f.amount_paid, 0) || 0)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(reportData.fees?.reduce((sum: number, f: any) => sum + f.outstanding, 0) || 0)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.payments?.slice(0, 10).map((payment: any) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-sm">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{payment.student_fees?.student?.first_name} {payment.student_fees?.student?.last_name}</td>
                      <td className="px-4 py-3 text-sm">{payment.student_fees?.student?.class?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-sm">{payment.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(reportData.payments?.length || 0) > 10 && (
                <p className="text-center text-sm text-gray-500 mt-4">Showing 10 of {reportData.payments?.length} records</p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
