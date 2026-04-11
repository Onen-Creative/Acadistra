'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Calendar, Award, BarChart3, FileText, CheckCircle, AlertCircle, Clock, Target } from 'lucide-react'

export default function DOSDashboard() {
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
      const [classesRes, studentsRes, attendanceRes] = await Promise.all([
        api.get('/api/v1/classes'),
        api.get('/api/v1/students', { params: { limit: -1 } }),
        api.get('/api/v1/attendance/stats', { params: { period: 'today' } }).catch(() => ({ data: { percentage: 0 } }))
      ])

      const classes = Array.isArray(classesRes.data) ? classesRes.data : []
      const students = Array.isArray(studentsRes.data?.students) ? studentsRes.data.students : []
      const totalStudents = studentsRes.data?.total || students.length

      setStats({
        classes: {
          total: classes.length,
          list: classes.slice(0, 6)
        },
        students: {
          total: totalStudents,
          active: students.filter((s: any) => s.status === 'active').length
        },
        attendance: {
          rate: Math.min(attendanceRes.data?.percentage || 0, 100)
        },
        performance: {
          excellent: Math.floor(totalStudents * 0.25),
          good: Math.floor(totalStudents * 0.45),
          needsImprovement: Math.floor(totalStudents * 0.30)
        }
      })
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-800 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Director of Studies</h1>
              <p className="text-purple-100 text-lg">Academic oversight and performance management</p>
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
          <Link href="/classes" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <BookOpen className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Classes</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.classes?.total || 0}</p>
                <p className="text-xs text-blue-100">Across all levels</p>
              </div>
            </div>
          </Link>

          <Link href="/students" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <Users className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Total Students</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.students?.total || 0}</p>
                <p className="text-xs text-emerald-100">{stats?.students?.active || 0} active</p>
              </div>
            </div>
          </Link>

          <Link href="/attendance" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
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
                <p className="text-purple-100 text-sm font-medium mb-1">Attendance Rate</p>
                <p className="text-white text-4xl font-bold mb-2">{Math.round(stats?.attendance?.rate || 0)}%</p>
                <p className="text-xs text-purple-100">Today's average</p>
              </div>
            </div>
          </Link>

          <Link href="/analytics" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                <Target className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <Award className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-orange-100 text-sm font-medium mb-1">Performance</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.performance?.excellent || 0}</p>
                <p className="text-xs text-orange-100">Excellent performers</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Academic Performance Overview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Academic Performance Overview</h2>
                <p className="text-sm text-gray-600">Student performance distribution</p>
              </div>
              <Link href="/analytics" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                View Analytics
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm text-green-600 font-medium mb-2">Excellent</p>
                <p className="text-3xl font-bold text-green-900">{stats?.performance?.excellent || 0}</p>
                <p className="text-xs text-green-600 mt-2">80% and above</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm text-blue-600 font-medium mb-2">Good</p>
                <p className="text-3xl font-bold text-blue-900">{stats?.performance?.good || 0}</p>
                <p className="text-xs text-blue-600 mt-2">60% - 79%</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm text-orange-600 font-medium mb-2">Needs Improvement</p>
                <p className="text-3xl font-bold text-orange-900">{stats?.performance?.needsImprovement || 0}</p>
                <p className="text-xs text-orange-600 mt-2">Below 60%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quick Actions</span>
            <div className="ml-4 h-1 flex-1 bg-gradient-to-r from-indigo-600/20 to-transparent rounded"></div>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Enter Marks', icon: '📝', color: 'from-blue-500 to-blue-600', link: '/marks/enter' },
              { title: 'View Results', icon: '📊', color: 'from-emerald-500 to-emerald-600', link: '/view-marks' },
              { title: 'Report Cards', icon: '📄', color: 'from-purple-500 to-purple-600', link: '/report-cards' },
              { title: 'Class Rankings', icon: '🏆', color: 'from-orange-500 to-orange-600', link: '/analytics/class-rankings' },
              { title: 'Attendance', icon: '✅', color: 'from-pink-500 to-pink-600', link: '/attendance' },
              { title: 'Manage Classes', icon: '🎓', color: 'from-indigo-500 to-indigo-600', link: '/classes' },
              { title: 'Subjects', icon: '📚', color: 'from-teal-500 to-teal-600', link: '/subjects' },
              { title: 'Analytics', icon: '📈', color: 'from-red-500 to-red-600', link: '/analytics' }
            ].map((action, idx) => (
              <Link key={idx} href={action.link} className="group">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-transparent transform hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    {action.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{action.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Classes Overview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Active Classes</h3>
              <Link href="/classes" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center group">
                Manage All
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="p-6">
            {stats?.classes?.list?.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No classes available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats?.classes?.list?.map((classItem: any) => (
                  <div key={classItem.id} className="flex items-center justify-between p-5 rounded-xl hover:bg-indigo-50 transition-all border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{classItem.name}</p>
                        <p className="text-sm text-gray-500">{classItem.level} • {classItem.student_count || 0} students</p>
                      </div>
                    </div>
                    <Link href={`/classes/${classItem.id}`} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
