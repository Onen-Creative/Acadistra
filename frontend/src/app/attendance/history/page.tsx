'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'
import { format, eachDayOfInterval } from 'date-fns'
import * as XLSX from 'xlsx'

export default function AttendanceHistoryPage() {
  const [viewMode, setViewMode] = useState<'class' | 'student'>('class')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [period, setPeriod] = useState('month')
  const [classPeriod, setClassPeriod] = useState('month')
  
  const [levels, setLevels] = useState<string[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classSummary, setClassSummary] = useState<any>(null)
  const [studentHistory, setStudentHistory] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLevels()
  }, [])

  useEffect(() => {
    loadClasses()
  }, [selectedYear])

  useEffect(() => {
    if (selectedClass && viewMode === 'student') {
      loadStudents()
    }
  }, [selectedClass, viewMode])

  useEffect(() => {
    if (selectedClass && viewMode === 'class') {
      loadClassSummary()
    }
  }, [selectedClass, classPeriod, startDate, endDate, viewMode])

  useEffect(() => {
    if (selectedStudent && viewMode === 'student') {
      loadStudentHistory()
    }
  }, [selectedStudent, period, startDate, endDate, viewMode])

  const loadLevels = async () => {
    try {
      const response = await api.get('/school/levels')
      setLevels(response.data.levels || [])
    } catch (error) {
      toast.error('Failed to load levels')
    }
  }

  const loadClasses = async () => {
    try {
      const response = await api.get('/classes', {
        params: { year: selectedYear }
      })
      setClasses(Array.isArray(response.data) ? response.data : response.data.classes || [])
    } catch (error) {
      toast.error('Failed to load classes')
    }
  }

  const loadStudents = async () => {
    try {
      const response = await api.get('/students', {
        params: { class_id: selectedClass, limit: 1000 }
      })
      setStudents(response.data.students || [])
    } catch (error) {
      toast.error('Failed to load students')
    }
  }

  const loadClassSummary = async () => {
    setLoading(true)
    try {
      const params: any = { class_id: selectedClass }
      if (startDate && endDate) {
        params.start_date = startDate
        params.end_date = endDate
      } else {
        params.period = classPeriod
      }
      const response = await api.get('/attendance/class-summary', { params })
      setClassSummary(response.data)
    } catch (error) {
      toast.error('Failed to load class summary')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentHistory = async () => {
    setLoading(true)
    try {
      const params: any = { period }
      if (startDate && endDate) {
        params.start_date = startDate
        params.end_date = endDate
      }
      const response = await api.get(`/attendance/student/${selectedStudent}/history`, { params })
      setStudentHistory(response.data)
    } catch (error) {
      toast.error('Failed to load student history')
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter((cls: any) => 
    !selectedLevel || cls.level === selectedLevel
  )

  const exportToExcel = () => {
    if (viewMode === 'class' && classSummary?.summary) {
      const data = classSummary.summary.map((s: any, index: number) => ({
        '#': index + 1,
        'Student Name': s.student_name,
        'Total Days': s.total_days,
        'Present': s.present,
        'Absent': s.absent,
        'Late': s.late,
        'Attendance %': s.percentage.toFixed(2) + '%',
        'Status': s.percentage >= 90 ? 'Excellent' : s.percentage >= 75 ? 'Good' : s.percentage >= 60 ? 'Fair' : 'Poor'
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Class Attendance')
      XLSX.writeFile(wb, `class_attendance_${new Date().toISOString().split('T')[0]}.xlsx`)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      present: 'bg-emerald-100 text-emerald-800',
      absent: 'bg-rose-100 text-rose-800',
      late: 'bg-amber-100 text-amber-800',
      sick: 'bg-sky-100 text-sky-800',
      excused: 'bg-violet-100 text-violet-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const renderCalendar = () => {
    if (!studentHistory?.start_date || !studentHistory?.end_date) return null

    const start = new Date(studentHistory.start_date)
    const end = new Date(studentHistory.end_date)
    const calendarStart = new Date(start)
    calendarStart.setDate(start.getDate() - start.getDay())
    const calendarEnd = new Date(end)
    calendarEnd.setDate(end.getDate() + (6 - end.getDay()))
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const attendanceMap = new Map(
      studentHistory.attendances?.map((a: any) => [format(new Date(a.date), 'yyyy-MM-dd'), a]) || []
    )
    const holidayMap = new Map(
      studentHistory.holidays?.map((h: any) => [format(new Date(h.date), 'yyyy-MM-dd'), h]) || []
    )

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-700 py-2">{day}</div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const attendance = attendanceMap.get(dateStr) as { status: string } | undefined
          const holiday = holidayMap.get(dateStr) as { date: string } | undefined
          const weekend = day.getDay() === 0 || day.getDay() === 6
          const isOutsideRange = day < start || day > end

          return (
            <div
              key={dateStr}
              className={`p-3 rounded-xl text-center min-h-[70px] transition-all ${
                isOutsideRange ? 'bg-gray-50 opacity-40' :
                weekend ? 'bg-gray-100' : 
                holiday ? 'bg-orange-50' : 
                'bg-white border-2 border-gray-100 hover:border-blue-200'
              }`}
            >
              <div className={`text-sm font-semibold ${isOutsideRange ? 'text-gray-400' : 'text-gray-700'}`}>
                {format(day, 'd')}
              </div>
              {!isOutsideRange && holiday ? (
                <div className="text-xs text-orange-600 font-semibold mt-1">🎉</div>
              ) : null}
              {!isOutsideRange && attendance && !weekend && !holiday ? (
                <div className={`text-xs px-2 py-1 rounded-full mt-1 font-semibold ${getStatusColor(attendance.status)}`}>
                  {attendance.status.charAt(0).toUpperCase()}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Attendance Reports</h1>
              <p className="text-gray-600 mt-1">Track and analyze student attendance patterns</p>
            </div>
            {viewMode === 'class' && classSummary && (
              <button
                onClick={exportToExcel}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                📥 Export Excel
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link
              href="/attendance"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📋 Mark Attendance
            </Link>
            <Link
              href="/attendance/history"
              className="py-3 px-4 rounded-xl text-center font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
            >
              📊 History & Reports
            </Link>
            <Link
              href="/attendance/holidays"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              🎉 Holidays
            </Link>
            <Link
              href="/attendance/term-dates"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📅 Term Dates
            </Link>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setViewMode('class'); setSelectedStudent('') }}
              className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                viewMode === 'class' 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'bg-white/50 text-gray-600 hover:bg-white/70'
              }`}
            >
              <div className="text-2xl mb-1">📋</div>
              <div>Class Summary</div>
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                viewMode === 'student' 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'bg-white/50 text-gray-600 hover:bg-white/70'
              }`}
            >
              <div className="text-2xl mb-1">👤</div>
              <div>Student History</div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedClass('') }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
                onChange={(e) => { setSelectedTerm(e.target.value); setSelectedClass('') }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClass('') }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="">All Levels</option>
                {levels.map((level: string) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudent('') }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="">Choose class...</option>
                {filteredClasses.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {viewMode === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student *</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Student</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  >
                    <option value="week">This Week</option>
                    <option value="last_week">Last Week</option>
                    <option value="month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="term">This Term</option>
                    <option value="last_term">Last Term</option>
                    <option value="year">This Year</option>
                    <option value="last_year">Last Year</option>
                  </select>
                </div>
              </>
            )}

            {viewMode === 'class' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Period</label>
                <select
                  value={classPeriod}
                  onChange={(e) => {
                    setClassPeriod(e.target.value)
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                >
                  <option value="week">This Week</option>
                  <option value="last_week">Last Week</option>
                  <option value="month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="term">This Term</option>
                  <option value="last_term">Last Term</option>
                  <option value="year">This Year</option>
                  <option value="last_year">Last Year</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            {(startDate || endDate) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setStartDate(''); setEndDate('') }}
                  className="w-full px-4 py-2.5 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all"
                >
                  Clear Dates
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Class Summary View */}
        {viewMode === 'class' && (
          <>
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading report...</p>
              </div>
            ) : !selectedClass ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm p-12 text-center">
                <div className="text-7xl mb-4">📊</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Select a Class</h3>
                <p className="text-gray-600">Choose a class to view attendance report</p>
              </div>
            ) : classSummary?.summary?.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm p-12 text-center">
                <div className="text-7xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Data Available</h3>
                <p className="text-gray-600">No attendance records found for the selected period</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Total Days</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Present</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Absent</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Late</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Rate</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classSummary?.summary?.map((student: any, index: number) => (
                        <tr key={student.student_id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{student.student_name}</td>
                          <td className="px-6 py-4 text-sm text-center font-medium text-gray-700">{student.total_days}</td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">{student.present}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-bold">{student.absent}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-bold">{student.late}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className="text-lg font-bold text-gray-900">{student.percentage.toFixed(1)}%</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {student.percentage >= 90 ? (
                              <span className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-xs font-bold shadow-sm">Excellent</span>
                            ) : student.percentage >= 75 ? (
                              <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-bold shadow-sm">Good</span>
                            ) : student.percentage >= 60 ? (
                              <span className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full text-xs font-bold shadow-sm">Fair</span>
                            ) : (
                              <span className="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full text-xs font-bold shadow-sm">Poor</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Student History View */}
        {viewMode === 'student' && studentHistory && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold mb-2 opacity-90">School Days</div>
                <div className="text-3xl font-bold">{studentHistory.stats?.total_school_days || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold mb-2 opacity-90">Present</div>
                <div className="text-3xl font-bold">{studentHistory.stats?.present || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold mb-2 opacity-90">Absent</div>
                <div className="text-3xl font-bold">{studentHistory.stats?.absent || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold mb-2 opacity-90">Late</div>
                <div className="text-3xl font-bold">{studentHistory.stats?.late || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold mb-2 opacity-90">Sick</div>
                <div className="text-3xl font-bold">{studentHistory.stats?.sick || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold mb-2 opacity-90">Rate</div>
                <div className="text-3xl font-bold">{studentHistory.stats?.percentage?.toFixed(1) || 0}%</div>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📆 Calendar View</h2>
              {renderCalendar()}
            </div>

            {/* Detailed Records */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <h2 className="text-xl font-bold text-gray-900">📋 Detailed Records</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Day</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentHistory.attendances?.map((att: any) => (
                      <tr key={att.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{format(new Date(att.date), 'MMM d, yyyy')}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(att.date), 'EEEE')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold ${getStatusColor(att.status)}`}>
                            {att.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{att.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
