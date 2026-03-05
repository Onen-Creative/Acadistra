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
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

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
      const response = await api.get('/school/levels')
      setLevels(response.data.levels || [])
    } catch (error) {
      toast.error('Failed to load levels')
    }
  }

  const loadClasses = async () => {
    try {
      const response = await api.get('/classes', { params: { year } })
      const filtered = (Array.isArray(response.data) ? response.data : []).filter((c: any) => c.level === selectedLevel)
      setClasses(filtered)
    } catch (error) {
      toast.error('Failed to load classes')
    }
  }

  const loadStudents = async () => {
    try {
      const response = await api.get('/students', { params: { class_id: selectedClass, limit: 1000 } })
      setStudents(response.data.students || [])
    } catch (error) {
      toast.error('Failed to load students')
    }
  }

  const loadFees = async () => {
    setLoading(true)
    try {
      const response = await api.get('/fees', { params: { level: selectedLevel, term, year } })
      setFees(Array.isArray(response.data) ? response.data : response.data?.fees || [])
    } catch (error) {
      toast.error('Failed to load fees')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFees = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await api.post('/fees', {
        student_id: formData.get('student_id'),
        term,
        year,
        total_fees: parseFloat(formData.get('total_fees') as string)
      })
      toast.success('Fees record created')
      setShowAddModal(false)
      loadFees()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create fees')
    }
  }

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      const response = await api.post('/fees/payment', {
        student_fees_id: selectedFee.id,
        amount: parseFloat(formData.get('amount') as string),
        payment_method: formData.get('payment_method'),
        receipt_no: formData.get('receipt_no'),
        notes: formData.get('notes')
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
      loadFees()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record payment')
    }
  }

  const exportToExcel = () => {
    const data = fees.map((f: any, i: number) => ({
      '#': i + 1,
      'Student': `${f.student?.first_name}${f.student?.middle_name ? ` ${f.student.middle_name}` : ''} ${f.student?.last_name}`,
      'Admission No': f.student?.admission_no,
      'Total Fees': f.total_fees,
      'Paid': f.amount_paid,
      'Outstanding': f.outstanding
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Fees')
    XLSX.writeFile(wb, `fees_${term}_${year}.xlsx`)
  }

  const totals = {
    expected: fees.reduce((sum, f) => sum + (f.total_fees || 0), 0),
    paid: fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0),
    outstanding: fees.reduce((sum, f) => sum + (f.outstanding || 0), 0)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fees Management</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(true)} disabled={!selectedClass} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Add</button>
              <button onClick={exportToExcel} disabled={!fees.length} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Export</button>
            </div>
          </div>
        </div>

        {/* Totals */}
        {selectedClass && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600">Expected</p>
              <p className="text-2xl font-bold text-blue-700">UGX {totals.expected.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Collected</p>
              <p className="text-2xl font-bold text-green-700">UGX {totals.paid.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">Outstanding</p>
              <p className="text-2xl font-bold text-red-700">UGX {totals.outstanding.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : selectedClass && fees.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fees.map((fee: any) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">
                        {fee.student?.first_name}
                        {fee.student?.middle_name && ` ${fee.student.middle_name}`}
                        {` ${fee.student?.last_name}`}
                      </p>
                      <p className="text-xs text-gray-500">{fee.student?.admission_no}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">UGX {fee.total_fees?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-600">UGX {fee.amount_paid?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">UGX {fee.outstanding?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setSelectedFee(fee); setShowPaymentModal(true) }} className="bg-green-500 text-white px-3 py-1 rounded text-xs">Pay</button>
                        <button onClick={() => { setReceiptData({ studentFees: fee, payment: { amount: fee.amount_paid, payment_date: new Date().toISOString(), payment_method: 'Various', receipt_no: `RCP-${fee.id.slice(-6)}` } }); setShowReceipt(true) }} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">Receipt</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                  <label className="block text-sm font-medium mb-2">Total Fees (UGX)</label>
                  <input type="number" name="total_fees" required min="0" step="1000" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Create</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedFee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Record Payment</h3>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">
                  {selectedFee.student?.first_name}
                  {selectedFee.student?.middle_name && ` ${selectedFee.student.middle_name}`}
                  {` ${selectedFee.student?.last_name}`}
                </p>
                <p className="text-sm text-gray-600">Outstanding: UGX {selectedFee.outstanding?.toLocaleString()}</p>
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount (UGX)</label>
                  <input type="number" name="amount" required min="1" max={selectedFee.outstanding} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select name="payment_method" className="w-full border rounded-lg px-3 py-2">
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Mobile Money</option>
                    <option>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Receipt No</label>
                  <input type="text" name="receipt_no" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea name="notes" rows={2} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg">Record</button>
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedFee(null) }} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
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
