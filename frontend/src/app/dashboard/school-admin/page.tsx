'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import Link from 'next/link'
import { Users, GraduationCap, BookOpen, DollarSign, TrendingUp, TrendingDown, Calendar, Award, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function SchoolAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
    loadDashboard()
  }, [term, year])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [studentsRes, staffRes, classesRes, feesRes, attendanceRes, financeRes] = await Promise.all([
        api.get('/api/v1/students', { params: { limit: -1 } }),
        api.get('/api/v1/staff'),
        api.get('/api/v1/classes'),
        api.get('/api/v1/fees', { params: { term, year: year.toString(), limit: -1 } }), // Fetch ALL fees without pagination
        api.get('/api/v1/attendance/stats', { params: { period: 'today' } }).catch(() => ({ data: { present: 0, total_days: 0, percentage: 0 } })),
        api.get('/api/v1/finance/summary', { params: { term, year: year.toString() } })
      ])

      const students = Array.isArray(studentsRes.data?.students) ? studentsRes.data.students : []
      const totalStudents = studentsRes.data?.total || students.length
      const staff = Array.isArray(staffRes.data) ? staffRes.data : (Array.isArray(staffRes.data?.staff) ? staffRes.data.staff : [])
      const classes = Array.isArray(classesRes.data) ? classesRes.data : (Array.isArray(classesRes.data?.classes) ? classesRes.data.classes : [])
      const fees = Array.isArray(feesRes.data?.fees) ? feesRes.data.fees : []
      const attendance = attendanceRes.data || {}
      const finance = financeRes.data || {}

      setStats({
        students: {
          total: totalStudents, // Use the accurate total count
          active: students.filter((s: any) => s.status === 'active').length,
          male: students.filter((s: any) => s.gender === 'Male').length,
          female: students.filter((s: any) => s.gender === 'Female').length,
          recent: students.slice(0, 5)
        },
        staff: {
          total: staff.length,
          active: staff.filter((s: any) => s.status === 'active').length,
          teachers: staff.filter((s: any) => s.role === 'Teacher').length,
          support: staff.filter((s: any) => s.role !== 'Teacher').length
        },
        classes: {
          total: classes.length,
          list: classes.slice(0, 6)
        },
        fees: {
          expected: fees.reduce((sum: number, f: any) => sum + (parseFloat(f.total_fees) || 0), 0),
          collected: fees.reduce((sum: number, f: any) => sum + (parseFloat(f.amount_paid) || 0), 0),
          outstanding: fees.reduce((sum: number, f: any) => sum + (parseFloat(f.outstanding) || 0), 0),
          collectionRate: (() => {
            const expected = fees.reduce((sum: number, f: any) => sum + (parseFloat(f.total_fees) || 0), 0)
            const collected = fees.reduce((sum: number, f: any) => sum + (parseFloat(f.amount_paid) || 0), 0)
            return expected > 0 ? Math.min((collected / expected * 100), 100) : 0
          })()
        },
        attendance: {
          rate: Math.min(attendance.percentage || 0, 100),
          present: attendance.present || 0,
          absent: attendance.absent || 0,
          total: attendance.total_days || 0
        },
        finance: {
          income: finance.total_income || 0,
          expenditure: finance.total_expenditure || 0,
          balance: finance.net_balance || 0
        }
      })
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-blue-600 absolute top-0"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">{user?.school?.name || 'School Dashboard'}</h1>
              <p className="text-blue-100 text-lg">Comprehensive overview of all school activities</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Calendar className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">{term} {year}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-5 py-3 rounded-xl border-0 focus:ring-2 focus:ring-white/50 bg-white/20 backdrop-blur-sm text-white font-semibold shadow-lg">
                <option value="Term 1" className="text-gray-900">Term 1</option>
                <option value="Term 2" className="text-gray-900">Term 2</option>
                <option value="Term 3" className="text-gray-900">Term 3</option>
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-5 py-3 rounded-xl border-0 focus:ring-2 focus:ring-white/50 bg-white/20 backdrop-blur-sm text-white font-semibold shadow-lg">
                <option value={2026} className="text-gray-900">2026</option>
                <option value={2025} className="text-gray-900">2025</option>
                <option value={2024} className="text-gray-900">2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/students" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <Users className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Students</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.students?.total || 0}</p>
                <div className="flex items-center gap-4 text-xs text-blue-100">
                  <span>👨 {stats?.students?.male || 0} Male</span>
                  <span>👩 {stats?.students?.female || 0} Female</span>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/staff" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <GraduationCap className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Total Staff</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.staff?.total || 0}</p>
                <div className="flex items-center gap-4 text-xs text-emerald-100">
                  <span>👨‍🏫 {stats?.staff?.teachers || 0} Teachers</span>
                  <span>👥 {stats?.staff?.support || 0} Support</span>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/classes" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <BookOpen className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <Award className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-purple-100 text-sm font-medium mb-1">Active Classes</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.classes?.total || 0}</p>
                <p className="text-xs text-purple-100">Across all levels</p>
              </div>
            </div>
          </Link>

          <Link href="/attendance" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <CheckCircle className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-orange-100 text-sm font-medium mb-1">Attendance Rate</p>
                <p className="text-white text-4xl font-bold mb-2">{Math.round(stats?.attendance?.rate || 0)}%</p>
                <p className="text-xs text-orange-100">{stats?.attendance?.present || 0} present today</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">Income</span>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Total Income</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats?.finance?.income || 0)}</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-50 to-orange-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">Expenditure</span>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Total Expenditure</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats?.finance?.expenditure || 0)}</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-orange-600 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Balance</span>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Net Balance</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats?.finance?.balance || 0)}</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>

        {/* Fees Collection Analytics */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Fees Collection Analytics</h2>
                <p className="text-sm text-gray-600">Track school fees collection performance</p>
              </div>
              <Link href="/fees" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                Manage Fees
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <p className="text-sm text-blue-600 font-medium mb-2">Expected</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats?.fees?.expected || 0)}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <p className="text-sm text-green-600 font-medium mb-2">Collected</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(stats?.fees?.collected || 0)}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                <p className="text-sm text-red-600 font-medium mb-2">Outstanding</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(stats?.fees?.outstanding || 0)}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <p className="text-sm text-purple-600 font-medium mb-2">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-900">{Math.round(stats?.fees?.collectionRate || 0)}%</p>
              </div>
            </div>
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute inset-0 flex">
                <div className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${Math.min(stats?.fees?.collectionRate || 0, 100)}%` }}>
                  {stats?.fees?.collectionRate > 10 && `${Math.round(Math.min(stats?.fees?.collectionRate, 100))}% Collected`}
                </div>
                <div className="bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${Math.max(100 - (stats?.fees?.collectionRate || 0), 0)}%` }}>
                  {(100 - (stats?.fees?.collectionRate || 0)) > 10 && `${Math.round(Math.max(100 - (stats?.fees?.collectionRate || 0), 0))}% Pending`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Quick Actions</span>
            <div className="ml-4 h-1 flex-1 bg-gradient-to-r from-blue-600/20 to-transparent rounded"></div>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Add Student', icon: '👨‍🎓', color: 'from-blue-500 to-blue-600', link: '/students/register' },
              { title: 'Add Staff', icon: '👨‍🏫', color: 'from-emerald-500 to-emerald-600', link: '/staff/register' },
              { title: 'Mark Attendance', icon: '✅', color: 'from-orange-500 to-orange-600', link: '/attendance' },
              { title: 'Enter Marks', icon: '📝', color: 'from-purple-500 to-purple-600', link: '/marks/enter' },
              { title: 'Generate Reports', icon: '📊', color: 'from-pink-500 to-pink-600', link: '/reports' },
              { title: 'Manage Library', icon: '📚', color: 'from-indigo-500 to-indigo-600', link: '/library' },
              { title: 'Health Records', icon: '🏥', color: 'from-red-500 to-red-600', link: '/clinic' },
              { title: 'View Finance', icon: '💰', color: 'from-green-500 to-green-600', link: '/finance' }
            ].map((action, idx) => (
              <Link key={idx} href={action.link} className="group">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-transparent transform hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    {action.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{action.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity & Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Recent Students</h3>
                <Link href="/students" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center group">
                  View all
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {Array.isArray(stats?.students?.recent) && stats.students.recent.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {student.first_name[0]}{student.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}</p>
                      <p className="text-sm text-gray-500">{student.admission_no}</p>
                    </div>
                  </div>
                  <Link href={`/students/${student.id}`} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Active Classes</h3>
                <Link href="/classes" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center group">
                  Manage
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {Array.isArray(stats?.classes?.list) && stats.classes.list.map((classItem: any) => (
                <div key={classItem.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-purple-50 transition-all border border-transparent hover:border-purple-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{classItem.name}</p>
                      <p className="text-sm text-gray-500">{classItem.level} • {classItem.student_count || 0} students</p>
                    </div>
                  </div>
                  <Link href={`/classes?level=${classItem.level}`} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 transition-colors">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
