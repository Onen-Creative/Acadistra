'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { User, DollarSign, Calendar, Award, Heart, ArrowLeft, TrendingUp, Clock, FileText } from 'lucide-react'

export default function ChildDetailsPage() {
  const params = useParams()
  const studentId = params.id
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (studentId) loadChildData()
  }, [studentId, term, year])

  const loadChildData = async () => {
    try {
      const res = await api.get(`/parent/children/${studentId}`, { params: { term, year } })
      setData(res.data)
    } catch (error) {
      console.error('Load child data error:', error)
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

  const student = data?.student
  const fees = data?.fees
  const results = data?.results || []
  const attendance = data?.attendance || {}
  const health = data?.health

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/parent/dashboard">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Child Details</h1>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl border border-blue-200 p-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {student?.first_name?.[0]}{student?.last_name?.[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{student?.first_name} {student?.middle_name} {student?.last_name}</h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1 bg-white/80 rounded-full font-medium text-gray-700">📚 {student?.class_name || 'N/A'}</span>
                <span className="px-3 py-1 bg-white/80 rounded-full font-medium text-gray-700">🎓 {student?.admission_no}</span>
                <span className="px-3 py-1 bg-white/80 rounded-full font-medium text-gray-700">👤 {student?.gender}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-300 bg-white font-semibold">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-2 rounded-xl border border-gray-300 bg-white font-semibold">
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Attendance Rate</p>
            <p className="text-3xl font-bold text-gray-900">{Math.round(attendance.attendance_rate || 0)}%</p>
            <p className="text-xs text-gray-500 mt-2">{attendance.present || 0} days present</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Subjects</p>
            <p className="text-3xl font-bold text-gray-900">{results.length}</p>
            <p className="text-xs text-gray-500 mt-2">This term</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Fees Paid</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(fees?.amount_paid || 0)}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(fees?.outstanding || 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Academic Performance</h3>
              </div>
              <Link href={`/parent/results?child=${studentId}`}>
                <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">View All</button>
              </Link>
            </div>
            <div className="space-y-3">
              {results.slice(0, 5).map((result: any) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="font-medium text-gray-900">{result.subject?.name || result.subject_name}</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.final_grade?.startsWith('D') ? 'bg-green-100 text-green-700' : result.final_grade?.startsWith('C') ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {result.final_grade}
                    </span>
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No results available</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Fees Statement</h3>
              </div>
              <Link href={`/parent/fees?child=${studentId}`}>
                <button className="text-green-600 hover:text-green-700 font-semibold text-sm">View Details</button>
              </Link>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600 font-medium mb-1">Total Fees</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(fees?.total_fees || 0)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-600 font-medium mb-1">Amount Paid</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(fees?.amount_paid || 0)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-red-600 font-medium mb-1">Outstanding</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(fees?.outstanding || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Attendance</h3>
              </div>
              <Link href={`/parent/attendance?child=${studentId}`}>
                <button className="text-orange-600 hover:text-orange-700 font-semibold text-sm">View All</button>
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <span className="text-green-700 font-medium">Present</span>
                <span className="text-2xl font-bold text-green-900">{attendance.present || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <span className="text-red-700 font-medium">Absent</span>
                <span className="text-2xl font-bold text-red-900">{attendance.absent || 0}</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600" style={{ width: `${attendance.attendance_rate || 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Health</h3>
              </div>
              <Link href={`/parent/health?child=${studentId}`}>
                <button className="text-red-600 hover:text-red-700 font-semibold text-sm">View Details</button>
              </Link>
            </div>
            <div className="space-y-3">
              {health ? (
                <>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">Blood Group</p>
                    <p className="font-bold text-gray-900">{health.blood_group || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">Allergies</p>
                    <p className="font-bold text-gray-900">{health.allergies || 'None'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">Chronic Conditions</p>
                    <p className="font-bold text-gray-900">{health.chronic_conditions || 'None'}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No health records</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
