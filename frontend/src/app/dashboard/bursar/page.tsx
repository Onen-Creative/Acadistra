'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react'

export default function BursarDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadDashboardData()
  }, [term, year])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [feesRes, financeRes] = await Promise.all([
        api.get('/api/v1/fees', { params: { term, year } }),
        api.get('/api/v1/finance/summary', { params: { term, year } })
      ])

      const feesData = feesRes.data?.fees || []
      
      // Calculate totals for the selected term and year across ALL classes
      const totalExpected = feesData.reduce((sum: number, f: any) => sum + (parseFloat(f.total_fees) || 0), 0)
      const totalCollected = feesData.reduce((sum: number, f: any) => sum + (parseFloat(f.amount_paid) || 0), 0)
      const totalOutstanding = feesData.reduce((sum: number, f: any) => sum + (parseFloat(f.outstanding) || 0), 0)
      
      setStats({
        fees_expected: totalExpected,
        fees_collected: totalCollected,
        fees_outstanding: totalOutstanding,
        total_income: financeRes.data?.total_income || 0,
        total_expenditure: financeRes.data?.total_expenditure || 0,
        net_balance: financeRes.data?.net_balance || 0
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bursar Dashboard</h1>
            <p className="text-gray-500 mt-1">Financial Management & Reporting</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-2 border rounded-lg w-24" />
          </div>
        </div>

        {/* School Fees Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">School Fees Overview - {term} {year} (All Classes)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Expected</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.fees_expected || 0)}</p>
                  <p className="text-blue-100 text-xs mt-2">All classes combined</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Collected</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.fees_collected || 0)}</p>
                  <p className="text-green-100 text-xs mt-2">
                    {stats?.fees_expected > 0 ? ((stats?.fees_collected / stats?.fees_expected) * 100).toFixed(1) : 0}% collection rate
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingUp className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Total Outstanding</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.fees_outstanding || 0)}</p>
                  <p className="text-red-100 text-xs mt-2">Pending payment</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingDown className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Finance Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General Finance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Income</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.total_income || 0)}</p>
                  <p className="text-emerald-100 text-xs mt-2">All sources</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingUp className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Total Expenditure</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.total_expenditure || 0)}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingDown className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Net Balance</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.net_balance || 0)}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/fees" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">Manage Fees</span>
              </div>
            </Link>

            <Link href="/finance" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
                <div className="p-3 bg-green-100 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">Finance</span>
              </div>
            </Link>

            <Link href="/fees/reports" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">Reports</span>
              </div>
            </Link>

            <Link href="/students" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">Students</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
