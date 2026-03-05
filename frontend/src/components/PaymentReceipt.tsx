'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'

interface PaymentReceiptProps {
  payment: {
    id?: string
    amount: number
    payment_date: string
    payment_method: string
    receipt_no: string
    notes?: string
  }
  studentFees: {
    student: {
      first_name: string
      last_name: string
      admission_no: string
      lin?: string
      class_name?: string
    }
    term: string
    year: number
    total_fees: number
    amount_paid: number
    outstanding: number
  }
  onClose: () => void
}

export default function PaymentReceipt({ payment, studentFees, onClose }: PaymentReceiptProps) {
  const [school, setSchool] = useState<any>(null)

  useEffect(() => {
    loadSchool()
  }, [])

  const loadSchool = async () => {
    try {
      const response = await api.get('/school')
      setSchool(response.data)
    } catch (error) {
      console.error('Failed to load school:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Print Controls */}
        <div className="p-4 border-b flex justify-between items-center no-print">
          <h3 className="text-lg font-bold text-gray-800">Payment Receipt</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="receipt-content p-8" style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.4' }}>
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            {school?.logo_url && (
              <div className="flex justify-center mb-2">
                <img 
                  src={school.logo_url.startsWith('http') ? school.logo_url : `http://localhost:8080${school.logo_url}`} 
                  alt="School Logo" 
                  className="h-12 w-12 object-contain" 
                />
              </div>
            )}
            <h1 className="text-lg font-bold uppercase text-black mb-1">{school?.name || 'School Name'}</h1>
            <p className="text-xs text-gray-700 italic mb-1">&quot;{school?.motto || 'School Motto'}&quot;</p>
            <p className="text-xs text-gray-700">{school?.address}</p>
            <p className="text-xs text-gray-700">Tel: {school?.phone} | Email: {school?.contact_email}</p>
            <div className="mt-3 bg-black text-white py-1 px-3 inline-block">
              <h2 className="text-sm font-bold">FEES PAYMENT RECEIPT</h2>
            </div>
          </div>

          {/* Receipt Info Bar */}
          <div className="bg-gray-100 p-3 mb-4 text-center">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="font-bold">Receipt No:</span><br/>
                <span className="text-lg font-bold">{payment.receipt_no || `RCP-${Date.now().toString().slice(-6)}`}</span>
              </div>
              <div>
                <span className="font-bold">Date:</span><br/>
                <span>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div>
                <span className="font-bold">Payment Method:</span><br/>
                <span>{payment.payment_method}</span>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="mb-4">
            <h3 className="font-bold text-black mb-2 bg-gray-200 p-2 text-sm">STUDENT INFORMATION</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><span className="font-medium">Student Name:</span> {studentFees.student.first_name} {studentFees.student.last_name}</p>
                <p><span className="font-medium">Admission Number:</span> {studentFees.student.admission_no}</p>
              </div>
              <div>
                <p><span className="font-medium">Class:</span> {studentFees.student.class_name || 'N/A'}</p>
                <p><span className="font-medium">LIN:</span> {studentFees.student.lin || 'N/A'}</p>
                <p><span className="font-medium">Academic Period:</span> {studentFees.term} {studentFees.year}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-4">
            <h3 className="font-bold text-black mb-2 bg-gray-200 p-2 text-sm">PAYMENT BREAKDOWN</h3>
            <table className="w-full text-xs border border-gray-300">
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Total School Fees</td>
                  <td className="p-2 text-right">UGX {studentFees.total_fees.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Previous Payments</td>
                  <td className="p-2 text-right">UGX {(studentFees.amount_paid - payment.amount).toLocaleString()}</td>
                </tr>
                <tr className="border-b bg-green-50">
                  <td className="p-2 font-bold text-green-700">Current Payment</td>
                  <td className="p-2 text-right font-bold text-green-700">UGX {payment.amount.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Total Paid</td>
                  <td className="p-2 text-right">UGX {studentFees.amount_paid.toLocaleString()}</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="p-2 font-bold text-red-700">Outstanding Balance</td>
                  <td className="p-2 text-right font-bold text-red-700">UGX {studentFees.outstanding.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="mb-4 p-2 border border-gray-400">
            <p className="text-xs">
              <span className="font-bold">Amount Paid (In Words):</span><br/>
              <span className="uppercase">{numberToWords(payment.amount)} Shillings Only</span>
            </p>
          </div>

          {/* Payment Notes */}
          {payment.notes && (
            <div className="mb-4">
              <h3 className="font-bold text-black mb-1 text-xs">REMARKS:</h3>
              <p className="text-xs text-gray-700 border p-2">{payment.notes}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-6">
            <div className="text-right">
              <div className="inline-block">
                <div className="border-t border-black w-48 mt-8 pt-1">
                  <p className="font-bold text-xs text-center">BURSAR SIGNATURE & STAMP</p>
                  <p className="text-xs text-center text-gray-600">Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-3 border-t border-gray-400">
            <p className="text-xs text-gray-600 font-medium">
              This is an official receipt. Please retain for your records.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Generated: {new Date().toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page { 
            margin: 0.5in; 
            size: A4 portrait; 
          }
          .no-print { 
            display: none !important; 
          }
          .receipt-content {
            padding: 0 !important;
            font-size: 12px !important;
          }
          body * { 
            visibility: hidden; 
          }
          .receipt-content, .receipt-content * { 
            visibility: visible; 
          }
          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-size: 11px !important;
          }
          table {
            border-collapse: collapse !important;
          }
        }
      `}</style>
    </div>
  )
}

// Helper function to convert numbers to words (simplified)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const thousands = ['', 'Thousand', 'Million', 'Billion']

  if (num === 0) return 'Zero'

  function convertHundreds(n: number): string {
    let result = ''
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' '
      n %= 10
    } else if (n >= 10) {
      result += teens[n - 10] + ' '
      return result
    }
    
    if (n > 0) {
      result += ones[n] + ' '
    }
    
    return result
  }

  let result = ''
  let thousandIndex = 0
  
  while (num > 0) {
    if (num % 1000 !== 0) {
      result = convertHundreds(num % 1000) + thousands[thousandIndex] + ' ' + result
    }
    num = Math.floor(num / 1000)
    thousandIndex++
  }
  
  return result.trim()
}
