'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import Link from 'next/link'
import { User, DollarSign, Calendar, Award, Heart, TrendingUp, AlertCircle } from 'lucide-react'

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadDashboard()
  }, [term, year])

  const loadDashboard = async () => {
    try {
      const res = await api.get('/parent/dashboard', { params: { term, year } })
      setChildren(res.data?.children || [])
      setSummary(res.data?.summary || {})
    } catch (error) {
      console.error('Load dashboard error:', error)
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

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Parent Portal</h1>
              <p className="text-pink-100 text-lg">Monitor your children's academic journey</p>
            </div>
            <div className="flex gap-3">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-5 py-3 rounded-xl border-0 bg-white/20 backdrop-blur-sm text-white font-semibold">
                <option value="Term 1" className="text-gray-900">Term 1</option>
                <option value="Term 2" className="text-gray-900">Term 2</option>
                <option value="Term 3" className="text-gray-900">Term 3</option>
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-5 py-3 rounded-xl border-0 bg-white/20 backdrop-blur-sm text-white font-semibold">
                <option value={2026} className="text-gray-900">2026</option>
                <option value={2025} className="text-gray-900">2025</option>
              </select>
            </div>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Children</p>
              <p className="text-3xl font-bold text-gray-900">{summary.total_children || 0}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Fees</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_fees || 0)}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Amount Paid</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_paid || 0)}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_outstanding || 0)}</p>
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Children</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <Link key={child.id} href={`/parent/children/${child.id}`}>
                  <div className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                        {child.first_name?.[0]}{child.last_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{child.first_name} {child.middle_name} {child.last_name}</h3>
                        <p className="text-sm text-gray-500">{child.admission_no}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Class:</span>
                        <span className="font-semibold text-gray-900">{child.class_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Gender:</span>
                        <span className="font-semibold text-gray-900">{child.gender}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${child.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {child.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {children.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-600">Contact the school to link your account with your children.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/parent/attendance">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-lg transition-all text-center cursor-pointer">
                <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 text-sm">Attendance</p>
              </div>
            </Link>
            <Link href="/parent/results">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-lg transition-all text-center cursor-pointer">
                <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 text-sm">Results</p>
              </div>
            </Link>
            <Link href="/parent/fees">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-lg transition-all text-center cursor-pointer">
                <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 text-sm">Fees</p>
              </div>
            </Link>
            <Link href="/parent/health">
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl hover:shadow-lg transition-all text-center cursor-pointer">
                <Heart className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 text-sm">Health</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
