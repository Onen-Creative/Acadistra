import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { feesApi } from '@/services/api';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import * as XLSX from 'xlsx';

export default function FeesReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly'>('termly');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['fees-reports', reportType, term, year],
    queryFn: () => feesApi.getReports({ type: reportType, term, year: year.toString() }),
    enabled: false,
  });

  const handleGenerateReport = () => {
    refetch();
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Student Fees
    const feesData = reportData.fees.map((fee: any) => ({
      'Student Name': `${fee.Student?.first_name} ${fee.Student?.last_name}`,
      'Admission No': fee.Student?.admission_no,
      'Term': fee.term,
      'Year': fee.year,
      'Total Fees': fee.total_fees,
      'Amount Paid': fee.amount_paid,
      'Outstanding': fee.outstanding,
      'Status': fee.outstanding > 0 ? 'Pending' : 'Paid',
    }));
    const ws1 = XLSX.utils.json_to_sheet(feesData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Student Fees');

    // Sheet 2: Payments
    const paymentsData = reportData.payments.map((payment: any) => {
      // Find the corresponding fee record to get student and class info
      const feeRecord = reportData.fees.find((f: any) => f.id === payment.student_fees_id);
      return {
        'Payment Date': new Date(payment.payment_date).toLocaleDateString(),
        'Student Name': feeRecord?.Student ? `${feeRecord.Student.first_name} ${feeRecord.Student.last_name}` : 'N/A',
        'Admission No': feeRecord?.Student?.admission_no || 'N/A',
        'Term': feeRecord?.term || 'N/A',
        'Year': feeRecord?.year || 'N/A',
        'Amount': payment.amount,
        'Payment Method': payment.payment_method || 'Cash',
        'Receipt No': payment.receipt_no || 'N/A',
        'Notes': payment.notes || '',
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Payments');

    // Sheet 3: Fees by Class
    const classSummary = reportData.fees_by_class.map((item: any) => ({
      'Class': item.class,
      'Total Students': item.total_students,
      'Total Fees': item.total_fees,
      'Total Paid': item.total_paid,
      'Total Outstanding': item.total_outstanding,
    }));
    const ws3 = XLSX.utils.json_to_sheet(classSummary);
    XLSX.utils.book_append_sheet(wb, ws3, 'Fees by Class');

    // Sheet 4: Payment Methods
    const methodSummary = reportData.payment_methods.map((item: any) => ({
      'Payment Method': item.method || 'Cash',
      'Transaction Count': item.count,
      'Total Amount': item.total,
    }));
    const ws4 = XLSX.utils.json_to_sheet(methodSummary);
    XLSX.utils.book_append_sheet(wb, ws4, 'Payment Methods');

    const filename = `Fees_Report_${reportType}_${year}_T${term}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const totalFees = reportData?.fees.reduce((sum: number, f: any) => sum + f.total_fees, 0) || 0;
  const totalPaid = reportData?.fees.reduce((sum: number, f: any) => sum + f.amount_paid, 0) || 0;
  const totalOutstanding = reportData?.fees.reduce((sum: number, f: any) => sum + f.outstanding, 0) || 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="bursar" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Fees Reports"
          subtitle="Generate and export comprehensive fees collection reports"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Report Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="daily">Daily Payments</option>
                  <option value="weekly">Weekly Payments</option>
                  <option value="monthly">Monthly Payments</option>
                  <option value="termly">Termly Report</option>
                  <option value="yearly">Yearly Report</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Term1">Term 1</option>
                  <option value="Term2">Term 2</option>
                  <option value="Term3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                {isLoading ? '⏳ Generating...' : '📊 Generate Report'}
              </button>

              {reportData && (
                <button
                  onClick={handleExportExcel}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg"
                >
                  📥 Export to Excel
                </button>
              )}
            </div>
          </div>

          {reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">👨‍🎓</div>
                  <div className="text-2xl font-bold">{reportData.fees.length}</div>
                  <div className="text-sm opacity-90">Total Students</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="text-2xl font-bold">UGX {totalFees.toLocaleString()}</div>
                  <div className="text-sm opacity-90">Total Fees</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-2xl font-bold">UGX {totalPaid.toLocaleString()}</div>
                  <div className="text-sm opacity-90">Total Paid</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">⏳</div>
                  <div className="text-2xl font-bold">UGX {totalOutstanding.toLocaleString()}</div>
                  <div className="text-sm opacity-90">Outstanding</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                    <h3 className="text-lg font-bold text-gray-900">🎓 Fees by Class</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Class</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Students</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(reportData.fees_by_class || []).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.class}</td>
                            <td className="px-4 py-3 text-sm text-center">{item.total_students}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                              UGX {item.total_outstanding?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b">
                    <h3 className="text-lg font-bold text-gray-900">💳 Payment Methods</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Method</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Count</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(reportData.payment_methods || []).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.method || 'Cash'}</td>
                            <td className="px-4 py-3 text-sm text-center">{item.count}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              UGX {item.total?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!reportData && !isLoading && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Generated</h3>
              <p className="text-gray-600">Select report type and click "Generate Report" to view data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
