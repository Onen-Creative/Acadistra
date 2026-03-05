'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { notifications } from '@mantine/notifications'
import api from '@/services/api'
import { PageHeader, GradientCard } from '@/components/ui/BeautifulComponents'
import { Download, FileText } from 'lucide-react'

export default function SystemReportsPage() {
  useRequireAuth()
  const [generating, setGenerating] = useState<string | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => api.get('/stats').then(res => res.data),
  })

  const generateReport = async (type: string) => {
    setGenerating(type)
    try {
      const response = await api.get(`/reports/system/${type}`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      notifications.show({
        title: 'Success',
        message: 'Report downloaded successfully',
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to generate report',
        color: 'red',
      })
    } finally {
      setGenerating(null)
    }
  }

  return (
    
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader 
            title="System Reports" 
            description="Generate and view system-wide reports"
            icon="📊"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GradientCard gradient="from-blue-500 to-blue-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Schools Report</h3>
                <span className="text-4xl">🏫</span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{stats?.total_schools || 0}</p>
              <p className="text-blue-100 mb-4">Total Schools</p>
              <button 
                onClick={() => generateReport('schools')}
                disabled={generating === 'schools'}
                className="w-full bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating === 'schools' ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Download className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            </GradientCard>

            <GradientCard gradient="from-emerald-500 to-teal-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Users Report</h3>
                <span className="text-4xl">👥</span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{stats?.total_users || 0}</p>
              <p className="text-emerald-100 mb-4">Total Users</p>
              <button 
                onClick={() => generateReport('users')}
                disabled={generating === 'users'}
                className="w-full bg-white text-emerald-600 px-4 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating === 'users' ? (
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Download className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            </GradientCard>

            <GradientCard gradient="from-purple-500 to-pink-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Students Report</h3>
                <span className="text-4xl">🎓</span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{stats?.total_students || 0}</p>
              <p className="text-purple-100 mb-4">Total Students</p>
              <button 
                onClick={() => generateReport('students')}
                disabled={generating === 'students'}
                className="w-full bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating === 'students' ? (
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Download className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            </GradientCard>

            <GradientCard gradient="from-orange-500 to-red-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Activity Report</h3>
                <span className="text-4xl">📊</span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">Live</p>
              <p className="text-orange-100 mb-4">System Activity</p>
              <button 
                onClick={() => generateReport('activity')}
                disabled={generating === 'activity'}
                className="w-full bg-white text-orange-600 px-4 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating === 'activity' ? (
                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Download className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            </GradientCard>

            <GradientCard gradient="from-indigo-500 to-blue-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Performance Report</h3>
                <span className="text-4xl">⚡</span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{stats?.health?.uptime_percent || 99}%</p>
              <p className="text-indigo-100 mb-4">System Uptime</p>
              <button 
                onClick={() => generateReport('performance')}
                disabled={generating === 'performance'}
                className="w-full bg-white text-indigo-600 px-4 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating === 'performance' ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Download className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            </GradientCard>

            <GradientCard gradient="from-pink-500 to-rose-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Custom Report</h3>
                <span className="text-4xl">📝</span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">New</p>
              <p className="text-pink-100 mb-4">Create Custom</p>
              <button className="w-full bg-white text-pink-600 px-4 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                ✨ Create Report
              </button>
            </GradientCard>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <span className="text-2xl">📄</span>
              Recent Reports
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-4 px-4 border-b hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent rounded-xl transition-all duration-200">
                <div>
                  <p className="font-semibold text-gray-900">🏫 Monthly Schools Report</p>
                  <p className="text-sm text-gray-600 mt-1">📅 Generated on {new Date().toLocaleDateString()}</p>
                </div>
                <button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  ⬇️ Download
                </button>
              </div>
              <div className="flex items-center justify-between py-4 px-4 border-b hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent rounded-xl transition-all duration-200">
                <div>
                  <p className="font-semibold text-gray-900">👥 User Activity Report</p>
                  <p className="text-sm text-gray-600 mt-1">📅 Generated on {new Date().toLocaleDateString()}</p>
                </div>
                <button className="bg-gradient-to-r from-emerald-500 to-teal-700 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    
  )
}
