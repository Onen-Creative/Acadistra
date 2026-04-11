'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import Link from 'next/link'
import { Calendar, BookOpen, Users, TrendingUp, CheckCircle, BarChart3, Clock, Award } from 'lucide-react'

export default function TeacherDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const currentYear = new Date().getFullYear()
  const currentTerm = 'Term 1'

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [classesRes, attendanceRes] = await Promise.all([
        api.get('/api/v1/classes', { params: { year: currentYear } }),
        api.get('/api/v1/attendance/stats', { params: { start_date: getStartOfWeek(), end_date: new Date().toISOString().split('T')[0] } })
      ])

      const allClasses = Array.isArray(classesRes.data) ? classesRes.data : []
      setClasses(allClasses.slice(0, 6))
      setStats({
        total_classes: allClasses.length,
        total_students: allClasses.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0),
        attendance_rate: attendanceRes.data?.percentage || 0
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStartOfWeek = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff)).toISOString().split('T')[0]
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-700 to-teal-800 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Welcome back, {user?.full_name || 'Teacher'}!</h1>
              <p className="text-cyan-100 text-lg">Here's what's happening with your classes today</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Calendar className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">{currentTerm} {currentYear}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-blue-100 text-sm font-medium mb-1">My Classes</p>
                <p className="text-white text-4xl font-bold mb-2">{stats?.total_classes || 0}</p>
                <p className="text-xs text-blue-100">Active this term</p>
              </div>
            </div>
          </Link>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
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
              <p className="text-white text-4xl font-bold mb-2">{stats?.total_students || 0}</p>
              <p className="text-xs text-emerald-100">Across all classes</p>
            </div>
          </div>

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
                <p className="text-white text-4xl font-bold mb-2">{Math.round(stats?.attendance_rate || 0)}%</p>
                <p className="text-xs text-purple-100">This week average</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Quick Actions</span>
            <div className="ml-4 h-1 flex-1 bg-gradient-to-r from-blue-600/20 to-transparent rounded"></div>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Enter Marks', icon: '📝', color: 'from-blue-500 to-blue-600', link: '/marks/enter' },
              { title: 'Take Attendance', icon: '✅', color: 'from-emerald-500 to-emerald-600', link: '/attendance' },
              { title: 'View Results', icon: '📊', color: 'from-purple-500 to-purple-600', link: '/view-marks' },
              { title: 'My Classes', icon: '🎓', color: 'from-orange-500 to-orange-600', link: '/classes' },
              { title: 'Report Cards', icon: '📄', color: 'from-pink-500 to-pink-600', link: '/report-cards' },
              { title: 'Attendance History', icon: '📅', color: 'from-indigo-500 to-indigo-600', link: '/attendance/history' },
              { title: 'Students', icon: '👨🎓', color: 'from-teal-500 to-teal-600', link: '/students' },
              { title: 'Analytics', icon: '📈', color: 'from-red-500 to-red-600', link: '/analytics' }
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

        {/* My Classes */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">My Classes</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{currentTerm} {currentYear}</span>
                <Link href="/classes" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center group">
                  View all
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          <div className="p-6">
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No classes assigned yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem: any) => (
                  <div key={classItem.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50 hover:border-blue-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{classItem.name}</h3>
                          <p className="text-sm text-gray-500">{classItem.level}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Students</span>
                        <span className="text-lg font-bold text-blue-600">{classItem.student_count || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        href={`/marks/enter?class=${classItem.id}`}
                        className="block w-full text-center py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:shadow-lg transition-all"
                      >
                        Enter Marks
                      </Link>
                      <Link
                        href={`/attendance?class=${classItem.id}`}
                        className="block w-full text-center py-2.5 px-4 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        Take Attendance
                      </Link>
                    </div>
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
