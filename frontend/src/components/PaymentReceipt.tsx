'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import ImageWithFallback from '@/components/ui/ImageWithFallback'

interface PaymentReceiptProps {
  payment: {
    id?: string
    amount: number
    payment_date: string
    payment_method: string
    receipt_no: string
    notes?: string
    payment_breakdown?: {[key: string]: number}
  }
  studentFees: {
    student: {
      first_name: string
      middle_name?: string
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
    fee_breakdown?: {[key: string]: number}
    paid_breakdown?: {[key: string]: number}
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
      const response = await api.get('/api/v1/school')
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
        <div className="receipt-content p-8" style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', fontSize: '14px' }}>
          {/* Header */}
          <div className="text-center pb-4 mb-6" style={{ borderBottom: '3px solid #000' }}>
            {school?.logo_url && (
              <div className="flex justify-center mb-3">
                <ImageWithFallback 
                  src={school.logo_url} 
                  alt="School Logo" 
                  className="h-20 w-20 object-contain"
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M22 10v6M2 10l10-5 10 5-10 5z'/%3E%3Cpath d='M6 12v5c3 3 9 3 12 0v-5'/%3E%3C/svg%3E"
                />
              </div>
            )}
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000', marginBottom: '4px' }}>{school?.name || 'School Name'}</h1>
            <p style={{ fontSize: '13px', color: '#333', fontStyle: 'italic', marginBottom: '4px' }}>&quot;{school?.motto || 'School Motto'}&quot;</p>
            <p style={{ fontSize: '13px', color: '#333', marginBottom: '2px' }}>{school?.address}</p>
            <p style={{ fontSize: '13px', color: '#333', marginBottom: '8px' }}>Tel: {school?.phone} | Email: {school?.contact_email}</p>
            <div style={{ marginTop: '12px', backgroundColor: '#000', color: '#fff', padding: '8px 16px', display: 'inline-block', border: '2px solid #000' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>FEES PAYMENT RECEIPT</h2>
            </div>
          </div>

          {/* Receipt Info Bar */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '12px', marginBottom: '16px', textAlign: 'center', border: '2px solid #000' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Receipt No:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{payment.receipt_no || `RCP-${Date.now().toString().slice(-6)}`}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Date:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Payment Method:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{payment.payment_method}</span>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#fff', backgroundColor: '#000', marginBottom: '0', padding: '8px', fontSize: '14px', border: '2px solid #000', borderBottom: 'none' }}>STUDENT INFORMATION</h3>
            <table style={{ width: '100%', border: '2px solid #000', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000', width: '25%' }}>Student Name:</td>
                  <td style={{ padding: '8px', border: '1px solid #000', width: '25%' }}>{studentFees.student.first_name}{studentFees.student.middle_name && ` ${studentFees.student.middle_name}`} {studentFees.student.last_name}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000', width: '25%' }}>Admission No:</td>
                  <td style={{ padding: '8px', border: '1px solid #000', width: '25%' }}>{studentFees.student.admission_no}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Class:</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>{studentFees.student.class_name || 'N/A'}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>LIN:</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>{studentFees.student.lin || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Academic Period:</td>
                  <td colSpan={3} style={{ padding: '8px', border: '1px solid #000' }}>{studentFees.term} {studentFees.year}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Details */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#fff', backgroundColor: '#000', marginBottom: '0', padding: '8px', fontSize: '14px', border: '2px solid #000', borderBottom: 'none' }}>PAYMENT BREAKDOWN</h3>
            <table style={{ width: '100%', fontSize: '13px', border: '2px solid #000', borderCollapse: 'collapse' }}>
              <tbody>
                {studentFees.fee_breakdown && Object.keys(studentFees.fee_breakdown).length > 0 ? (
                  <>
                    {/* Itemized Breakdown */}
                    {Object.entries(studentFees.fee_breakdown).map(([category, total]: [string, any]) => {
                      const previousPaid = (studentFees.paid_breakdown?.[category] || 0) - (payment.payment_breakdown?.[category] || 0)
                      const currentPayment = payment.payment_breakdown?.[category] || 0
                      const totalPaid = studentFees.paid_breakdown?.[category] || 0
                      const outstanding = total - totalPaid
                      
                      return (
                        <tr key={category} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ padding: '10px', border: '1px solid #000' }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{category}</div>
                            <div style={{ fontSize: '12px', color: '#000', marginLeft: '8px' }}>
                              Total: UGX {total.toLocaleString()} | 
                              Prev Paid: UGX {previousPaid.toLocaleString()} | 
                              <span style={{ fontWeight: '600' }}>Now: UGX {currentPayment.toLocaleString()}</span> | 
                              <span style={{ fontWeight: '600' }}>Balance: UGX {outstanding.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f5f5f5' }}>
                      <td style={{ padding: '10px', border: '1px solid #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                          <span>TOTAL FEES</span>
                          <span>UGX {studentFees.total_fees.toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#e5e5e5' }}>
                      <td style={{ padding: '10px', border: '1px solid #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px' }}>
                          <span>CURRENT PAYMENT</span>
                          <span>UGX {payment.amount.toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <td style={{ padding: '10px', border: '1px solid #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '14px' }}>
                          <span>Total Paid to Date</span>
                          <span>UGX {studentFees.amount_paid.toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <td style={{ padding: '10px', border: '1px solid #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px' }}>
                          <span>OUTSTANDING BALANCE</span>
                          <span>UGX {studentFees.outstanding.toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    {/* Simple Breakdown */}
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '10px', fontWeight: '600', border: '1px solid #000' }}>Total School Fees</td>
                      <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #000' }}>UGX {studentFees.total_fees.toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '10px', fontWeight: '600', border: '1px solid #000' }}>Previous Payments</td>
                      <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #000' }}>UGX {(studentFees.amount_paid - payment.amount).toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#e5e5e5' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px' }}>CURRENT PAYMENT</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px' }}>UGX {payment.amount.toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#f5f5f5' }}>
                      <td style={{ padding: '10px', fontWeight: '600', border: '1px solid #000' }}>Total Paid to Date</td>
                      <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #000' }}>UGX {studentFees.amount_paid.toLocaleString()}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px' }}>OUTSTANDING BALANCE</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px' }}>UGX {studentFees.outstanding.toLocaleString()}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div style={{ marginBottom: '16px', padding: '12px', border: '2px solid #000', backgroundColor: '#f9fafb' }}>
            <p style={{ fontSize: '13px', margin: 0 }}>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Amount Paid (In Words):</span>
              <span style={{ textTransform: 'uppercase', fontWeight: '600', fontSize: '14px' }}>{numberToWords(payment.amount)} Shillings Only</span>
            </p>
          </div>

          {/* Payment Notes */}
          {payment.notes && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', color: '#000', marginBottom: '6px', fontSize: '13px' }}>REMARKS:</h3>
              <p style={{ fontSize: '13px', color: '#333', border: '2px solid #000', padding: '10px', backgroundColor: '#f9fafb' }}>{payment.notes}</p>
            </div>
          )}

          {/* Signature Section */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block' }}>
                <div style={{ borderTop: '2px solid #000', width: '200px', marginTop: '40px', paddingTop: '6px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', margin: 0 }}>BURSAR SIGNATURE & STAMP</p>
                  <p style={{ fontSize: '12px', textAlign: 'center', color: '#666', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '12px', borderTop: '2px solid #000' }}>
            <p style={{ fontSize: '12px', color: '#333', fontWeight: '600', margin: 0 }}>
              This is an official receipt. Please retain for your records.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { 
            margin: 0.5in; 
            size: A4 portrait; 
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          body * { 
            visibility: hidden !important; 
          }
          .receipt-content, 
          .receipt-content * { 
            visibility: visible !important; 
          }
          .receipt-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
          }
          .no-print { 
            display: none !important; 
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
