'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Calendar, CheckCircle, XCircle, Clock, FileText, Download, Users } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface StaffAttendance {
  id: string
  staff_id: string
  staff?: {
    first_name: string
    last_name: string
    employee_id: string
    role: string
  }
  date: string
  status: string
  check_in?: string
  check_out?: string
  remarks?: string
  marked_by: string
  created_at: string
}

const STATUS_OPTIONS = ['present', 'absent', 'late', 'half_day', 'on_leave']

export default function StaffAttendancePage() {
  const [attendance, setAttendance] = useState<StaffAttendance[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [exportRange, setExportRange] = useState<'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly'>('daily')
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    fetchAttendance()
    fetchStaff()
  }, [selectedDate])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as Element).closest('.export-menu')) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/staff/attendance?start_date=${selectedDate}&end_date=${selectedDate}`)
      setAttendance(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff?status=active')
      setStaff(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }

  const handleMarkAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const checkInTime = formData.get('check_in_time') as string
    const checkOutTime = formData.get('check_out_time') as string
    const date = formData.get('date') as string
    
    const data: any = {
      staff_id: formData.get('staff_id'),
      date: date,
      status: formData.get('status'),
      remarks: formData.get('remarks') || undefined
    }

    // Format check_in and check_out as full timestamps if provided
    if (checkInTime) {
      data.check_in = `${date}T${checkInTime}:00Z`
    }
    if (checkOutTime) {
      data.check_out = `${date}T${checkOutTime}:00Z`
    }

    try {
      await api.post('/staff/attendance', data)
      toast.success('Attendance marked')
      setShowMarkModal(false)
      fetchAttendance()
    } catch (error: any) {
      console.error('Attendance error:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to mark attendance')
    }
  }

  const handleBulkMark = async (status: string) => {
    if (!confirm(`Mark all staff as ${status} for ${selectedDate}?`)) return
    
    try {
      const promises = staff.map(s => 
        api.post('/staff/attendance', {
          staff_id: s.id,
          date: selectedDate,
          status
        })
      )
      await Promise.all(promises)
      toast.success(`Marked ${staff.length} staff as ${status}`)
      fetchAttendance()
    } catch (error: any) {
      toast.error('Failed to mark bulk attendance')
    }
  }

  const stats = {
    total: staff.length,
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    onLeave: attendance.filter(a => a.status === 'on_leave').length,
    absent: staff.length - attendance.filter(a => a.status === 'present' || a.status === 'late').length
  }

  const attendanceMap = new Map(attendance.map(a => [a.staff_id, a]))

  const exportToExcel = async (range: 'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly') => {
    try {
      let startDate = selectedDate
      let endDate = selectedDate
      let filename = `Staff_Attendance_${selectedDate}`

      const date = new Date(selectedDate)
      
      switch (range) {
        case 'weekly':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          startDate = weekStart.toISOString().split('T')[0]
          endDate = weekEnd.toISOString().split('T')[0]
          filename = `Staff_Attendance_Week_${startDate}_to_${endDate}`
          break
        case 'monthly':
          startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
          const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
          endDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${lastDay}`
          filename = `Staff_Attendance_${date.toLocaleString('default', { month: 'long' })}_${date.getFullYear()}`
          break
        case 'termly':
          // Assuming 3 terms per year
          const month = date.getMonth()
          if (month < 4) { // Jan-Apr: Term 1
            startDate = `${date.getFullYear()}-01-01`
            endDate = `${date.getFullYear()}-04-30`
            filename = `Staff_Attendance_Term1_${date.getFullYear()}`
          } else if (month < 8) { // May-Aug: Term 2
            startDate = `${date.getFullYear()}-05-01`
            endDate = `${date.getFullYear()}-08-31`
            filename = `Staff_Attendance_Term2_${date.getFullYear()}`
          } else { // Sep-Dec: Term 3
            startDate = `${date.getFullYear()}-09-01`
            endDate = `${date.getFullYear()}-12-31`
            filename = `Staff_Attendance_Term3_${date.getFullYear()}`
          }
          break
        case 'yearly':
          startDate = `${date.getFullYear()}-01-01`
          endDate = `${date.getFullYear()}-12-31`
          filename = `Staff_Attendance_Year_${date.getFullYear()}`
          break
      }

      const response = await api.get(`/staff/attendance?start_date=${startDate}&end_date=${endDate}`)
      const attendanceData = Array.isArray(response.data) ? response.data : []

      // Prepare data for Excel
      const excelData = staff.map(s => {
        const staffAttendance = attendanceData.filter(a => a.staff_id === s.id)
        const present = staffAttendance.filter(a => a.status === 'present').length
        const late = staffAttendance.filter(a => a.status === 'late').length
        const absent = staffAttendance.filter(a => a.status === 'absent').length
        const onLeave = staffAttendance.filter(a => a.status === 'on_leave').length
        const halfDay = staffAttendance.filter(a => a.status === 'half_day').length

        return {
          'Employee ID': s.employee_id,
          'Name': `${s.first_name} ${s.last_name}`,
          'Role': s.role,
          'Present': present,
          'Late': late,
          'Absent': absent,
          'On Leave': onLeave,
          'Half Day': halfDay,
          'Total Days': staffAttendance.length
        }
      })

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

      // Auto-size columns
      const maxWidth = excelData.reduce((w, r) => Math.max(w, r['Name'].length), 10)
      ws['!cols'] = [
        { wch: 15 }, // Employee ID
        { wch: maxWidth }, // Name
        { wch: 20 }, // Role
        { wch: 10 }, // Present
        { wch: 10 }, // Late
        { wch: 10 }, // Absent
        { wch: 10 }, // On Leave
        { wch: 10 }, // Half Day
        { wch: 12 }  // Total Days
      ]

      // Save file
      XLSX.writeFile(wb, `${filename}.xlsx`)
      toast.success(`Exported ${range} attendance report`)
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export attendance')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/staff" className="text-white/80 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-3xl font-bold">Staff Attendance</h1>
              </div>
              <p className="text-green-100">Track daily staff attendance</p>
            </div>
            <div className="flex gap-2">
              <Link href="/staff/leave" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Calendar className="w-4 h-4" />
                Leave
              </Link>
              <Link href="/staff/documents" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <FileText className="w-4 h-4" />
                Documents
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm">Present</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.present}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <p className="text-gray-600 text-sm">Absent</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.absent}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm">Late</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.late}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm">On Leave</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.onLeave}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <label className="font-medium">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative export-menu">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                    <button onClick={() => exportToExcel('daily')} className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm">Daily</button>
                    <button onClick={() => exportToExcel('weekly')} className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm">Weekly</button>
                    <button onClick={() => exportToExcel('monthly')} className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm">Monthly</button>
                    <button onClick={() => exportToExcel('termly')} className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm">Termly</button>
                    <button onClick={() => exportToExcel('yearly')} className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm rounded-b-lg">Yearly</button>
                  </div>
                )}
              </div>
              <button onClick={() => handleBulkMark('present')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Mark All Present</button>
              <button onClick={() => setShowMarkModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ Mark Individual</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staff.map((s) => {
                      const att = attendanceMap.get(s.id)
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {s.first_name[0]}{s.last_name[0]}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</div>
                                <div className="text-sm text-gray-500">{s.employee_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {att ? (
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                att.status === 'present' ? 'bg-green-100 text-green-800' :
                                att.status === 'absent' ? 'bg-red-100 text-red-800' :
                                att.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                att.status === 'on_leave' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {att.status.replace('_', ' ').toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">Not marked</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {att?.check_in ? new Date(att.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {att?.check_out ? new Date(att.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{att?.remarks || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {staff.map((s) => {
                const att = attendanceMap.get(s.id)
                return (
                  <div key={s.id} className="bg-white rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{s.first_name} {s.last_name}</h3>
                        <p className="text-sm text-gray-600">{s.employee_id} • {s.role}</p>
                      </div>
                      {att ? (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          att.status === 'present' ? 'bg-green-100 text-green-800' :
                          att.status === 'absent' ? 'bg-red-100 text-red-800' :
                          att.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          att.status === 'on_leave' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {att.status.replace('_', ' ').toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not marked</span>
                      )}
                    </div>
                    
                    {att && (
                      <div className="space-y-2 text-sm pt-3 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check In:</span>
                          <span className="font-medium">
                            {att.check_in ? new Date(att.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check Out:</span>
                          <span className="font-medium">
                            {att.check_out ? new Date(att.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                        {att.remarks && (
                          <div>
                            <span className="text-gray-600">Notes:</span>
                            <p className="text-gray-800 mt-1">{att.remarks}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showMarkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-green-600 to-teal-700 px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Mark Attendance</h2>
              </div>
              <button 
                onClick={() => setShowMarkModal(false)} 
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleMarkAttendance} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Member *</label>
                  <select name="staff_id" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all">
                    <option value="">Select Staff Member</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.employee_id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input name="date" type="date" defaultValue={selectedDate} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
                  <select name="status" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all">
                    <option value="">Select Status</option>
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Check In Time</label>
                    <input name="check_in_time" type="time" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Check Out Time</label>
                    <input name="check_out_time" type="time" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea name="remarks" rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none" placeholder="Optional remarks about attendance..."></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowMarkModal(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-teal-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Mark Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
