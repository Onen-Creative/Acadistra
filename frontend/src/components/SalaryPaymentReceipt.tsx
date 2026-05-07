'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import ImageWithFallback from '@/components/ui/ImageWithFallback'

interface SalaryPaymentReceiptProps {
  payment: {
    id: number
    employee_name: string
    employee_role: string
    employee_id: string
    base_salary: number
    total_allowances: number
    gross_salary: number
    total_deductions: number
    net_salary: number
    payment_status: string
    payment_date: string
    payment_method: string
    payment_ref: string
    payroll_run: {
      month: number
      year: number
    }
  }
  salaryStructure?: {
    housing_allowance: number
    transport_allowance: number
    medical_allowance: number
    lunch_allowance: number
    overtime_allowance: number
    performance_bonus: number
    other_allowances: number
    nssf_deduction: number
    paye_deduction: number
    loan_deduction: number
    insurance_deduction: number
    union_deduction: number
    other_deductions: number
  }
  onClose: () => void
}

export default function SalaryPaymentReceipt({ payment, salaryStructure, onClose }: SalaryPaymentReceiptProps) {
  const [school, setSchool] = useState<any>(null)

  useEffect(() => { loadSchool() }, [])

  const loadSchool = async () => {
    try {
      const response = await api.get('/api/v1/school')
      setSchool(response.data)
    } catch (error) {
      console.error('Failed to load school:', error)
    }
  }

  const monthName = new Date(2000, payment.payroll_run.month - 1).toLocaleString('default', { month: 'long' })
  const receiptNo = `SAL-${payment.payroll_run.year}${String(payment.payroll_run.month).padStart(2, '0')}-${String(payment.id).padStart(4, '0')}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Print Controls */}
        <div className="p-4 border-b flex justify-between items-center no-print">
          <h3 className="text-lg font-bold text-gray-800">Salary Payment Receipt</h3>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
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
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>SALARY PAYMENT RECEIPT</h2>
            </div>
          </div>

          {/* Receipt Info Bar */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '12px', marginBottom: '16px', textAlign: 'center', border: '2px solid #000' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Receipt No:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{receiptNo}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Payment Date:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Period:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{monthName} {payment.payroll_run.year}</span>
              </div>
            </div>
          </div>

          {/* Employee Information */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#fff', backgroundColor: '#000', marginBottom: '0', padding: '8px', fontSize: '14px', border: '2px solid #000', borderBottom: 'none' }}>EMPLOYEE INFORMATION</h3>
            <table style={{ width: '100%', border: '2px solid #000', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000', width: '25%' }}>Employee Name:</td>
                  <td style={{ padding: '8px', border: '1px solid #000', width: '25%' }}>{payment.employee_name}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000', width: '25%' }}>Employee ID:</td>
                  <td style={{ padding: '8px', border: '1px solid #000', width: '25%' }}>{payment.employee_id}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Role/Position:</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>{payment.employee_role}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Payment Method:</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>{payment.payment_method}</td>
                </tr>
                {payment.payment_ref && (
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Payment Reference:</td>
                    <td colSpan={3} style={{ padding: '8px', border: '1px solid #000' }}>{payment.payment_ref}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Salary Breakdown */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#fff', backgroundColor: '#000', marginBottom: '0', padding: '8px', fontSize: '14px', border: '2px solid #000', borderBottom: 'none' }}>SALARY BREAKDOWN</h3>
            <table style={{ width: '100%', fontSize: '13px', border: '2px solid #000', borderCollapse: 'collapse' }}>
              <tbody>
                {/* Base Salary */}
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ padding: '10px', fontWeight: '600', border: '1px solid #000' }}>Base Salary</td>
                  <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #000' }}>UGX {payment.base_salary.toLocaleString()}</td>
                </tr>

                {/* Allowances */}
                {salaryStructure && (
                  <>
                    {salaryStructure.housing_allowance > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Housing Allowance</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.housing_allowance.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.transport_allowance > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Transport Allowance</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.transport_allowance.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.medical_allowance > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Medical Allowance</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.medical_allowance.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.lunch_allowance > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Lunch Allowance</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.lunch_allowance.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.overtime_allowance > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Overtime Allowance</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.overtime_allowance.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.performance_bonus > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Performance Bonus</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.performance_bonus.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.other_allowances > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px' }}>Other Allowances</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px' }}>UGX {salaryStructure.other_allowances.toLocaleString()}</td>
                      </tr>
                    )}
                  </>
                )}

                <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#f5f5f5' }}>
                  <td style={{ padding: '10px', fontWeight: '600', border: '1px solid #000' }}>Total Allowances</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', border: '1px solid #000' }}>UGX {payment.total_allowances.toLocaleString()}</td>
                </tr>

                <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#e5e5e5' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px' }}>GROSS SALARY</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px' }}>UGX {payment.gross_salary.toLocaleString()}</td>
                </tr>

                {/* Deductions */}
                {salaryStructure && (
                  <>
                    {salaryStructure.nssf_deduction > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>NSSF Deduction</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>- UGX {salaryStructure.nssf_deduction.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.paye_deduction > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>PAYE Deduction</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>- UGX {salaryStructure.paye_deduction.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.loan_deduction > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>Loan Deduction</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>- UGX {salaryStructure.loan_deduction.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.insurance_deduction > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>Insurance Deduction</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>- UGX {salaryStructure.insurance_deduction.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.union_deduction > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>Union Deduction</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>- UGX {salaryStructure.union_deduction.toLocaleString()}</td>
                      </tr>
                    )}
                    {salaryStructure.other_deductions > 0 && (
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', paddingLeft: '20px', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>Other Deductions</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000', fontSize: '12px', color: '#dc2626' }}>- UGX {salaryStructure.other_deductions.toLocaleString()}</td>
                      </tr>
                    )}
                  </>
                )}

                <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#f5f5f5' }}>
                  <td style={{ padding: '10px', fontWeight: '600', border: '1px solid #000', color: '#dc2626' }}>Total Deductions</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', border: '1px solid #000', color: '#dc2626' }}>- UGX {payment.total_deductions.toLocaleString()}</td>
                </tr>

                <tr style={{ backgroundColor: '#e5e5e5', borderTop: '2px solid #000' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', border: '1px solid #000', fontSize: '16px' }}>NET SALARY PAID</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #000', fontSize: '16px', color: '#16a34a' }}>UGX {payment.net_salary.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div style={{ marginBottom: '16px', padding: '12px', border: '2px solid #000', backgroundColor: '#f9fafb' }}>
            <p style={{ fontSize: '13px', margin: 0 }}>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Amount Paid (In Words):</span>
              <span style={{ textTransform: 'uppercase', fontWeight: '600', fontSize: '14px' }}>{numberToWords(payment.net_salary)} Shillings Only</span>
            </p>
          </div>

          {/* Signature Section */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <div style={{ borderTop: '2px solid #000', marginTop: '40px', paddingTop: '6px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', margin: 0 }}>EMPLOYEE SIGNATURE</p>
                  <p style={{ fontSize: '12px', textAlign: 'center', color: '#666', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              <div>
                <div style={{ borderTop: '2px solid #000', marginTop: '40px', paddingTop: '6px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', margin: 0 }}>BURSAR SIGNATURE &amp; STAMP</p>
                  <p style={{ fontSize: '12px', textAlign: 'center', color: '#666', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '12px', borderTop: '2px solid #000' }}>
            <p style={{ fontSize: '12px', color: '#333', fontWeight: '600', margin: 0 }}>
              This is an official salary payment receipt. Please retain for your records.
            </p>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
              Generated: {new Date().toLocaleString('en-GB')}
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
            padding: 0 !important;
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

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const thousands = ['', 'Thousand', 'Million', 'Billion']

  if (num === 0) return 'Zero'

  function convertHundreds(n: number): string {
    let result = ''
    if (n >= 100) { result += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100 }
    if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10 }
    else if (n >= 10) { return result + teens[n - 10] + ' ' }
    if (n > 0) result += ones[n] + ' '
    return result
  }

  let result = ''
  let thousandIndex = 0
  while (num > 0) {
    if (num % 1000 !== 0) result = convertHundreds(num % 1000) + thousands[thousandIndex] + ' ' + result
    num = Math.floor(num / 1000)
    thousandIndex++
  }
  return result.trim()
}
