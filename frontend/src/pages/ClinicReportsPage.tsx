import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clinicApi } from '@/services/api';
import { toast } from 'react-toastify';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import * as XLSX from 'xlsx';

export default function ClinicReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly'>('termly');
  const [term, setTerm] = useState('1');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['clinic-reports', reportType, term, year],
    queryFn: () => clinicApi.getReports({ type: reportType, term, year: year.toString() }),
    enabled: false,
    onSuccess: () => {
      toast.success('✅ Report generated successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to generate report: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleGenerateReport = () => {
    refetch();
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Clinic Visits
      const visitsData = reportData.visits.map((visit: any) => ({
        'Date': new Date(visit.visit_date).toLocaleDateString(),
        'Student': `${visit.student?.first_name || ''} ${visit.student?.last_name || ''}`,
        'Symptoms': visit.symptoms,
        'Diagnosis': visit.diagnosis || 'N/A',
        'Treatment': visit.treatment || 'N/A',
        'Outcome': visit.outcome,
        'Term': visit.term,
        'Year': visit.year,
      }));
      const ws1 = XLSX.utils.json_to_sheet(visitsData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Clinic Visits');

      // Sheet 2: Medicines Inventory
      const medicinesData = reportData.medicines.map((med: any) => ({
        'Medicine Name': med.name,
        'Category': med.category,
        'Quantity': med.quantity,
        'Unit': med.unit,
        'Minimum Stock': med.minimum_stock,
        'Status': med.quantity < med.minimum_stock ? 'Low Stock' : 'In Stock',
        'Expiry Date': med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A',
      }));
      const ws2 = XLSX.utils.json_to_sheet(medicinesData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Medicines');

      // Sheet 3: Consumables Inventory
      const consumablesData = reportData.consumables.map((cons: any) => ({
        'Item Name': cons.name,
        'Category': cons.category,
        'Quantity': cons.quantity,
        'Unit': cons.unit,
        'Minimum Stock': cons.minimum_stock,
        'Status': cons.quantity < cons.minimum_stock ? 'Low Stock' : 'In Stock',
      }));
      const ws3 = XLSX.utils.json_to_sheet(consumablesData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Consumables');

      // Sheet 4: Emergency Incidents
      const incidentsData = reportData.incidents.map((inc: any) => ({
        'Date': new Date(inc.incident_date).toLocaleDateString(),
        'Student': `${inc.Student?.first_name} ${inc.Student?.last_name}`,
        'Type': inc.incident_type,
        'Severity': inc.severity,
        'Description': inc.description,
        'Action Taken': inc.action_taken,
      }));
      const ws4 = XLSX.utils.json_to_sheet(incidentsData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Incidents');

      // Sheet 5: Visits by Complaint
      const complaintData = reportData.visits_by_complaint.map((item: any) => ({
        'Symptom': item.complaint,
        'Total Cases': item.count,
      }));
      const ws5 = XLSX.utils.json_to_sheet(complaintData);
      XLSX.utils.book_append_sheet(wb, ws5, 'Complaints Summary');

      const filename = `Clinic_Report_${reportType}_${year}_T${term}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('📄 Report exported successfully!');
    } catch (error: any) {
      toast.error(`❌ Failed to export report: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="nurse" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Clinic Reports"
          subtitle="Generate and export comprehensive clinic activity reports"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="daily">Daily Activity</option>
                  <option value="weekly">Weekly Activity</option>
                  <option value="monthly">Monthly Activity</option>
                  <option value="termly">Termly Report</option>
                  <option value="yearly">Yearly Report</option>
                </select>
              </div>

              {(reportType === 'termly' || reportType === 'yearly') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="1">Term 1</option>
                      <option value="2">Term 2</option>
                      <option value="3">Term 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg disabled:opacity-50"
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
                  <div className="text-3xl mb-2">🩺</div>
                  <div className="text-2xl font-bold">{(reportData.visits || []).length}</div>
                  <div className="text-sm opacity-90">Clinic Visits</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">💊</div>
                  <div className="text-2xl font-bold">{(reportData.medicines || []).length}</div>
                  <div className="text-sm opacity-90">Medicines</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">🧰</div>
                  <div className="text-2xl font-bold">{(reportData.consumables || []).length}</div>
                  <div className="text-sm opacity-90">Consumables</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">🚨</div>
                  <div className="text-2xl font-bold">{(reportData.incidents || []).length}</div>
                  <div className="text-sm opacity-90">Incidents</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <h3 className="text-lg font-bold text-gray-900">📋 Common Symptoms</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Symptoms</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total Cases</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(reportData.visits_by_complaint || []).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.complaint}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                    <h3 className="text-lg font-bold text-gray-900">💊 Medicines Stock</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Medicine</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(reportData.medicines || []).slice(0, 10).map((med: any) => (
                          <tr key={med.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{med.name}</td>
                            <td className="px-4 py-3 text-sm text-center">{med.quantity} {med.unit}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                med.quantity < med.minimum_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {med.quantity < med.minimum_stock ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                    <h3 className="text-lg font-bold text-gray-900">🧰 Consumables Stock</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(reportData.consumables || []).slice(0, 10).map((cons: any) => (
                          <tr key={cons.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{cons.name}</td>
                            <td className="px-4 py-3 text-sm text-center">{cons.quantity} {cons.unit}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                cons.quantity < cons.minimum_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {cons.quantity < cons.minimum_stock ? 'Low Stock' : 'In Stock'}
                              </span>
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
