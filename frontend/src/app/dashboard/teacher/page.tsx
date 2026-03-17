'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import Link from 'next/link'
import { Calendar, BookOpen, Users, TrendingUp, AlertCircle, CheckCircle, BarChart3, Clock } from 'lucide-react'

export default function TeacherDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const currentYear = new Date().getFullYear()
  const currentTerm = 'Term1'

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

      setClasses(Array.isArray(classesRes.data) ? classesRes.data.slice(0, 6) : [])
      setStats({
        total_classes: Array.isArray(classesRes.data) ? classesRes.data.length : 0,
        total_students: Array.isArray(classesRes.data) ? classesRes.data.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0) : 0,
        attendance_rate: attendanceRes.data?.percentage || 0,
        pending_tasks: 3
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'Teacher'}!</h1>
            <p className="text-gray-500 mt-1">Here's what's happening with your classes today</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">My Classes</p>
                <p className="text-3xl font-bold mt-2">{stats?.total_classes || 0}</p>
                <p className="text-blue-100 text-xs mt-2">Active this term</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <BookOpen className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold mt-2">{stats?.total_students || 0}</p>
                <p className="text-green-100 text-xs mt-2">Across all classes</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Attendance Rate</p>
                <p className="text-3xl font-bold mt-2">{stats?.attendance_rate?.toFixed(1) || 0}%</p>
                <p className="text-purple-100 text-xs mt-2">This week average</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Pending Tasks</p>
                <p className="text-3xl font-bold mt-2">{stats?.pending_tasks || 0}</p>
                <p className="text-orange-100 text-xs mt-2">Requires attention</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <AlertCircle className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/marks/enter" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">Enter Marks</span>
              </div>
            </Link>

            <Link href="/attendance" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
                <div className="p-3 bg-green-100 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">Attendance</span>
              </div>
            </Link>

            <Link href="/view-marks" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">View Results</span>
              </div>
            </Link>

            <Link href="/attendance/history" className="group">
              <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 mt-3">History</span>
              </div>
            </Link>
          </div>
        </div>

        {/* My Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">My Classes</h2>
            <span className="text-sm text-gray-500">{currentTerm} {currentYear}</span>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No classes assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem: any) => (
                <div key={classItem.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-gray-50 to-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{classItem.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{classItem.level}</p>
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {classItem.student_count || 0} students
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href={`/enter-marks?class=${classItem.id}`}
                      className="block w-full text-center py-2.5 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Enter Marks
                    </Link>
                    <Link
                      href={`/attendance?class=${classItem.id}`}
                      className="block w-full text-center py-2.5 px-4 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
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
    </DashboardLayout>
  )
}
