'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    term: 'Term 1',
    startDate: '',
    endDate: '',
    classId: '',
    role: ''
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/api/v1/classes')
      return Array.isArray(res.data) ? res.data : res.data.classes || []
    }
  })

  const downloadReport = async (endpoint: string, filename: string, params: any = {}) => {
    try {
      const res = await api.get(endpoint, {
        params,
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report downloaded successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate report')
    }
  }

  const generateStudentsReport = async () => {
    setGenerating('students')
    try {
      await downloadReport(
        '/api/v1/reports/students',
        `students-report-${new Date().toISOString().split('T')[0]}.xlsx`,
        {
          class_id: filters.classId,
          year: filters.year,
          term: filters.term
        }
      )
    } finally {
      setGenerating(null)
    }
  }

  const generateStaffReport = async () => {
    setGenerating('staff')
    try {
      await downloadReport(
        '/api/v1/reports/staff',
        `staff-report-${new Date().toISOString().split('T')[0]}.xlsx`,
        { role: filters.role }
      )
    } finally {
      setGenerating(null)
    }
  }

  const generateAttendanceReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast.error('Please select start and end dates')
      return
    }
    setGenerating('attendance')
    try {
      await downloadReport(
        '/api/v1/reports/attendance',
        `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`,
        {
          start_date: filters.startDate,
          end_date: filters.endDate,
          class_id: filters.classId
        }
      )
    } finally {
      setGenerating(null)
    }
  }

  const generatePerformanceReport = async () => {
    setGenerating('performance')
    try {
      await downloadReport(
        '/api/v1/reports/performance',
        `performance-report-${filters.year}-${filters.term}-${new Date().toISOString().split('T')[0]}.xlsx`,
        {
          year: filters.year,
          term: filters.term,
          class_id: filters.classId
        }
      )
    } finally {
      setGenerating(null)
    }
  }

  const reports = [
    {
      id: 'students',
      title: 'Students Report',
      description: 'Complete list of enrolled students with class information',
      icon: '🎓',
      color: 'from-blue-500 to-blue-600',
      action: generateStudentsReport,
      filters: ['year', 'term', 'class']
    },
    {
      id: 'staff',
      title: 'Staff Report',
      description: 'All staff members with positions and employment details',
      icon: '👥',
      color: 'from-green-500 to-green-600',
      action: generateStaffReport,
      filters: ['role']
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      description: 'Student attendance records for selected date range',
      icon: '📅',
      color: 'from-orange-500 to-orange-600',
      action: generateAttendanceReport,
      filters: ['dateRange', 'class']
    },
    {
      id: 'performance',
      title: 'Performance Report',
      description: 'Academic results and student performance by term',
      icon: '📊',
      color: 'from-purple-500 to-purple-600',
      action: generatePerformanceReport,
      filters: ['year', 'term', 'class']
    }
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 School Reports</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive Excel reports for your school</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Report Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
              <select
                value={filters.term}
                onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class (Optional)</label>
              <select
                value={filters.classId}
                onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="">All Classes</option>
                {classes?.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Role (Optional)</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="">All Roles</option>
                <option value="Teacher">Teacher</option>
                <option value="Admin">Admin</option>
                <option value="Bursar">Bursar</option>
                <option value="Librarian">Librarian</option>
                <option value="Nurse">Nurse</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date (for Attendance)</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date (for Attendance)</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <div key={report.id} className={`bg-gradient-to-br ${report.color} rounded-2xl shadow-lg p-6 text-white transform transition-all hover:scale-105 hover:shadow-2xl`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">{report.icon}</div>
              </div>
              <h3 className="text-xl font-bold mb-2">{report.title}</h3>
              <p className="text-sm opacity-90 mb-4">{report.description}</p>
              <button
                onClick={report.action}
                disabled={generating === report.id}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating === report.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  '📥 Download Excel'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Report Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p>• All reports are in Excel format (.xlsx)</p>
              <p>• Reports contain only your school's data</p>
              <p>• Data is current as of generation time</p>
            </div>
            <div className="space-y-2">
              <p>• Use filters to narrow down report scope</p>
              <p>• Date range required for attendance reports</p>
              <p>• Open with Excel, Google Sheets, or LibreOffice</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
