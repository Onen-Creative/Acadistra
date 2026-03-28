'use client'

import { useState } from 'react'
import { X, User, DollarSign, Plus, Minus, Calendar, Building, Phone, Mail } from 'lucide-react'

interface SalaryStructure {
  id: number
  staff_id: string
  employee_name: string
  employee_role: string
  employee_id?: string
  employee_email?: string
  employee_phone?: string
  department?: string
  base_salary: number
  housing_allowance?: number
  transport_allowance?: number
  medical_allowance?: number
  lunch_allowance?: number
  overtime_allowance?: number
  performance_bonus?: number
  other_allowances?: number
  nssf_deduction?: number
  paye_deduction?: number
  loan_deduction?: number
  insurance_deduction?: number
  union_deduction?: number
  other_deductions?: number
  effective_from: string
  effective_to?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface SalaryStructureDetailsModalProps {
  structure: SalaryStructure
  onClose: () => void
  onEdit: (structure: SalaryStructure) => void
  onDelete: (id: number) => void
}

export function SalaryStructureDetailsModal({ 
  structure, 
  onClose, 
  onEdit, 
  onDelete 
}: SalaryStructureDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calculate totals
  const totalAllowances = (
    (structure.housing_allowance || 0) +
    (structure.transport_allowance || 0) +
    (structure.medical_allowance || 0) +
    (structure.lunch_allowance || 0) +
    (structure.overtime_allowance || 0) +
    (structure.performance_bonus || 0) +
    (structure.other_allowances || 0)
  )

  const totalDeductions = (
    (structure.nssf_deduction || 0) +
    (structure.paye_deduction || 0) +
    (structure.loan_deduction || 0) +
    (structure.insurance_deduction || 0) +
    (structure.union_deduction || 0) +
    (structure.other_deductions || 0)
  )

  const grossSalary = structure.base_salary + totalAllowances
  const netSalary = grossSalary - totalDeductions

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{structure.employee_name}</h2>
                <p className="text-sm text-gray-500">{structure.employee_role} • Salary Structure Details</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                structure.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {structure.status}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Employee Information */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Employee Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {structure.employee_id && (
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="font-medium text-gray-900">{structure.employee_id}</p>
                </div>
              )}
              {structure.employee_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{structure.employee_email}</p>
                  </div>
                </div>
              )}
              {structure.employee_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{structure.employee_phone}</p>
                  </div>
                </div>
              )}
              {structure.department && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium text-gray-900">{structure.department}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Effective From</p>
                  <p className="font-medium text-gray-900">{formatDate(structure.effective_from)}</p>
                </div>
              </div>
              {structure.effective_to && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Effective To</p>
                    <p className="font-medium text-gray-900">{formatDate(structure.effective_to)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Base Salary */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Base Salary</h3>
                  <p className="text-sm text-gray-600">Monthly basic pay</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(structure.base_salary)}</p>
            </div>

            {/* Allowances */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Total Allowances</h3>
                  <p className="text-sm text-gray-600">Additional benefits</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAllowances)}</p>
            </div>

            {/* Deductions */}
            <div className="bg-red-50 rounded-xl p-6 border border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <Minus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Total Deductions</h3>
                  <p className="text-sm text-gray-600">Taxes & deductions</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Allowances Breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Allowances Breakdown
              </h3>
              <div className="space-y-3">
                {(structure.housing_allowance || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Housing Allowance</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.housing_allowance || 0)}</span>
                  </div>
                )}
                {(structure.transport_allowance || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Transport Allowance</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.transport_allowance || 0)}</span>
                  </div>
                )}
                {(structure.medical_allowance || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Medical Allowance</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.medical_allowance || 0)}</span>
                  </div>
                )}
                {(structure.lunch_allowance || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Lunch Allowance</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.lunch_allowance || 0)}</span>
                  </div>
                )}
                {(structure.overtime_allowance || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Overtime Allowance</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.overtime_allowance || 0)}</span>
                  </div>
                )}
                {(structure.performance_bonus || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Performance Bonus</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.performance_bonus || 0)}</span>
                  </div>
                )}
                {(structure.other_allowances || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Other Allowances</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.other_allowances || 0)}</span>
                  </div>
                )}
                {totalAllowances === 0 && (
                  <p className="text-sm text-gray-500 italic">No allowances configured</p>
                )}
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Minus className="w-5 h-5 text-red-600" />
                Deductions Breakdown
              </h3>
              <div className="space-y-3">
                {(structure.nssf_deduction || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">NSSF Deduction</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.nssf_deduction || 0)}</span>
                  </div>
                )}
                {(structure.paye_deduction || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">PAYE Tax</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.paye_deduction || 0)}</span>
                  </div>
                )}
                {(structure.loan_deduction || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Loan Deduction</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.loan_deduction || 0)}</span>
                  </div>
                )}
                {(structure.insurance_deduction || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Insurance Deduction</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.insurance_deduction || 0)}</span>
                  </div>
                )}
                {(structure.union_deduction || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Union Deduction</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.union_deduction || 0)}</span>
                  </div>
                )}
                {(structure.other_deductions || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Other Deductions</span>
                    <span className="font-medium text-gray-900">{formatCurrency(structure.other_deductions || 0)}</span>
                  </div>
                )}
                {totalDeductions === 0 && (
                  <p className="text-sm text-gray-500 italic">No deductions configured</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Gross Salary</p>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(grossSalary)}</p>
                <p className="text-xs text-gray-500">Base + Allowances</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
                <p className="text-xs text-gray-500">Taxes & Other</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Net Salary</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(netSalary)}</p>
                <p className="text-xs text-gray-500">Take Home Pay</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 font-medium text-gray-900">{formatDate(structure.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <span className="ml-2 font-medium text-gray-900">{formatDate(structure.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Delete Structure
            </button>
            <button
              onClick={() => onEdit(structure)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Edit Structure
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Salary Structure</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the salary structure for <strong>{structure.employee_name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(structure.id)
                    setShowDeleteConfirm(false)
                    onClose()
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}