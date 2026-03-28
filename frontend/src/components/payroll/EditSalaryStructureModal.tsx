'use client'

import { useState, useEffect } from 'react'
import { X, User, DollarSign, Plus, Minus, Calendar, Save } from 'lucide-react'

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

interface EditSalaryStructureModalProps {
  structure: SalaryStructure
  onClose: () => void
  onSubmit: (id: number, data: Partial<SalaryStructure>) => void
  isLoading?: boolean
}

export function EditSalaryStructureModal({ 
  structure, 
  onClose, 
  onSubmit, 
  isLoading = false 
}: EditSalaryStructureModalProps) {
  const [formData, setFormData] = useState({
    base_salary: structure.base_salary || 0,
    housing_allowance: structure.housing_allowance || 0,
    transport_allowance: structure.transport_allowance || 0,
    medical_allowance: structure.medical_allowance || 0,
    lunch_allowance: structure.lunch_allowance || 0,
    overtime_allowance: structure.overtime_allowance || 0,
    performance_bonus: structure.performance_bonus || 0,
    other_allowances: structure.other_allowances || 0,
    nssf_deduction: structure.nssf_deduction || 0,
    paye_deduction: structure.paye_deduction || 0,
    loan_deduction: structure.loan_deduction || 0,
    insurance_deduction: structure.insurance_deduction || 0,
    union_deduction: structure.union_deduction || 0,
    other_deductions: structure.other_deductions || 0,
    effective_from: structure.effective_from.split('T')[0],
    effective_to: structure.effective_to ? structure.effective_to.split('T')[0] : '',
    status: structure.status
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Calculate totals
  const totalAllowances = (
    formData.housing_allowance +
    formData.transport_allowance +
    formData.medical_allowance +
    formData.lunch_allowance +
    formData.overtime_allowance +
    formData.performance_bonus +
    formData.other_allowances
  )

  const totalDeductions = (
    formData.nssf_deduction +
    formData.paye_deduction +
    formData.loan_deduction +
    formData.insurance_deduction +
    formData.union_deduction +
    formData.other_deductions
  )

  const grossSalary = formData.base_salary + totalAllowances
  const netSalary = grossSalary - totalDeductions

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (field.includes('_') ? parseFloat(value) || 0 : value) : value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.base_salary <= 0) {
      newErrors.base_salary = 'Base salary must be greater than 0'
    }

    if (!formData.effective_from) {
      newErrors.effective_from = 'Effective from date is required'
    }

    if (formData.effective_to && formData.effective_to <= formData.effective_from) {
      newErrors.effective_to = 'Effective to date must be after effective from date'
    }

    if (netSalary < 0) {
      newErrors.general = 'Net salary cannot be negative. Please adjust allowances or deductions.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      base_salary: formData.base_salary,
      housing_allowance: formData.housing_allowance,
      transport_allowance: formData.transport_allowance,
      medical_allowance: formData.medical_allowance,
      lunch_allowance: formData.lunch_allowance,
      overtime_allowance: formData.overtime_allowance,
      performance_bonus: formData.performance_bonus,
      other_allowances: formData.other_allowances,
      nssf_deduction: formData.nssf_deduction,
      paye_deduction: formData.paye_deduction,
      loan_deduction: formData.loan_deduction,
      insurance_deduction: formData.insurance_deduction,
      union_deduction: formData.union_deduction,
      other_deductions: formData.other_deductions,
      effective_from: formData.effective_from + 'T00:00:00Z', // Convert to ISO string
      effective_to: formData.effective_to ? formData.effective_to + 'T00:00:00Z' : undefined,
      status: formData.status
    }

    onSubmit(structure.id, submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Salary Structure</h2>
                <p className="text-sm text-gray-500">{structure.employee_name} • {structure.employee_role}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Live Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Salary Calculation</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Base Salary</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(formData.base_salary)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Allowances</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalAllowances)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Net Salary</p>
                <p className={`text-2xl font-bold ${netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netSalary)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Basic Salary Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Salary (UGX) *
                    </label>
                    <input
                      type="number"
                      value={formData.base_salary}
                      onChange={(e) => handleInputChange('base_salary', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.base_salary ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      step="1000"
                      required
                    />
                    {errors.base_salary && (
                      <p className="text-red-600 text-sm mt-1">{errors.base_salary}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective From *
                      </label>
                      <input
                        type="date"
                        value={formData.effective_from}
                        onChange={(e) => handleInputChange('effective_from', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.effective_from ? 'border-red-300' : 'border-gray-300'
                        }`}
                        required
                      />
                      {errors.effective_from && (
                        <p className="text-red-600 text-sm mt-1">{errors.effective_from}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective To (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.effective_to}
                        onChange={(e) => handleInputChange('effective_to', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.effective_to ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.effective_to && (
                        <p className="text-red-600 text-sm mt-1">{errors.effective_to}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Allowances */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Allowances
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Housing Allowance (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.housing_allowance}
                        onChange={(e) => handleInputChange('housing_allowance', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transport Allowance (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.transport_allowance}
                        onChange={(e) => handleInputChange('transport_allowance', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medical Allowance (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.medical_allowance}
                        onChange={(e) => handleInputChange('medical_allowance', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lunch Allowance (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.lunch_allowance}
                        onChange={(e) => handleInputChange('lunch_allowance', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overtime Allowance (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.overtime_allowance}
                        onChange={(e) => handleInputChange('overtime_allowance', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Performance Bonus (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.performance_bonus}
                        onChange={(e) => handleInputChange('performance_bonus', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Allowances (UGX)
                    </label>
                    <input
                      type="number"
                      value={formData.other_allowances}
                      onChange={(e) => handleInputChange('other_allowances', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-6">
              <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Minus className="w-5 h-5 text-red-600" />
                  Deductions
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NSSF Deduction (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.nssf_deduction}
                        onChange={(e) => handleInputChange('nssf_deduction', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                        step="1000"
                      />
                      <p className="text-xs text-gray-500 mt-1">Usually 5% of basic salary</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PAYE Tax (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.paye_deduction}
                        onChange={(e) => handleInputChange('paye_deduction', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                        step="1000"
                      />
                      <p className="text-xs text-gray-500 mt-1">Based on URA tax brackets</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Deduction (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.loan_deduction}
                        onChange={(e) => handleInputChange('loan_deduction', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Deduction (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.insurance_deduction}
                        onChange={(e) => handleInputChange('insurance_deduction', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Union Deduction (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.union_deduction}
                        onChange={(e) => handleInputChange('union_deduction', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Deductions (UGX)
                      </label>
                      <input
                        type="number"
                        value={formData.other_deductions}
                        onChange={(e) => handleInputChange('other_deductions', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      const nssf = Math.round(formData.base_salary * 0.05)
                      handleInputChange('nssf_deduction', nssf)
                    }}
                    className="w-full px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Calculate NSSF (5% of base salary)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Simple PAYE calculation (this should be more complex in real implementation)
                      const taxableIncome = grossSalary - formData.nssf_deduction
                      let paye = 0
                      if (taxableIncome > 410000) {
                        paye = Math.round((taxableIncome - 410000) * 0.3 + 82000)
                      } else if (taxableIncome > 235000) {
                        paye = Math.round((taxableIncome - 235000) * 0.2 + 17500)
                      } else if (taxableIncome > 130000) {
                        paye = Math.round((taxableIncome - 130000) * 0.1)
                      }
                      handleInputChange('paye_deduction', Math.max(0, paye))
                    }}
                    className="w-full px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    Calculate PAYE (Estimated)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}