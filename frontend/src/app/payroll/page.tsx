'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { SalaryStructureDetailsModal } from '@/components/payroll/SalaryStructureDetailsModal'
import { EditSalaryStructureModal } from '@/components/payroll/EditSalaryStructureModal'
import Toast from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { api } from '@/services/api'
import * as XLSX from 'xlsx'
import { Eye, Edit, Trash2 } from 'lucide-react'

const payrollApi = {
  listStaff: async () => {
    const { data } = await api.get('/api/v1/staff')
    return data
  },
  listSalaryStructures: async () => {
    const { data } = await api.get('/api/v1/payroll/salary-structures')
    return data
  },
  createSalaryStructure: async (data: any) => {
    const { data: response } = await api.post('/api/v1/payroll/salary-structures', data)
    return response
  },
  updateSalaryStructure: async (id: number, data: any) => {
    const { data: response } = await api.put(`/payroll/salary-structures/${id}`, data)
    return response
  },
  deleteSalaryStructure: async (id: number) => {
    const { data } = await api.delete(`/payroll/salary-structures/${id}`)
    return data
  },
  processPayroll: async (data: any) => {
    const { data: response } = await api.post('/api/v1/payroll/process', data)
    return response
  },
  listPayrollRuns: async () => {
    const { data } = await api.get('/api/v1/payroll/runs')
    return data
  },
  markPaymentPaid: async (id: number, data: any) => {
    const { data: response } = await api.post(`/payroll/payments/${id}/mark-paid`, data)
    return response
  },
  getPayrollSummary: async (year: number) => {
    const { data } = await api.get(`/payroll/summary/${year}`)
    return data
  },
}

export default function PayrollPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'structures' | 'runs' | 'summary' | 'staff'>('staff')
  const [staffFilter, setStaffFilter] = useState<'all' | 'teaching' | 'non-teaching'>('all')
  const [showAddStructure, setShowAddStructure] = useState(false)
  const [showEditStructure, setShowEditStructure] = useState(false)
  const [showStructureDetails, setShowStructureDetails] = useState(false)
  const [showProcessPayroll, setShowProcessPayroll] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [selectedStructure, setSelectedStructure] = useState<any>(null)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [toast, setToast] = useState({ isOpen: false, title: '', message: '', type: 'success' as any })
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const showToast = (title: string, message: string, type: any) => setToast({ isOpen: true, title, message, type })

  const { data: structures } = useQuery({ queryKey: ['salary-structures'], queryFn: payrollApi.listSalaryStructures })
  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: payrollApi.listStaff })
  const { data: runs } = useQuery({ queryKey: ['payroll-runs'], queryFn: payrollApi.listPayrollRuns })
  const { data: summary } = useQuery({ queryKey: ['payroll-summary', new Date().getFullYear()], queryFn: () => payrollApi.getPayrollSummary(new Date().getFullYear()) })

  const teachingStaff = staff?.filter((s: any) => s.role === 'Teacher') || []
  const nonTeachingStaff = staff?.filter((s: any) => s.role !== 'Teacher') || []
  const filteredStaff = staffFilter === 'teaching' ? teachingStaff : staffFilter === 'non-teaching' ? nonTeachingStaff : staff || []

  const exportStaffList = () => {
    if (!filteredStaff || filteredStaff.length === 0) return
    
    const data = filteredStaff.map((s: any, index: number) => {
      const salary = structures?.find((str: any) => str.staff_id === s.id)
      return {
        '#': index + 1,
        'Employee ID': s.employee_id,
        'Name': `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim(),
        'Email': s.email,
        'Phone': s.phone,
        'Role': s.role,
        'Department': s.department || 'N/A',
        'Type': s.role === 'Teacher' ? 'Teaching' : 'Non-Teaching',
        'Base Salary': salary?.base_salary || 0,
        'Allowances': ((salary?.housing_allowance || 0) + (salary?.transport_allowance || 0) + (salary?.medical_allowance || 0) + (salary?.other_allowances || 0)),
        'Deductions': ((salary?.nssf_deduction || 0) + (salary?.paye_deduction || 0) + (salary?.loan_deduction || 0) + (salary?.other_deductions || 0)),
        'Net Salary': salary ? ((salary.base_salary || 0) + (salary.housing_allowance || 0) + (salary.transport_allowance || 0) + (salary.medical_allowance || 0) + (salary.other_allowances || 0) - (salary.nssf_deduction || 0) - (salary.paye_deduction || 0) - (salary.loan_deduction || 0) - (salary.other_deductions || 0)) : 0,
        'Status': s.status,
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Staff List')
    XLSX.writeFile(wb, `staff-list-${staffFilter}-${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('Success!', 'Staff list exported successfully', 'success')
  }

  const createMutation = useMutation({
    mutationFn: payrollApi.createSalaryStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      setShowAddStructure(false)
      showToast('Success!', 'Salary structure created', 'success')
    },
    onError: () => showToast('Error', 'Failed to create salary structure', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => payrollApi.updateSalaryStructure(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      setShowEditStructure(false)
      setSelectedStructure(null)
      showToast('Success!', 'Salary structure updated', 'success')
    },
    onError: () => showToast('Error', 'Failed to update salary structure', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: payrollApi.deleteSalaryStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      showToast('Deleted!', 'Salary structure deleted', 'success')
    },
    onError: () => showToast('Error', 'Failed to delete', 'error'),
  })

  const processMutation = useMutation({
    mutationFn: payrollApi.processPayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      setShowProcessPayroll(false)
      showToast('Success!', 'Payroll processed successfully', 'success')
    },
    onError: () => showToast('Error', 'Failed to process payroll', 'error'),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }: any) => payrollApi.markPaymentPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      setShowMarkPaid(false)
      setSelectedPayment(null)
      showToast('Payment Marked!', 'Payment has been marked as paid', 'success')
    },
    onError: () => showToast('Error', 'Failed to mark payment as paid', 'error'),
  })

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payroll Management</h1>
          <p className="text-gray-600">Manage salaries and process monthly payroll</p>
        </div>

        <div className="flex gap-3 mb-6 border-b border-gray-200">
          {[
            { key: 'staff', label: 'Staff List' },
            { key: 'structures', label: 'Salary Structures' },
            { key: 'runs', label: 'Payroll Runs' },
            { key: 'summary', label: 'Summary' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'staff' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                {[
                  { key: 'all', label: `All Staff (${staff?.length || 0})` },
                  { key: 'teaching', label: `Teaching (${teachingStaff.length})` },
                  { key: 'non-teaching', label: `Non-Teaching (${nonTeachingStaff.length})` }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setStaffFilter(filter.key as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      staffFilter === filter.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button
                onClick={exportStaffList}
                disabled={!filteredStaff || filteredStaff.length === 0}
                className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export to Excel
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredStaff?.map((s: any) => {
                    const hasSalary = structures?.some((str: any) => str.staff_id === s.id)
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{s.first_name} {s.middle_name} {s.last_name}</div>
                          <div className="text-sm text-gray-500">{s.employee_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{s.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{s.role}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${s.role === 'Teacher' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {s.role === 'Teacher' ? 'Teaching' : 'Non-Teaching'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasSalary ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Configured</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Not Set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!hasSalary && (
                            <button
                              onClick={() => {
                                setSelectedStructure({ 
                                  staff_id: s.id, 
                                  employee_name: `${s.first_name} ${s.last_name}`, 
                                  employee_role: s.role,
                                  base_salary: s.salary || 0
                                })
                                setShowAddStructure(true)
                              }}
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
                            >
                              Set Salary
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'structures' && (
          <div>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowAddStructure(true)}
                className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Add Salary Structure
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Basic Salary</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Allowances</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Net Salary</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {structures?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.employee_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{s.employee_role}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">UGX {(s.base_salary || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">UGX {((s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0) + (s.other_allowances || 0)).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">UGX {((s.nssf_deduction || 0) + (s.paye_deduction || 0) + (s.loan_deduction || 0) + (s.other_deductions || 0)).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">UGX {((s.base_salary || 0) + (s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0) + (s.other_allowances || 0) - (s.nssf_deduction || 0) - (s.paye_deduction || 0) - (s.loan_deduction || 0) - (s.other_deductions || 0)).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedStructure(s)
                              setShowStructureDetails(true)
                            }}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStructure(s)
                              setShowEditStructure(true)
                            }}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200 transition-colors"
                            title="Edit Structure"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Salary Structure',
                                message: `Delete salary structure for ${s.employee_name}?`,
                                onConfirm: () => {
                                  deleteMutation.mutate(s.id)
                                  setConfirmDialog({ ...confirmDialog, isOpen: false })
                                },
                              })
                            }}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                            title="Delete Structure"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'runs' && (
          <div>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowProcessPayroll(true)}
                className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Process Payroll
              </button>
            </div>
            <div className="space-y-4">
              {runs?.map((run: any) => {
                const totalEmployees = run.payments?.length || 0
                const paymentsMade = run.payments?.filter((p: any) => p.payment_status === 'paid').length || 0
                return (
                  <div key={run.id} className="bg-white rounded-lg shadow border border-gray-200">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{run.month}/{run.year} Payroll</h3>
                          <p className="text-sm text-gray-500 mt-1">Processed on {new Date(run.processed_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded ${run.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-6 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Employees</p>
                          <p className="text-2xl font-semibold text-gray-900">{totalEmployees}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                          <p className="text-2xl font-semibold text-indigo-600">UGX {run.total_net?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Payments Made</p>
                          <p className="text-2xl font-semibold text-green-600">{paymentsMade}/{totalEmployees}</p>
                        </div>
                      </div>
                    </div>
                    {run.payments && run.payments.length > 0 && (
                      <div className="border-t border-gray-200">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Employee</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Base</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Allowances</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Deductions</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Net</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {run.payments.map((payment: any) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">{payment.employee_name}</div>
                                  <div className="text-sm text-gray-500">{payment.employee_role}</div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">UGX {payment.base_salary?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">UGX {payment.total_allowances?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">UGX {payment.total_deductions?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-sm font-medium text-green-600">UGX {payment.net_salary?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                  {payment.payment_status === 'paid' ? (
                                    <div>
                                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Paid</span>
                                      <div className="text-xs text-gray-500 mt-1">{payment.payment_method}</div>
                                      {payment.payment_date && <div className="text-xs text-gray-500">{new Date(payment.payment_date).toLocaleDateString()}</div>}
                                    </div>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Pending</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {payment.payment_status === 'pending' && (
                                    <button
                                      onClick={() => {
                                        setSelectedPayment(payment)
                                        setShowMarkPaid(true)
                                      }}
                                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <p className="text-sm text-gray-600 mb-2">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900">{summary?.total_employees || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <p className="text-sm text-gray-600 mb-2">Total Paid ({new Date().getFullYear()})</p>
                <p className="text-3xl font-bold text-gray-900">UGX {(summary?.total_net || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                <p className="text-sm text-gray-600 mb-2">Average Salary</p>
                <p className="text-3xl font-bold text-gray-900">UGX {(summary?.average_salary || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                <p className="text-sm text-gray-600 mb-2">Payroll Runs</p>
                <p className="text-3xl font-bold text-gray-900">{summary?.payroll_runs || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Payments Completed</p>
                      <p className="text-2xl font-bold text-green-600">{summary?.payments_paid || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="text-lg font-semibold text-green-600">UGX {(summary?.amount_paid || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Payments Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{summary?.payments_pending || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="text-lg font-semibold text-yellow-600">UGX {(summary?.amount_pending || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Total Gross Salary</span>
                    <span className="text-sm font-semibold text-gray-900">UGX {(summary?.total_gross || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Total Net Salary</span>
                    <span className="text-sm font-semibold text-gray-900">UGX {(summary?.total_net || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Total Deductions</span>
                    <span className="text-sm font-semibold text-red-600">UGX {((summary?.total_gross || 0) - (summary?.total_net || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {summary?.monthly_breakdown && summary.monthly_breakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown ({new Date().getFullYear()})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Month</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Gross Salary</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Net Salary</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Deductions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {summary.monthly_breakdown.map((month: any) => (
                        <tr key={month.month} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {new Date(2000, month.month - 1).toLocaleString('default', { month: 'long' })}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-900">UGX {(month.total_gross || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-green-600">UGX {(month.total_net || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-sm text-red-600">UGX {((month.total_gross || 0) - (month.total_net || 0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {showAddStructure && <AddStructureModal staff={staff} preselected={selectedStructure} onClose={() => { setShowAddStructure(false); setSelectedStructure(null); }} onSubmit={createMutation.mutate} />}
        {showEditStructure && selectedStructure && (
          <EditSalaryStructureModal 
            structure={selectedStructure} 
            onClose={() => { setShowEditStructure(false); setSelectedStructure(null); }} 
            onSubmit={(id, data) => updateMutation.mutate({ id, data })}
            isLoading={updateMutation.isPending}
          />
        )}
        {showStructureDetails && selectedStructure && (
          <SalaryStructureDetailsModal 
            structure={selectedStructure} 
            onClose={() => { setShowStructureDetails(false); setSelectedStructure(null); }}
            onEdit={(structure) => {
              setShowStructureDetails(false)
              setSelectedStructure(structure)
              setShowEditStructure(true)
            }}
            onDelete={(id) => {
              setConfirmDialog({
                isOpen: true,
                title: 'Delete Salary Structure',
                message: `Delete salary structure for ${selectedStructure.employee_name}?`,
                onConfirm: () => {
                  deleteMutation.mutate(id)
                  setConfirmDialog({ ...confirmDialog, isOpen: false })
                  setShowStructureDetails(false)
                  setSelectedStructure(null)
                },
              })
            }}
          />
        )}
        {showProcessPayroll && <ProcessPayrollModal onClose={() => setShowProcessPayroll(false)} onSubmit={processMutation.mutate} />}
        {showMarkPaid && <MarkPaidModal payment={selectedPayment} onClose={() => { setShowMarkPaid(false); setSelectedPayment(null); }} onSubmit={(data: any) => markPaidMutation.mutate({ id: selectedPayment.id, data })} />}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type="danger"
        />

        <Toast isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} title={toast.title} message={toast.message} type={toast.type} />
      </div>
    </DashboardLayout>
  )
}

function AddStructureModal({ staff, preselected, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ 
    staff_id: preselected?.staff_id || '', 
    employee_name: preselected?.employee_name || '', 
    employee_role: preselected?.employee_role || '', 
    base_salary: preselected?.base_salary || '', 
    housing_allowance: '', 
    transport_allowance: '', 
    nssf_deduction: '', 
    paye_deduction: '', 
    effective_from: new Date().toISOString().split('T')[0] 
  })

  const handleStaffSelect = (staffId: string) => {
    const staffMember = staff?.find((s: any) => s.id === staffId)
    if (staffMember) {
      setFormData({ 
        ...formData, 
        staff_id: staffId, 
        employee_name: `${staffMember.first_name} ${staffMember.last_name}`, 
        employee_role: staffMember.role,
        base_salary: staffMember.salary || 0
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">Add Salary Structure</h3>
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const payload = {
            staff_id: formData.staff_id,
            employee_name: formData.employee_name,
            employee_role: formData.employee_role,
            base_salary: parseFloat(formData.base_salary) || 0,
            housing_allowance: parseFloat(formData.housing_allowance) || 0,
            transport_allowance: parseFloat(formData.transport_allowance) || 0,
            nssf_deduction: parseFloat(formData.nssf_deduction) || 0,
            paye_deduction: parseFloat(formData.paye_deduction) || 0,
            effective_from: formData.effective_from
          };
          onSubmit(payload); 
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Staff Member *</label>
            <select value={formData.staff_id} onChange={(e) => handleStaffSelect(e.target.value)} required className="w-full border rounded-lg px-3 py-2" disabled={!!preselected}>
              <option value="">Choose staff...</option>
              {staff?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Employee Name</label>
              <input type="text" value={formData.employee_name} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <input type="text" value={formData.employee_role} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Base Salary (UGX) *</label>
              <input 
                type="number" 
                value={formData.base_salary} 
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} 
                required 
                className="w-full border rounded-lg px-3 py-2"
              />
              {formData.base_salary && formData.staff_id && (
                <p className="text-xs text-gray-500 mt-1">Pre-filled from staff record</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Housing Allowance (UGX)</label>
              <input type="number" value={formData.housing_allowance} onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Transport Allowance (UGX)</label>
              <input type="number" value={formData.transport_allowance} onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">NSSF Deduction (UGX)</label>
              <input type="number" value={formData.nssf_deduction} onChange={(e) => setFormData({ ...formData, nssf_deduction: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">PAYE Deduction (UGX)</label>
            <input type="number" value={formData.paye_deduction} onChange={(e) => setFormData({ ...formData, paye_deduction: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Effective From *</label>
            <input type="date" value={formData.effective_from} onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 rounded-lg hover:shadow-xl transition-all font-semibold">Create</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProcessPayrollModal({ onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Process Payroll</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Month *</label>
            <select value={formData.month} onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })} required className="w-full border rounded-lg px-3 py-2">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year *</label>
            <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg hover:shadow-xl transition-all font-semibold">Process</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MarkPaidModal({ payment, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ method: 'bank_transfer', ref: '' })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Mark Payment as Paid</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600">Employee</p>
          <p className="text-lg font-semibold text-gray-900">{payment?.employee_name}</p>
          <p className="text-sm text-gray-600 mt-2">Amount</p>
          <p className="text-lg font-semibold text-green-600">UGX {payment?.net_salary?.toLocaleString()}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method *</label>
            <select value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value })} required className="w-full border rounded-lg px-3 py-2">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Reference</label>
            <input type="text" value={formData.ref} onChange={(e) => setFormData({ ...formData, ref: e.target.value })} placeholder="Transaction ID or reference" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg hover:shadow-xl transition-all font-semibold">Confirm Payment</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
