'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import ImageWithFallback from '@/components/ui/ImageWithFallback'

interface RequisitionReceiptProps {
  requisition: {
    id: string
    requisition_no: string
    title: string
    description: string
    department: string
    category: string
    total_amount: number
    completed_date: string
    requester?: {
      full_name: string
      email: string
    }
    items?: Array<{
      item_name: string
      quantity: number
      unit: string
      unit_price: number
      total_price: number
      specifications?: string
    }>
  }
  onClose: () => void
}

export default function RequisitionReceipt({ requisition, onClose }: RequisitionReceiptProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Print Controls */}
        <div className="p-4 border-b flex justify-between items-center no-print">
          <h3 className="text-lg font-bold text-gray-800">Requisition Payment Receipt</h3>
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
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>REQUISITION PAYMENT RECEIPT</h2>
            </div>
          </div>

          {/* Receipt Info Bar */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '12px', marginBottom: '16px', textAlign: 'center', border: '2px solid #000' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Requisition No:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{requisition.requisition_no}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Payment Date:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(requisition.completed_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Department:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{requisition.department}</span>
              </div>
            </div>
          </div>

          {/* Requisition Details */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#fff', backgroundColor: '#000', marginBottom: '0', padding: '8px', fontSize: '14px', border: '2px solid #000', borderBottom: 'none' }}>REQUISITION DETAILS</h3>
            <table style={{ width: '100%', border: '2px solid #000', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000', width: '25%' }}>Title:</td>
                  <td style={{ padding: '8px', border: '1px solid #000', width: '25%' }}>{requisition.title}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000', width: '25%' }}>Category:</td>
                  <td style={{ padding: '8px', border: '1px solid #000', width: '25%' }}>{requisition.category}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Requested By:</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>{requisition.requester?.full_name || 'N/A'}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Email:</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>{requisition.requester?.email || 'N/A'}</td>
                </tr>
                {requisition.description && (
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #000' }}>Description:</td>
                    <td colSpan={3} style={{ padding: '8px', border: '1px solid #000' }}>{requisition.description}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          {requisition.items && requisition.items.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', color: '#fff', backgroundColor: '#000', marginBottom: '0', padding: '8px', fontSize: '14px', border: '2px solid #000', borderBottom: 'none' }}>ITEMS PURCHASED</h3>
              <table style={{ width: '100%', fontSize: '13px', border: '2px solid #000', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #000' }}>#</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #000' }}>Item Name</th>
                    <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000' }}>Unit</th>
                    <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>Unit Price</th>
                    <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {requisition.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '8px', border: '1px solid #000' }}>{index + 1}</td>
                      <td style={{ padding: '8px', border: '1px solid #000' }}>
                        {item.item_name}
                        {item.specifications && (
                          <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>{item.specifications}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000' }}>{item.unit}</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>UGX {item.unit_price.toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>UGX {item.total_price.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#e5e5e5', borderTop: '2px solid #000' }}>
                    <td colSpan={5} style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px', textAlign: 'right' }}>TOTAL AMOUNT PAID</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #000', fontSize: '15px', textAlign: 'right' }}>UGX {requisition.total_amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Amount in Words */}
          <div style={{ marginBottom: '16px', padding: '12px', border: '2px solid #000', backgroundColor: '#f9fafb' }}>
            <p style={{ fontSize: '13px', margin: 0 }}>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Amount Paid (In Words):</span>
              <span style={{ textTransform: 'uppercase', fontWeight: '600', fontSize: '14px' }}>{numberToWords(requisition.total_amount)} Shillings Only</span>
            </p>
          </div>

          {/* Signature Section */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <div style={{ borderTop: '2px solid #000', marginTop: '40px', paddingTop: '6px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', margin: 0 }}>RECEIVED BY</p>
                  <p style={{ fontSize: '12px', textAlign: 'center', color: '#666', marginTop: '4px' }}>Name &amp; Signature</p>
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
              This is an official payment receipt. Please retain for your records.
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
