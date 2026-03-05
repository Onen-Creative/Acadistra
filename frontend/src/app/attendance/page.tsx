'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormSelect, FormCard } from '@/components/ui/FormComponents'
import { attendanceApi, classesApi, schoolsApi } from '@/services/api'
import ConfirmDialog from '@/components/ConfirmDialog'
import * as XLSX from 'xlsx'
import toast, { Toaster } from 'react-hot-toast'

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
  const userRole = user.role || 'teacher'

  const { data: levelsData } = useQuery({
    queryKey: ['school-levels'],
    queryFn: () => schoolsApi.getLevels(),
  })

  const schoolLevels = levelsData?.levels || []

  const { data: classesData } = useQuery({
    queryKey: ['classes', selectedYear, selectedTerm, selectedLevel],
    queryFn: () => classesApi.list({ year: selectedYear, term: selectedTerm }),
    enabled: !!selectedLevel,
  })

  const filteredClasses = classesData?.filter((cls: any) => cls.level === selectedLevel) || []

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['attendance-by-date', selectedClass, selectedDate],
    queryFn: () => attendanceApi.getByDate({ class_id: selectedClass, date: selectedDate }),
    enabled: !!selectedClass && !!selectedDate,
  })

  const { data: holidays } = useQuery({
    queryKey: ['holidays', selectedDate],
    queryFn: () => attendanceApi.getHolidays({ start_date: selectedDate, end_date: selectedDate }),
    enabled: !!selectedDate,
  })

  const isWeekend = new Date(selectedDate).getDay() === 0 || new Date(selectedDate).getDay() === 6
  const isHoliday = holidays?.holidays?.length > 0
  const holidayName = holidays?.holidays?.[0]?.name || ''
  const canSubmitAttendance = !isWeekend && !isHoliday
  const hasExistingAttendance = studentsData?.data?.some((item: any) => item.attendance !== null)

  const bulkMarkMutation = useMutation({
    mutationFn: attendanceApi.bulkMark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-by-date'] })
      setAttendanceData({})
      toast.success('✅ Attendance marked successfully!', {
        duration: 4000,
        position: 'top-right',
      })
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || 'Failed to mark attendance'
      toast.error(`❌ ${errorMsg}`, {
        duration: 5000,
        position: 'top-right',
      })
    },
  })

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }))
  }

  const handleSubmit = () => {
    if (!selectedClass || !selectedDate) {
      toast.error('⚠️ Please select both class and date', {
        duration: 3000,
        position: 'top-right',
      })
      return
    }
    setShowConfirmDialog(true)
  }

  const confirmSubmit = () => {
    const attendances = studentsData?.data?.map((item: any) => ({
      student_id: item.student.id,
      status: attendanceData[item.student.id] || item.attendance?.status || 'present',
      remarks: '',
    })) || []

    bulkMarkMutation.mutate({
      class_id: selectedClass,
      date: selectedDate,
      attendances,
    })
    setShowConfirmDialog(false)
  }

  const markAllAs = (status: string) => {
    const newData: Record<string, string> = {}
    studentsData?.data?.forEach((item: any) => {
      newData[item.student.id] = status
    })
    setAttendanceData(newData)
  }

  const exportToExcel = () => {
    if (!studentsData?.data || studentsData.data.length === 0) {
      toast.error('⚠️ No data to export', {
        duration: 3000,
        position: 'top-right',
      })
      return
    }

    const data = studentsData.data.map((item: any, index: number) => ({
      '#': index + 1,
      'Admission No': item.student.admission_no,
      'Student Name': `${item.student.first_name} ${item.student.middle_name || ''} ${item.student.last_name}`,
      'Gender': item.student.gender,
      'Status': attendanceData[item.student.id] || item.attendance?.status || 'present',
      'Date': selectedDate,
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance_${selectedDate}.xlsx`)
    toast.success('📥 Attendance exported successfully!', {
      duration: 3000,
      position: 'top-right',
    })
  }

  return (
    <DashboardLayout>
      <Toaster />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="📋 Attendance Register" 
          subtitle="Mark and manage student attendance"
          action={
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                disabled={!studentsData?.data || studentsData.data.length === 0}
                className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                📥 Export
              </button>
            </div>
          }
        />

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link
              href="/attendance"
              className="py-3 px-4 rounded-xl text-center font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
            >
              📋 Mark Attendance
            </Link>
            <Link
              href="/attendance/history"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
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

        <FormCard>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <FormSelect
              value={selectedYear.toString()}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value))
                setSelectedLevel('')
                setSelectedClass('')
              }}
              label="Year"
              icon="📅"
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
                { value: '2027', label: '2027' }
              ]}
            />

            <FormSelect
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value)
                setSelectedLevel('')
                setSelectedClass('')
              }}
              label="Term"
              icon="📖"
              options={[
                { value: 'Term 1', label: 'Term 1' },
                { value: 'Term 2', label: 'Term 2' },
                { value: 'Term 3', label: 'Term 3' }
              ]}
            />

            <FormSelect
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value)
                setSelectedClass('')
              }}
              label="Level"
              icon="🎓"
              options={[
                { value: '', label: 'Choose level...' },
                ...schoolLevels.map((level: string) => ({ value: level, label: level }))
              ]}
            />

            <FormSelect
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              label="Class"
              icon="🏫"
              disabled={!selectedLevel}
              options={[
                { value: '', label: 'Choose class...' },
                ...filteredClasses.map((cls: any) => ({ value: cls.id, label: cls.name }))
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSubmit}
                disabled={!selectedClass || !selectedDate || !canSubmitAttendance || bulkMarkMutation.isPending || (hasExistingAttendance && userRole === 'teacher')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {bulkMarkMutation.isPending ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          </div>

          {!canSubmitAttendance && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
              <span className="text-orange-600">🚫</span>
              <div className="text-sm text-orange-800">
                <strong>Attendance Disabled:</strong> {isWeekend ? 'Cannot mark attendance on weekends' : `Holiday: ${holidayName}`}
              </div>
            </div>
          )}

          {hasExistingAttendance && userRole === 'teacher' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> Attendance already marked. Only school admin can edit.
              </div>
            </div>
          )}
        </FormCard>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading students...</p>
          </div>
        ) : !selectedClass ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">👆</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Class</h3>
            <p className="text-gray-500">Choose a class and date to mark attendance</p>
          </div>
        ) : studentsData?.data?.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
            <p className="text-gray-500">This class has no enrolled students</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Class Attendance - {studentsData?.data?.length || 0} Students</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => markAllAs('present')}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    ✓ Mark All Present
                  </button>
                  <button
                    onClick={() => markAllAs('absent')}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    ✗ Mark All Absent
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Admission No</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Quick Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentsData?.data?.map((item: any, index: number) => {
                    const currentStatus = attendanceData[item.student.id] || item.attendance?.status || 'present'
                    return (
                      <tr key={item.student.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                              {item.student.first_name[0]}{item.student.last_name[0]}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {item.student.first_name} {item.student.middle_name || ''} {item.student.last_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.student.admission_no}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(item.student.id, e.target.value)}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 focus:outline-none focus:ring-2 transition-all ${
                                currentStatus === 'present' ? 'bg-green-50 text-green-700 border-green-200' :
                                currentStatus === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                                currentStatus === 'late' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                currentStatus === 'sick' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                            >
                              <option value="present">✓ Present</option>
                              <option value="absent">✗ Absent</option>
                              <option value="late">⏰ Late</option>
                              <option value="sick">🤒 Sick</option>
                              <option value="excused">📝 Excused</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleStatusChange(item.student.id, 'present')}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                            >
                              ✓ Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.student.id, 'absent')}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                            >
                              ✗ Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-semibold text-gray-900">{studentsData?.data?.length}</span> students
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">✓ Present</span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">✗ Absent</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">⏰ Late</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">🤒 Sick</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">📝 Excused</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={confirmSubmit}
          title="Confirm Attendance"
          message={`Are you sure you want to save attendance for ${studentsData?.data?.length || 0} students on ${selectedDate}? This action will record the attendance status for all students in the class.`}
          confirmText="Save Attendance"
          cancelText="Cancel"
          type="success"
          isLoading={bulkMarkMutation.isPending}
        />
      </div>
    </DashboardLayout>
  )
}
