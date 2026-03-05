'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import * as XLSX from 'xlsx'

export default function SchoolReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { data: stats } = useQuery({
    queryKey: ['school-stats'],
    queryFn: async () => {
      const [studentsRes, classRes, staffRes] = await Promise.all([
        api.get('/students', { params: { limit: 1 } }),
        api.get('/classes'),
        api.get('/staff')
      ])
      return {
        students: studentsRes.data.total || studentsRes.data.students?.length || 0,
        classes: Array.isArray(classRes.data) ? classRes.data.length : classRes.data.classes?.length || 0,
        staff: Array.isArray(staffRes.data) ? staffRes.data.length : staffRes.data.staff?.length || 0
      }
    }
  })

  const generateStudentsReport = async () => {
    setGenerating('students')
    try {
      const classesRes = await api.get('/classes')
      const classes = Array.isArray(classesRes.data) ? classesRes.data : classesRes.data.classes || []
      
      const allStudents: any[] = []
      for (const cls of classes) {
        try {
          const res = await api.get('/students', { params: { class_id: cls.id, year: selectedYear, term: selectedTerm } })
          const students = res.data.students || []
          students.forEach((s: any) => {
            allStudents.push({ ...s, className: cls.name })
          })
        } catch (e) {}
      }
      
      const data = allStudents.map((s: any, i: number) => ({
        '#': i + 1,
        'Admission No': s.admission_no,
        'First Name': s.first_name,
        'Middle Name': s.middle_name || '',
        'Last Name': s.last_name,
        'Gender': s.gender,
        'Date of Birth': s.date_of_birth,
        'Class': s.className || '',
        'Status': s.status,
        'Enrolled Date': s.created_at?.split('T')[0] || ''
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Students')
      XLSX.writeFile(wb, `students-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Students report downloaded')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const generateStaffReport = async () => {
    setGenerating('staff')
    try {
      const res = await api.get('/staff', { params: { limit: 10000 } })
      const staff = Array.isArray(res.data) ? res.data : res.data.staff || []
      const data = staff.map((s: any, i: number) => ({
        '#': i + 1,
        'Staff ID': s.staff_id || s.id,
        'First Name': s.first_name,
        'Last Name': s.last_name,
        'Position': s.position,
        'Department': s.department || '',
        'Email': s.email || '',
        'Phone': s.phone || '',
        'Status': s.status,
        'Hire Date': s.hire_date || s.date_hired || s.created_at?.split('T')[0] || ''
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Staff')
      XLSX.writeFile(wb, `staff-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Staff report downloaded')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const generateClassesReport = async () => {
    setGenerating('classes')
    try {
      const res = await api.get('/classes', { params: { year: selectedYear } })
      const classes = Array.isArray(res.data) ? res.data : res.data.classes || []
      const data = classes.map((c: any, i: number) => ({
        '#': i + 1,
        'Class Name': c.name,
        'Level': c.level,
        'Stream': c.stream || '',
        'Year': c.year,
        'Term': c.term,
        'Capacity': c.capacity || '',
        'Teacher': c.class_teacher_name || '',
        'Students': c.student_count || 0
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Classes')
      XLSX.writeFile(wb, `classes-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Classes report downloaded')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const generateAttendanceReport = async () => {
    setGenerating('attendance')
    try {
      if (!dateRange.start || !dateRange.end) {
        toast.error('Please select date range')
        setGenerating(null)
        return
      }
      
      const classesRes = await api.get('/classes')
      const classes = Array.isArray(classesRes.data) ? classesRes.data : classesRes.data.classes || []
      
      const allSummary: any[] = []
      for (const cls of classes) {
        try {
          const res = await api.get('/attendance/class-summary', {
            params: { class_id: cls.id, start_date: dateRange.start, end_date: dateRange.end }
          })
          const summary = res.data.summary || []
          summary.forEach((s: any) => {
            allSummary.push({ ...s, class_name: cls.name })
          })
        } catch (e) {}
      }
      
      if (allSummary.length === 0) {
        toast.error('No attendance data found for selected period')
        setGenerating(null)
        return
      }
      
      const data = allSummary.map((s: any, i: number) => ({
        '#': i + 1,
        'Class': s.class_name,
        'Student': s.student_name,
        'Total Days': s.total_days,
        'Present': s.present,
        'Absent': s.absent,
        'Late': s.late,
        'Sick': s.sick || 0,
        'Excused': s.excused || 0,
        'Attendance %': s.percentage.toFixed(2) + '%'
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
      XLSX.writeFile(wb, `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success(`Attendance report downloaded (${allSummary.length} students)`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const generateFinanceReport = async () => {
    setGenerating('finance')
    try {
      const res = await api.get('/finance/summary')
      const summary = res.data
      
      const data = [
        { 'Metric': 'Total Income', 'Amount': summary.total_income || 0 },
        { 'Metric': 'Total Expenditure', 'Amount': summary.total_expenditure || 0 },
        { 'Metric': 'Net Balance', 'Amount': summary.net_balance || 0 }
      ]
      
      if (summary.income_by_category) {
        Object.entries(summary.income_by_category).forEach(([cat, amt]) => {
          data.push({ 'Metric': `Income - ${cat}`, 'Amount': amt as number })
        })
      }
      
      if (summary.expense_by_category) {
        Object.entries(summary.expense_by_category).forEach(([cat, amt]) => {
          data.push({ 'Metric': `Expense - ${cat}`, 'Amount': amt as number })
        })
      }
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Finance Summary')
      XLSX.writeFile(wb, `finance-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Finance report downloaded')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const generatePerformanceReport = async () => {
    setGenerating('performance')
    try {
      const res = await api.get('/results/performance-summary', {
        params: { year: selectedYear, term: selectedTerm }
      })
      const results = res.data.results || []
      
      if (results.length === 0) {
        toast.error('No results found for selected year and term')
        setGenerating(null)
        return
      }
      
      const wb = XLSX.utils.book_new()
      
      // Group by class
      const byClass = results.reduce((acc: any, r: any) => {
        if (!acc[r.class_name]) acc[r.class_name] = []
        acc[r.class_name].push(r)
        return acc
      }, {})
      
      // Create a sheet for each class
      Object.entries(byClass).forEach(([className, students]: [string, any]) => {
        const data: any[] = []
        
        students.forEach((s: any, i: number) => {
          const row: any = {
            '#': i + 1,
            'Student': s.student_name,
            'Admission No': s.admission_no,
          }
          
          // Add each subject's marks
          s.subjects.forEach((subj: any) => {
            row[`${subj.subject_name} - CA`] = subj.ca
            row[`${subj.subject_name} - Exam`] = subj.exam
            row[`${subj.subject_name} - Total`] = subj.total
            row[`${subj.subject_name} - Grade`] = subj.grade
          })
          
          row['Total Marks'] = s.total_marks.toFixed(2)
          row['Average'] = s.average.toFixed(2)
          row['Overall Grade'] = s.grade
          row['Position'] = s.position
          row['Division'] = s.division
          
          data.push(row)
        })
        
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, className.substring(0, 31))
      })
      
      XLSX.writeFile(wb, `performance-report-${selectedYear}-${selectedTerm}-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success(`Performance report downloaded (${results.length} students across ${Object.keys(byClass).length} classes)`)
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const reports = [
    {
      id: 'students',
      title: 'Students Report',
      description: 'Complete list of all enrolled students',
      icon: '🎓',
      color: 'from-blue-500 to-blue-600',
      count: stats?.students || 0,
      action: generateStudentsReport,
      needsDate: false
    },
    {
      id: 'staff',
      title: 'Staff Report',
      description: 'All staff members with positions and details',
      icon: '👥',
      color: 'from-green-500 to-green-600',
      count: stats?.staff || 0,
      action: generateStaffReport,
      needsDate: false
    },
    {
      id: 'classes',
      title: 'Classes Report',
      description: 'All classes with enrollment and teacher info',
      icon: '📚',
      color: 'from-purple-500 to-purple-600',
      count: stats?.classes || 0,
      action: generateClassesReport,
      needsDate: false
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      description: 'Student attendance records for date range',
      icon: '📅',
      color: 'from-orange-500 to-orange-600',
      count: null,
      action: generateAttendanceReport,
      needsDate: true
    },
    {
      id: 'finance',
      title: 'Finance Report',
      description: 'Income, expenses and financial summary',
      icon: '💰',
      color: 'from-emerald-500 to-emerald-600',
      count: null,
      action: generateFinanceReport,
      needsDate: true
    },
    {
      id: 'performance',
      title: 'Performance Report',
      description: 'Academic results and student performance',
      icon: '📊',
      color: 'from-red-500 to-red-600',
      count: null,
      action: generatePerformanceReport,
      needsDate: false
    }
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 School Reports</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive reports for your school</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Report Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
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
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className={`bg-gradient-to-br ${report.color} rounded-2xl shadow-lg p-6 text-white transform transition-all hover:scale-105 hover:shadow-2xl`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">{report.icon}</div>
                {report.count !== null && (
                  <div className="text-3xl font-bold">{report.count}</div>
                )}
              </div>
              <h3 className="text-xl font-bold mb-2">{report.title}</h3>
              <p className="text-sm opacity-90 mb-4">{report.description}</p>
              {report.needsDate && (!dateRange.start || !dateRange.end) && (
                <p className="text-xs bg-white/20 rounded-lg p-2 mb-3">⚠️ Select date range above</p>
              )}
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
              <p>• Date range required for attendance & finance</p>
              <p>• Year/term filters apply to performance reports</p>
              <p>• Open with Excel, Google Sheets, or LibreOffice</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
