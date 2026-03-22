'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Calendar, CheckCircle, XCircle, Clock, Users, FileText, Download } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface LeaveRequest {
  id: string
  staff_id: string
  staff?: {
    first_name: string
    last_name: string
    employee_id: string
  }
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  status: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
}

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Study', 'Unpaid']

export default function StaffLeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [userRole, setUserRole] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    const role = localStorage.getItem('user_role') || ''
    setUserRole(role)
    fetchLeaves()
    fetchStaff()
  }, [filterStatus])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as Element).closest('.export-menu')) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      const response = await api.get(`/staff/leave?${params.toString()}`)
      setLeaves(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
      setLeaves([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff')
      setStaff(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }

  const handleCreateLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const startDate = new Date(formData.get('start_date') as string)
    const endDate = new Date(formData.get('end_date') as string)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const data = {
      staff_id: formData.get('staff_id'),
      leave_type: formData.get('leave_type'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      days,
      reason: formData.get('reason'),
      status: 'pending'
    }

    try {
      await api.post('/staff/leave', data)
      toast.success('Leave request created')
      setShowCreateModal(false)
      fetchLeaves()
    } catch (error: any) {
      console.error('Leave creation error:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to create leave')
    }
  }

  const handleApprove = async (id: string) => {
    const leave = leaves.find(l => l.id === id)
    if (leave) {
      setSelectedLeave(leave)
      setShowApproveModal(true)
    }
  }

  const confirmApprove = async () => {
    if (!selectedLeave) return
    try {
      await api.put(`/staff/leave/${selectedLeave.id}/approve`, { status: 'approved' })
      toast.success('Leave approved successfully')
      setShowApproveModal(false)
      setSelectedLeave(null)
      fetchLeaves()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (id: string) => {
    const leave = leaves.find(l => l.id === id)
    if (leave) {
      setSelectedLeave(leave)
      setRejectionReason('')
      setShowRejectModal(true)
    }
  }

  const confirmReject = async () => {
    if (!selectedLeave || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    try {
      await api.put(`/staff/leave/${selectedLeave.id}/approve`, { 
        status: 'rejected', 
        rejection_reason: rejectionReason 
      })
      toast.success('Leave rejected')
      setShowRejectModal(false)
      setSelectedLeave(null)
      setRejectionReason('')
      fetchLeaves()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject')
    }
  }

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length
  }

  const isAdmin = userRole === 'school_admin' || userRole === 'system_admin'

  const exportToExcel = async (range: 'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly') => {
    try {
      const today = new Date()
      let startDate = ''
      let endDate = ''
      let filename = ''

      switch (range) {
        case 'daily':
          startDate = today.toISOString().split('T')[0]
          endDate = startDate
          filename = `Staff_Leave_${startDate}`
          break
        case 'weekly':
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          startDate = weekStart.toISOString().split('T')[0]
          endDate = weekEnd.toISOString().split('T')[0]
          filename = `Staff_Leave_Week_${startDate}_to_${endDate}`
          break
        case 'monthly':
          startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
          endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${lastDay}`
          filename = `Staff_Leave_${today.toLocaleString('default', { month: 'long' })}_${today.getFullYear()}`
          break
        case 'termly':
          const month = today.getMonth()
          if (month < 4) {
            startDate = `${today.getFullYear()}-01-01`
            endDate = `${today.getFullYear()}-04-30`
            filename = `Staff_Leave_Term1_${today.getFullYear()}`
          } else if (month < 8) {
            startDate = `${today.getFullYear()}-05-01`
            endDate = `${today.getFullYear()}-08-31`
            filename = `Staff_Leave_Term2_${today.getFullYear()}`
          } else {
            startDate = `${today.getFullYear()}-09-01`
            endDate = `${today.getFullYear()}-12-31`
            filename = `Staff_Leave_Term3_${today.getFullYear()}`
          }
          break
        case 'yearly':
          startDate = `${today.getFullYear()}-01-01`
          endDate = `${today.getFullYear()}-12-31`
          filename = `Staff_Leave_Year_${today.getFullYear()}`
          break
      }

      // Fetch leave data for the range
      const response = await api.get('/staff/leave')
      const allLeaves = Array.isArray(response.data) ? response.data : []
      
      // Filter by date range
      const filteredLeaves = allLeaves.filter((leave: LeaveRequest) => {
        const leaveStart = new Date(leave.start_date)
        const leaveEnd = new Date(leave.end_date)
        const rangeStart = new Date(startDate)
        const rangeEnd = new Date(endDate)
        return (leaveStart <= rangeEnd && leaveEnd >= rangeStart)
      })

      // Prepare data for Excel
      const excelData = filteredLeaves.map((leave: LeaveRequest) => ({
        'Employee ID': leave.staff?.employee_id || '',
        'Name': `${leave.staff?.first_name || ''} ${leave.staff?.last_name || ''}`,
        'Leave Type': leave.leave_type,
        'Start Date': new Date(leave.start_date).toLocaleDateString(),
        'End Date': new Date(leave.end_date).toLocaleDateString(),
        'Days': leave.days,
        'Status': leave.status.toUpperCase(),
        'Reason': leave.reason,
        'Rejection Reason': leave.rejection_reason || '',
        'Applied On': new Date(leave.created_at).toLocaleDateString()
      }))

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leave Requests')

      // Auto-size columns
      ws['!cols'] = [
        { wch: 15 }, // Employee ID
        { wch: 25 }, // Name
        { wch: 15 }, // Leave Type
        { wch: 12 }, // Start Date
        { wch: 12 }, // End Date
        { wch: 8 },  // Days
        { wch: 12 }, // Status
        { wch: 40 }, // Reason
        { wch: 30 }, // Rejection Reason
        { wch: 12 }  // Applied On
      ]

      // Save file
      XLSX.writeFile(wb, `${filename}.xlsx`)
      toast.success(`Exported ${range} leave report`)
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export leave data')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/staff" className="text-white/80 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-3xl font-bold">Staff Leave Management</h1>
              </div>
              <p className="text-blue-100">Manage leave requests and approvals</p>
            </div>
            <div className="flex gap-2">
              <Link href="/staff/attendance" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Users className="w-4 h-4" />
                Attendance
              </Link>
              <Link href="/staff/documents" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <FileText className="w-4 h-4" />
                Documents
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-medium">Rejected</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterStatus('')} className={`px-4 py-2 rounded-lg font-medium ${!filterStatus ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>All</button>
              <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-lg font-medium ${filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}>Pending</button>
              <button onClick={() => setFilterStatus('approved')} className={`px-4 py-2 rounded-lg font-medium ${filterStatus === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Approved</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative export-menu">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"
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
              <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">+ New Request</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
        ) : leaves.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No leave requests found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      {isAdmin && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {leave.staff?.first_name?.[0]}{leave.staff?.last_name?.[0]}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{leave.staff?.first_name} {leave.staff?.last_name}</div>
                              <div className="text-sm text-gray-500">{leave.staff?.employee_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{leave.leave_type}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{new Date(leave.start_date).toLocaleDateString()}</div>
                          <div className="text-gray-500">to {new Date(leave.end_date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{leave.days}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            leave.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {leave.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {leave.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {leave.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            {leave.status === 'pending' ? (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleApprove(leave.id)} className="text-green-600 hover:text-green-900">Approve</button>
                                <button onClick={() => handleReject(leave.id)} className="text-red-600 hover:text-red-900">Reject</button>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {leaves.map((leave) => (
                <div key={leave.id} className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {leave.staff?.first_name?.[0]}{leave.staff?.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base">{leave.staff?.first_name} {leave.staff?.last_name}</h3>
                      <p className="text-sm text-gray-600">{leave.staff?.employee_id}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                      leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      leave.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {leave.status === 'pending' && <Clock className="w-3 h-3" />}
                      {leave.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {leave.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{leave.leave_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{leave.days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reason:</span>
                      <p className="text-gray-800 mt-1">{leave.reason}</p>
                    </div>
                    {leave.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                        <span className="text-red-700 text-xs font-medium">Rejection:</span>
                        <p className="text-red-800 text-xs mt-1">{leave.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  {isAdmin && leave.status === 'pending' && (
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <button onClick={() => handleApprove(leave.id)} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Approve</button>
                      <button onClick={() => handleReject(leave.id)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">New Leave Request</h2>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateLeave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Member *</label>
                  <select name="staff_id" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                    <option value="">Select Staff Member</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.employee_id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type *</label>
                  <select name="leave_type" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                    <option value="">Select Leave Type</option>
                    {LEAVE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                    <input name="start_date" type="date" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
                    <input name="end_date" type="date" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
                  <textarea name="reason" required rows={4} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none" placeholder="Please provide a detailed reason for your leave request..."></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Approve Leave Request</h2>
              </div>
              <button 
                onClick={() => setShowApproveModal(false)} 
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedLeave.staff?.first_name?.[0]}{selectedLeave.staff?.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedLeave.staff?.first_name} {selectedLeave.staff?.last_name}</h3>
                    <p className="text-sm text-gray-600">{selectedLeave.staff?.employee_id}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leave Type:</span>
                    <span className="font-medium">{selectedLeave.leave_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedLeave.days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">{new Date(selectedLeave.start_date).toLocaleDateString()} - {new Date(selectedLeave.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 mb-6">Are you sure you want to approve this leave request?</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowApproveModal(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmApprove} 
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Reject Leave Request</h2>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)} 
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-600 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedLeave.staff?.first_name?.[0]}{selectedLeave.staff?.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedLeave.staff?.first_name} {selectedLeave.staff?.last_name}</h3>
                    <p className="text-sm text-gray-600">{selectedLeave.staff?.employee_id}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leave Type:</span>
                    <span className="font-medium">{selectedLeave.leave_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedLeave.days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">{new Date(selectedLeave.start_date).toLocaleDateString()} - {new Date(selectedLeave.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason *</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4} 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all resize-none" 
                    placeholder="Please provide a reason for rejecting this leave request..."
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowRejectModal(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmReject} 
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Reject Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
