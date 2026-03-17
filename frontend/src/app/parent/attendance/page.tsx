'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

export default function ParentAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [periods, setPeriods] = useState<any>(null)
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) loadAttendance()
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

  const loadAttendance = async () => {
    if (!selectedChild) return
    try {
      const res = await api.get(`/parent/children/${selectedChild.id}/attendance`, { params: { term, year } })
      setAttendance(res.data?.attendance || [])
      setPeriods(res.data?.periods || {})
    } catch (error) {
      console.error('Load attendance error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700'
      case 'absent': return 'bg-red-100 text-red-700'
      case 'late': return 'bg-yellow-100 text-yellow-700'
      case 'sick': return 'bg-orange-100 text-orange-700'
      case 'excused': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'absent': return <XCircle className="w-5 h-5 text-red-600" />
      case 'late': return <Clock className="w-5 h-5 text-yellow-600" />
      default: return <Calendar className="w-5 h-5 text-gray-600" />
    }
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
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl p-8 shadow-2xl text-white">
          <h1 className="text-4xl font-bold mb-3">Attendance Records</h1>
          <p className="text-green-100 text-lg">Track your child's school attendance</p>
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

        {periods && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <p className="text-gray-600 text-sm font-semibold mb-3">This Week</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{periods.this_week?.rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-500">{periods.this_week?.present || 0}/{periods.this_week?.total || 0} days</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <p className="text-gray-600 text-sm font-semibold mb-3">Last Week</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{periods.last_week?.rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-500">{periods.last_week?.present || 0}/{periods.last_week?.total || 0} days</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <p className="text-gray-600 text-sm font-semibold mb-3">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{periods.this_month?.rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-500">{periods.this_month?.present || 0}/{periods.this_month?.total || 0} days</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <p className="text-gray-600 text-sm font-semibold mb-3">Last Month</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{periods.last_month?.rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-500">{periods.last_month?.present || 0}/{periods.last_month?.total || 0} days</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">This Term</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{periods.this_term?.rate?.toFixed(1) || 0}%</p>
                <p className="text-sm text-gray-500">{periods.this_term?.present || 0} present, {periods.this_term?.absent || 0} absent, {periods.this_term?.late || 0} late</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Last Term</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{periods.last_term?.rate?.toFixed(1) || 0}%</p>
                <p className="text-sm text-gray-500">{periods.last_term?.present || 0} present, {periods.last_term?.absent || 0} absent, {periods.last_term?.late || 0} late</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">This Year</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{periods.this_year?.rate?.toFixed(1) || 0}%</p>
                <p className="text-sm text-gray-500">{periods.this_year?.present || 0} present, {periods.this_year?.absent || 0} absent, {periods.this_year?.late || 0} late</p>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Attendance History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record: any) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{new Date(record.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{record.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendance.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No attendance records found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
