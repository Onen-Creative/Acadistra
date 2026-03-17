'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import PaymentReceipt from '@/components/PaymentReceipt'

export default function FeesPage() {
  const [levels, setLevels] = useState<string[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [fees, setFees] = useState<any[]>([])
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedFeeDetails, setSelectedFeeDetails] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [paymentItems, setPaymentItems] = useState<{category: string, amount: number, max?: number}[]>([])
  const [feeItems, setFeeItems] = useState<{category: string, amount: number}[]>([{category: '', amount: 0}])
  const [feeTypeFilter, setFeeTypeFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')

  useEffect(() => {
    loadLevels()
  }, [])

  useEffect(() => {
    if (selectedLevel) loadClasses()
  }, [selectedLevel, year])

  useEffect(() => {
    if (selectedClass) {
      loadStudents()
      loadFees()
    }
  }, [selectedClass, term, year])

  const loadLevels = async () => {
    try {
      const response = await api.get('/api/v1/school/levels')
      setLevels(response.data.levels || [])
    } catch (error) {
      toast.error('Failed to load levels')
    }
  }

  const loadClasses = async () => {
    try {
      const response = await api.get('/api/v1/classes', { params: { year } })
      const filtered = (Array.isArray(response.data) ? response.data : []).filter((c: any) => c.level === selectedLevel)
      setClasses(filtered)
    } catch (error) {
      toast.error('Failed to load classes')
    }
  }

  const loadStudents = async () => {
    try {
      const response = await api.get('/api/v1/students', { params: { class_id: selectedClass, limit: 1000 } })
      setStudents(response.data.students || [])
    } catch (error) {
      toast.error('Failed to load students')
    }
  }

  const loadFees = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/v1/fees', { params: { class_id: selectedClass, term, year } })
      const feesData = Array.isArray(response.data) ? response.data : response.data?.fees || []
      
      // Load payment history for each fee
      const feesWithPayments = await Promise.all(feesData.map(async (fee: any) => {
        try {
          const detailsResponse = await api.get(`/fees/${fee.id}`)
          return {
            ...fee,
            payments: detailsResponse.data.payments || []
          }
        } catch (error) {
          return { ...fee, payments: [] }
        }
      }))
      
      setFees(feesWithPayments)
    } catch (error) {
      toast.error('Failed to load fees')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFees = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const feeBreakdown: {[key: string]: number} = {}
    let totalFees = 0
    feeItems.forEach(item => {
      if (item.category && item.amount > 0) {
        feeBreakdown[item.category] = item.amount
        totalFees += item.amount
      }
    })
    
    try {
      await api.post('/api/v1/fees', {
        student_id: formData.get('student_id'),
        term,
        year,
        total_fees: totalFees,
        fee_breakdown: feeBreakdown
      })
      toast.success('Fees record created successfully')
      setShowAddModal(false)
      setFeeItems([{category: '', amount: 0}])
      loadFees()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create fees')
    }
  }

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const paymentBreakdown: {[key: string]: number} = {}
    let totalAmount = 0
    paymentItems.forEach(item => {
      if (item.category && item.amount > 0) {
        paymentBreakdown[item.category] = item.amount
        totalAmount += item.amount
      }
    })
    
    try {
      const response = await api.post('/api/v1/fees/payment', {
        student_fees_id: selectedFee.id,
        amount: totalAmount,
        payment_method: formData.get('payment_method'),
        receipt_no: formData.get('receipt_no'),
        notes: formData.get('notes'),
        payment_breakdown: paymentBreakdown
      })
      toast.success('Payment recorded')
      setShowPaymentModal(false)
      
      // Show receipt
      if (response.data.payment && response.data.updated_fees) {
        setReceiptData({
          payment: response.data.payment,
          studentFees: { ...response.data.updated_fees, student: selectedFee.student }
        })
        setShowReceipt(true)
      }
      
      setSelectedFee(null)
      setPaymentItems([])
      loadFees()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record payment')
    }
  }

  const exportToExcel = () => {
    const data = fees.map((f: any, i: number) => {
      const row: any = {
        '#': i + 1,
        'Student': `${f.student?.first_name}${f.student?.middle_name ? ` ${f.student.middle_name}` : ''} ${f.student?.last_name}`,
        'Admission No': f.student?.admission_no,
        'Class': f.student?.class_name || 'N/A',
      }
      
      // Add fee breakdown columns
      if (f.fee_breakdown) {
        Object.entries(f.fee_breakdown).forEach(([category, total]: [string, any]) => {
          const paid = f.paid_breakdown?.[category] || 0
          const outstanding = total - paid
          row[`${category} - Total`] = total
          row[`${category} - Paid`] = paid
          row[`${category} - Outstanding`] = outstanding
        })
      }
      
      row['Total Fees'] = f.total_fees
      row['Total Paid'] = f.amount_paid
      row['Total Outstanding'] = f.outstanding
      row['Payment Status'] = f.outstanding === 0 ? 'Fully Paid' : f.amount_paid > 0 ? 'Partially Paid' : 'Not Paid'
      
      return row
    })
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Fees')
    XLSX.writeFile(wb, `fees_${term}_${year}_${selectedClass ? classes.find(c => c.id === selectedClass)?.name : 'all'}.xlsx`)
  }

  // Get all unique fee types from fees data
  const allFeeTypes = Array.from(new Set(
    fees.flatMap(f => f.fee_breakdown ? Object.keys(f.fee_breakdown) : [])
  ))

  // Filter fees based on fee type and payment status
  const filteredFees = fees.filter((fee: any) => {
    // Fee type filter - only show students who have this fee type
    if (feeTypeFilter && fee.fee_breakdown) {
      if (!fee.fee_breakdown[feeTypeFilter]) return false
    }
    
    // Payment status filter
    if (paymentStatusFilter) {
      if (feeTypeFilter) {
        // Filter based on specific fee type payment status
        const total = fee.fee_breakdown?.[feeTypeFilter] || 0
        const paid = fee.paid_breakdown?.[feeTypeFilter] || 0
        const outstanding = total - paid
        
        if (paymentStatusFilter === 'paid' && outstanding > 0) return false
        if (paymentStatusFilter === 'partial' && (paid === 0 || outstanding === 0)) return false
        if (paymentStatusFilter === 'unpaid' && paid > 0) return false
      } else {
        // Filter based on overall payment status
        if (paymentStatusFilter === 'paid' && fee.outstanding > 0) return false
        if (paymentStatusFilter === 'partial' && (fee.amount_paid === 0 || fee.outstanding === 0)) return false
        if (paymentStatusFilter === 'unpaid' && fee.amount_paid > 0) return false
      }
    }
    
    return true
  })

  // Calculate totals based on fee type filter
  const totals = feeTypeFilter ? {
    expected: filteredFees.reduce((sum, f) => sum + (f.fee_breakdown?.[feeTypeFilter] || 0), 0),
    paid: filteredFees.reduce((sum, f) => sum + (f.paid_breakdown?.[feeTypeFilter] || 0), 0),
    outstanding: filteredFees.reduce((sum, f) => {
      const total = f.fee_breakdown?.[feeTypeFilter] || 0
      const paid = f.paid_breakdown?.[feeTypeFilter] || 0
      return sum + (total - paid)
    }, 0)
  } : {
    expected: filteredFees.reduce((sum, f) => sum + (f.total_fees || 0), 0),
    paid: filteredFees.reduce((sum, f) => sum + (f.amount_paid || 0), 0),
    outstanding: filteredFees.reduce((sum, f) => sum + (f.outstanding || 0), 0)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fees Management</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg" />
            <select value={selectedLevel} onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClass('') }} className="px-3 py-2 border rounded-lg">
              <option value="">Select Level</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedLevel} className="px-3 py-2 border rounded-lg disabled:opacity-50">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={feeTypeFilter} onChange={(e) => setFeeTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">All Fee Types</option>
              {allFeeTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">All Status</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Not Paid</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(true)} disabled={!selectedClass} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Add</button>
              <button onClick={exportToExcel} disabled={!filteredFees.length} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Export</button>
            </div>
          </div>
        </div>

        {/* Totals */}
        {selectedClass && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600">{feeTypeFilter ? `${feeTypeFilter} - Expected` : 'Expected'}</p>
              <p className="text-2xl font-bold text-blue-700">UGX {totals.expected.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">{feeTypeFilter ? `${feeTypeFilter} - Collected` : 'Collected'}</p>
              <p className="text-2xl font-bold text-green-700">UGX {totals.paid.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{feeTypeFilter ? `${feeTypeFilter} - Outstanding` : 'Outstanding'}</p>
              <p className="text-2xl font-bold text-red-700">UGX {totals.outstanding.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : selectedClass && filteredFees.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Student</th>
                  {/* Dynamic fee type columns - show only selected fee type or all */}
                  {feeTypeFilter ? (
                    <>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div>{feeTypeFilter}</div>
                        <div className="text-[10px] font-normal text-gray-400">(Paid/Total)</div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    </>
                  ) : (
                    filteredFees.length > 0 && filteredFees[0].fee_breakdown && Object.keys(filteredFees[0].fee_breakdown).map((feeType: string) => (
                      <th key={feeType} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div>{feeType}</div>
                        <div className="text-[10px] font-normal text-gray-400">(Paid/Total)</div>
                      </th>
                    ))
                  )}
                  {!feeTypeFilter && (
                    <>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Fees</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Paid</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFees.map((fee: any) => {
                  const feeTypes = feeTypeFilter ? [feeTypeFilter] : (fee.fee_breakdown ? Object.keys(fee.fee_breakdown) : [])
                  return (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        <p className="font-medium text-sm whitespace-nowrap">
                          {fee.student?.first_name}
                          {fee.student?.middle_name && ` ${fee.student.middle_name}`}
                          {` ${fee.student?.last_name}`}
                        </p>
                        <p className="text-xs text-gray-500">{fee.student?.admission_no}</p>
                      </td>
                      {/* Dynamic fee type values */}
                      {feeTypes.map((feeType: string) => {
                        const total = fee.fee_breakdown?.[feeType] || 0
                        const paid = fee.paid_breakdown?.[feeType] || 0
                        const outstanding = total - paid
                        return (
                          <td key={feeType} className="px-3 py-3 text-center">
                            <div className="text-xs">
                              <span className={paid > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                {paid.toLocaleString()}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="font-medium">{total.toLocaleString()}</span>
                            </div>
                            {outstanding > 0 && (
                              <div className="text-[10px] text-red-600 font-medium">
                                -{outstanding.toLocaleString()}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      {feeTypeFilter ? (
                        <>
                          <td className="px-4 py-3 text-center font-semibold text-sm">UGX {(fee.fee_breakdown?.[feeTypeFilter] || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600 text-sm">UGX {(fee.paid_breakdown?.[feeTypeFilter] || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-semibold text-red-600 text-sm">UGX {((fee.fee_breakdown?.[feeTypeFilter] || 0) - (fee.paid_breakdown?.[feeTypeFilter] || 0)).toLocaleString()}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-center font-semibold text-sm">UGX {fee.total_fees?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600 text-sm">UGX {fee.amount_paid?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-semibold text-red-600 text-sm">UGX {fee.outstanding?.toLocaleString()}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center sticky right-0 bg-white">
                        <div className="flex justify-center gap-2 flex-wrap">
                          <button onClick={() => { setSelectedFeeDetails(fee); setShowDetailsModal(true) }} className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 whitespace-nowrap">Details</button>
                          <button onClick={() => { 
                            setSelectedFee(fee)
                            // Auto-load payment items with fee breakdown
                            if (fee.fee_breakdown) {
                              const items = Object.entries(fee.fee_breakdown).map(([category, total]: [string, any]) => {
                                const paid = fee.paid_breakdown?.[category] || 0
                                const outstanding = total - paid
                                return { category, amount: 0, max: outstanding }
                              })
                              setPaymentItems(items)
                            } else {
                              setPaymentItems([])
                            }
                            setShowPaymentModal(true)
                          }} className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 whitespace-nowrap">Pay</button>
                          {fee.payments && fee.payments.length > 0 && (
                            <button 
                              onClick={() => {
                                const lastPayment = fee.payments[0]
                                setReceiptData({
                                  payment: lastPayment,
                                  studentFees: { ...fee, student: fee.student }
                                })
                                setShowReceipt(true)
                              }}
                              className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600 whitespace-nowrap"
                            >
                              Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : selectedClass ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No fees records found</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Select a class to view fees</div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Add Fees Record</h3>
              <form onSubmit={handleAddFees} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Student</label>
                  <select name="student_id" required className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name}
                        {s.middle_name && ` ${s.middle_name}`}
                        {` ${s.last_name}`} - {s.admission_no}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Fee Breakdown</label>
                  <div className="space-y-3">
                    {feeItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const newItems = [...feeItems]
                            newItems[index].category = e.target.value
                            setFeeItems(newItems)
                          }}
                          className="flex-1 border rounded-lg px-3 py-2"
                          required
                        >
                          <option value="">Select fee type</option>
                          <option value="Tuition">Tuition</option>
                          <option value="Uniform">Uniform</option>
                          <option value="Medical">Medical</option>
                          <option value="Boarding">Boarding</option>
                          <option value="Transport">Transport</option>
                          <option value="Meals">Meals</option>
                          <option value="Books">Books</option>
                          <option value="Sports">Sports</option>
                          <option value="Development">Development</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ''}
                          onChange={(e) => {
                            const newItems = [...feeItems]
                            newItems[index].amount = parseFloat(e.target.value) || 0
                            setFeeItems(newItems)
                          }}
                          className="w-40 border rounded-lg px-3 py-2"
                          required
                          min="0"
                        />
                        {feeItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFeeItems(feeItems.filter((_, i) => i !== index))}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFeeItems([...feeItems, {category: '', amount: 0}])}
                      className="text-blue-600 text-sm font-medium hover:text-blue-700"
                    >
                      + Add Another Fee Type
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Fees:</span>
                      <span className="text-2xl font-bold text-blue-600">UGX {feeItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create Fees Record</button>
                  <button type="button" onClick={() => { setShowAddModal(false); setFeeItems([{category: '', amount: 0}]) }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedFee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Record Payment</h3>
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <p className="font-semibold text-lg">
                  {selectedFee.student?.first_name}
                  {selectedFee.student?.middle_name && ` ${selectedFee.student.middle_name}`}
                  {` ${selectedFee.student?.last_name}`}
                </p>
                <p className="text-sm text-gray-600">{selectedFee.student?.admission_no} • {term} {year}</p>
                <div className="mt-3 flex gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Total Fees</p>
                    <p className="font-bold text-blue-700">UGX {selectedFee.total_fees?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Paid</p>
                    <p className="font-bold text-green-600">UGX {selectedFee.amount_paid?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Outstanding</p>
                    <p className="font-bold text-red-600">UGX {selectedFee.outstanding?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">Payment Breakdown by Fee Type</label>
                  {paymentItems.length > 0 ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-800 mb-2">Outstanding by Category:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {paymentItems.map((item: any) => (
                            <div key={item.category} className="flex justify-between">
                              <span className="text-gray-700">{item.category}:</span>
                              <span className="font-semibold text-red-600">UGX {(item.max || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {paymentItems.map((item: any, index) => {
                          const feeTotal = selectedFee.fee_breakdown?.[item.category] || 0
                          const feePaid = selectedFee.paid_breakdown?.[item.category] || 0
                          return (
                            <div key={index} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <p className="font-medium text-sm capitalize">{item.category}</p>
                                  <p className="text-xs text-gray-500">
                                    Paid: UGX {feePaid.toLocaleString()} / Total: UGX {feeTotal.toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Pay Amount</p>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.amount || ''}
                                      max={item.max || 0}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0
                                        const maxValue = item.max || 0
                                        if (value <= maxValue) {
                                          const newItems = [...paymentItems]
                                          newItems[index].amount = value
                                          setPaymentItems(newItems)
                                        }
                                      }}
                                      className="w-32 border rounded-lg px-3 py-2 text-right font-semibold"
                                      min="0"
                                      step="1000"
                                    />
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    <p>Max</p>
                                    <p className="font-medium">{(item.max || 0).toLocaleString()}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...paymentItems]
                                      newItems[index].amount = item.max || 0
                                      setPaymentItems(newItems)
                                    }}
                                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                  >
                                    Full
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = paymentItems.map(item => ({ ...item, amount: item.max || 0 }))
                            setPaymentItems(newItems)
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Pay All Outstanding
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = paymentItems.map(item => ({ ...item, amount: 0 }))
                            setPaymentItems(newItems)
                          }}
                          className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No fee breakdown available for this student.</p>
                      <p className="text-xs text-gray-400 mt-1">Please add fee breakdown first.</p>
                    </div>
                  )}
                  
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Total Payment Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        UGX {paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method *</label>
                    <select name="payment_method" required className="w-full border rounded-lg px-3 py-2">
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Mobile Money</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Receipt No</label>
                    <input type="text" name="receipt_no" placeholder="Optional" className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea name="notes" rows={2} placeholder="Optional payment notes..." className="w-full border rounded-lg px-3 py-2" />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={paymentItems.length === 0 || paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0) === 0}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Record Payment
                  </button>
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedFee(null); setPaymentItems([]) }} className="flex-1 bg-gray-300 py-3 rounded-lg hover:bg-gray-400 font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedFeeDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Fee Details</h3>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">
                  {selectedFeeDetails.student?.first_name}
                  {selectedFeeDetails.student?.middle_name && ` ${selectedFeeDetails.student.middle_name}`}
                  {` ${selectedFeeDetails.student?.last_name}`}
                </p>
                <p className="text-sm text-gray-600">{selectedFeeDetails.student?.admission_no}</p>
                <p className="text-sm text-gray-600">{term} {year}</p>
              </div>

              <div className="space-y-4">
                {/* Fee Breakdown */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Fee Breakdown</h4>
                  {selectedFeeDetails.fee_breakdown && Object.keys(selectedFeeDetails.fee_breakdown).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedFeeDetails.fee_breakdown).map(([category, amount]: [string, any]) => (
                        <div key={category} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <span className="text-gray-700 capitalize">{category}</span>
                          <span className="font-semibold">UGX {amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 font-bold text-lg">
                        <span>Total Fees</span>
                        <span className="text-blue-600">UGX {selectedFeeDetails.total_fees?.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No breakdown available</p>
                  )}
                </div>

                {/* Payment Breakdown */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Payments Made</h4>
                  {selectedFeeDetails.paid_breakdown && Object.keys(selectedFeeDetails.paid_breakdown).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedFeeDetails.paid_breakdown).map(([category, amount]: [string, any]) => (
                        <div key={category} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <span className="text-gray-700 capitalize">{category}</span>
                          <span className="font-semibold text-green-600">UGX {amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 font-bold text-lg">
                        <span>Total Paid</span>
                        <span className="text-green-600">UGX {selectedFeeDetails.amount_paid?.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No payments yet</p>
                  )}
                </div>

                {/* Outstanding by Category */}
                {selectedFeeDetails.fee_breakdown && Object.keys(selectedFeeDetails.fee_breakdown).length > 0 && (
                  <div className="border rounded-lg p-4 bg-red-50">
                    <h4 className="font-semibold mb-3">Outstanding by Category</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedFeeDetails.fee_breakdown).map(([category, total]: [string, any]) => {
                        const paid = selectedFeeDetails.paid_breakdown?.[category] || 0
                        const outstanding = total - paid
                        return (
                          <div key={category} className="flex justify-between items-center py-2 border-b last:border-b-0">
                            <span className="text-gray-700 capitalize">{category}</span>
                            <div className="text-right">
                              <span className="font-semibold text-red-600">UGX {outstanding.toLocaleString()}</span>
                              <span className="text-xs text-gray-500 block">of {total.toLocaleString()}</span>
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex justify-between items-center pt-2 font-bold text-lg">
                        <span>Total Outstanding</span>
                        <span className="text-red-600">UGX {selectedFeeDetails.outstanding?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {selectedFeeDetails.payments && selectedFeeDetails.payments.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Payment History</h4>
                    <div className="space-y-3">
                      {selectedFeeDetails.payments.map((payment: any) => (
                        <div key={payment.id} className="p-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">UGX {payment.amount?.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{new Date(payment.payment_date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{payment.payment_method}</span>
                              <button
                                onClick={() => {
                                  setReceiptData({
                                    payment: payment,
                                    studentFees: { ...selectedFeeDetails, student: selectedFeeDetails.student }
                                  })
                                  setShowReceipt(true)
                                }}
                                className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                              >
                                View Receipt
                              </button>
                            </div>
                          </div>
                          {payment.payment_breakdown && Object.keys(payment.payment_breakdown).length > 0 && (
                            <div className="text-xs space-y-1 mt-2 pt-2 border-t">
                              {Object.entries(payment.payment_breakdown).map(([cat, amt]: [string, any]) => (
                                <div key={cat} className="flex justify-between">
                                  <span className="text-gray-600 capitalize">{cat}:</span>
                                  <span className="font-medium">UGX {amt.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {payment.receipt_no && (
                            <p className="text-xs text-gray-500 mt-2">Receipt: {payment.receipt_no}</p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { 
                    setSelectedFee(selectedFeeDetails)
                    // Auto-load payment items with fee breakdown
                    if (selectedFeeDetails.fee_breakdown) {
                      const items = Object.entries(selectedFeeDetails.fee_breakdown).map(([category, total]: [string, any]) => {
                        const paid = selectedFeeDetails.paid_breakdown?.[category] || 0
                        const outstanding = total - paid
                        return { category, amount: 0, max: outstanding }
                      })
                      setPaymentItems(items)
                    } else {
                      setPaymentItems([])
                    }
                    setShowDetailsModal(false)
                    setShowPaymentModal(true)
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Make Payment
                </button>
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedFeeDetails(null) }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Receipt */}
      {showReceipt && receiptData && (
        <PaymentReceipt
          payment={receiptData.payment}
          studentFees={receiptData.studentFees}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </DashboardLayout>
  )
}
