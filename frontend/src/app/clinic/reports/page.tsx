'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { clinicApi } from '@/services/api';
import * as XLSX from 'xlsx';

export default function ClinicReportsPage() {
  const { user } = useRequireAuth(['nurse', 'school_admin']);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('weekly');

  useEffect(() => {
    if (user) fetchReports();
  }, [user, reportType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await clinicApi.getReports({ type: reportType });
      setReports(response);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reports) return;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Health Report Summary'],
      ['Report Type:', reportType],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Visits', reports.visits?.length || 0],
      ['Returned to Class', reports.visits?.filter((v: any) => v.outcome === 'returned_to_class').length || 0],
      ['Sent Home', reports.visits?.filter((v: any) => v.outcome === 'sent_home').length || 0],
      ['Referred', reports.visits?.filter((v: any) => v.outcome === 'referred').length || 0],
      ['Rest at Clinic', reports.visits?.filter((v: any) => v.outcome === 'rest_at_clinic').length || 0],
      ['Rest at Dormitory', reports.visits?.filter((v: any) => v.outcome === 'rest_at_dormitory').length || 0],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Visits Sheet
    if (reports.visits && reports.visits.length > 0) {
      const visitsData = reports.visits.map((v: any) => ({
        Date: new Date(v.visit_date).toLocaleDateString(),
        Student: `${v.student?.first_name || ''} ${v.student?.middle_name || ''} ${v.student?.last_name || ''}`.trim(),
        Class: v.student?.class?.name || '-',
        Symptoms: v.symptoms,
        Diagnosis: v.diagnosis || '-',
        Treatment: v.treatment || '-',
        Temperature: v.temperature || '-',
        BP: v.blood_pressure || '-',
        Pulse: v.pulse || '-',
        Outcome: v.outcome?.replace('_', ' ') || '-'
      }));
      const visitsWs = XLSX.utils.json_to_sheet(visitsData);
      XLSX.utils.book_append_sheet(wb, visitsWs, 'Visits');
    }

    // Common Complaints Sheet
    if (reports.visits_by_complaint && reports.visits_by_complaint.length > 0) {
      const complaintsWs = XLSX.utils.json_to_sheet(
        reports.visits_by_complaint.map((c: any) => ({
          Complaint: c.complaint,
          Count: c.count
        }))
      );
      XLSX.utils.book_append_sheet(wb, complaintsWs, 'Common Complaints');
    }

    // Medication Usage Sheet
    if (reports.medication_usage && reports.medication_usage.length > 0) {
      const medicationWs = XLSX.utils.json_to_sheet(
        reports.medication_usage.map((m: any) => ({
          Medicine: m.medicine_name,
          'Total Given': m.total_given
        }))
      );
      XLSX.utils.book_append_sheet(wb, medicationWs, 'Medication Usage');
    }

    // Medicines Inventory Sheet
    if (reports.medicines && reports.medicines.length > 0) {
      const medicinesData = reports.medicines.map((m: any) => ({
        Name: m.name,
        'Generic Name': m.generic_name || '-',
        Category: m.category,
        'Dosage Form': m.dosage_form || '-',
        Strength: m.strength || '-',
        Quantity: m.quantity,
        Unit: m.unit,
        'Minimum Stock': m.minimum_stock,
        Status: m.quantity <= m.minimum_stock ? 'Low Stock' : 'In Stock',
        'Expiry Date': m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '-'
      }));
      const medicinesWs = XLSX.utils.json_to_sheet(medicinesData);
      XLSX.utils.book_append_sheet(wb, medicinesWs, 'Medicines Inventory');
    }

    // Emergency Incidents Sheet
    if (reports.incidents && reports.incidents.length > 0) {
      const incidentsData = reports.incidents.map((i: any) => ({
        Date: new Date(i.incident_date).toLocaleDateString(),
        Student: `${i.student?.first_name || ''} ${i.student?.middle_name || ''} ${i.student?.last_name || ''}`.trim(),
        Type: i.incident_type,
        Description: i.description,
        'Action Taken': i.action_taken,
        'Parent Notified': i.parent_notified ? 'Yes' : 'No',
        Outcome: i.outcome || '-'
      }));
      const incidentsWs = XLSX.utils.json_to_sheet(incidentsData);
      XLSX.utils.book_append_sheet(wb, incidentsWs, 'Emergency Incidents');
    }

    XLSX.writeFile(wb, `Health_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 Health Reports</h1>
              <p className="text-blue-100">Comprehensive clinic statistics and health trends</p>
            </div>
            <button
              onClick={exportToExcel}
              disabled={!reports || loading}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setReportType('daily')}
              className={`px-4 py-2 rounded-lg font-medium ${
                reportType === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 rounded-lg font-medium ${
                reportType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 rounded-lg font-medium ${
                reportType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setReportType('termly')}
              className={`px-4 py-2 rounded-lg font-medium ${
                reportType === 'termly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Termly
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Visits</p>
                  <p className="text-2xl font-bold text-blue-600">{reports?.visits?.length || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Returned to Class</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reports?.visits?.filter((v: any) => v.outcome === 'returned_to_class').length || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Sent Home</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {reports?.visits?.filter((v: any) => v.outcome === 'sent_home').length || 0}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Referred</p>
                  <p className="text-2xl font-bold text-red-600">
                    {reports?.visits?.filter((v: any) => v.outcome === 'referred').length || 0}
                  </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Rest at Dormitory</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {reports?.visits?.filter((v: any) => v.outcome === 'rest_at_dormitory').length || 0}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Emergencies</p>
                  <p className="text-2xl font-bold text-purple-600">{reports?.incidents?.length || 0}</p>
                </div>
              </div>

              {/* Common Complaints */}
              {reports?.visits_by_complaint && reports.visits_by_complaint.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="text-2xl">🤒</span> Most Common Complaints
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reports.visits_by_complaint.slice(0, 10).map((complaint: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <span className="font-medium text-gray-800">{complaint.complaint}</span>
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {complaint.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medication Usage */}
              {reports?.medication_usage && reports.medication_usage.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="text-2xl">💊</span> Top Medications Used
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reports.medication_usage.slice(0, 10).map((med: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                        <span className="font-medium text-gray-800">{med.medicine_name}</span>
                        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {med.total_given} units
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Visits Table */}
              {reports?.visits && reports.visits.length > 0 && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h3 className="text-lg font-bold">All Visits</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symptoms</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnosis</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reports.visits.map((visit: any) => (
                          <tr key={visit.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {new Date(visit.visit_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {visit.student?.first_name} {visit.student?.middle_name ? visit.student?.middle_name + ' ' : ''}{visit.student?.last_name}
                            </td>
                            <td className="px-4 py-3 text-sm">{visit.student?.class?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm truncate max-w-xs">{visit.symptoms}</td>
                            <td className="px-4 py-3 text-sm truncate max-w-xs">{visit.diagnosis || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                visit.outcome === 'returned_to_class' ? 'bg-green-100 text-green-800' :
                                visit.outcome === 'referred' ? 'bg-red-100 text-red-800' :
                                visit.outcome === 'sent_home' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {visit.outcome?.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Medicines Inventory */}
              {reports?.medicines && reports.medicines.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="text-2xl">📦</span> Medicine Inventory Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">In Stock</p>
                      <p className="text-2xl font-bold text-green-600">
                        {reports.medicines.filter((m: any) => m.quantity > m.minimum_stock).length}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600">Low Stock</p>
                      <p className="text-2xl font-bold text-red-600">
                        {reports.medicines.filter((m: any) => m.quantity <= m.minimum_stock).length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600">Total Medicines</p>
                      <p className="text-2xl font-bold text-blue-600">{reports.medicines.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Incidents */}
              {reports?.incidents && reports.incidents.length > 0 && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-red-50 border-b">
                    <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                      <span className="text-2xl">🚨</span> Emergency Incidents
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Parent Notified</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reports.incidents.map((incident: any) => (
                          <tr key={incident.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {new Date(incident.incident_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {incident.student?.first_name} {incident.student?.middle_name ? incident.student?.middle_name + ' ' : ''}{incident.student?.last_name}
                            </td>
                            <td className="px-4 py-3 text-sm">{incident.incident_type}</td>
                            <td className="px-4 py-3 text-sm truncate max-w-xs">{incident.description}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                incident.parent_notified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {incident.parent_notified ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
