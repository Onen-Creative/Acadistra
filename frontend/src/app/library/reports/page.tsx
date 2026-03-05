'use client';

import { useState, useEffect } from 'react';
import { libraryApi } from '@/services/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function LibraryReportsPage() {
  const { user } = useRequireAuth(['librarian', 'school_admin']);
  const [reportType, setReportType] = useState('termly');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState('2026');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, reportType, term, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { type: reportType };
      if (reportType === 'termly' || reportType === 'yearly') {
        if (term) params.term = term;
        if (year) params.year = year;
      }
      const response = await libraryApi.getReportData(params);
      setReportData(response);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['Library Report'],
        ['Report Type', reportType],
        ['Term', term],
        ['Year', year],
        ['Generated', new Date().toLocaleString()],
        [],
        ['Total Books', reportData.books?.length || 0],
        ['Total Issues', reportData.issues?.length || 0],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Issues sheet
      if (reportData.issues?.length > 0) {
        const issuesData = reportData.issues.map((issue: any, index: number) => ({
          '#': index + 1,
          'Book': issue.book_title,
          'Copy': issue.copy_number,
          'Borrower': issue.borrower_name,
          'Type': issue.borrower_type,
          'Class': issue.borrower_class,
          'Issued': new Date(issue.issued_date).toLocaleDateString(),
          'Due': new Date(issue.due_date).toLocaleDateString(),
          'Status': issue.status,
        }));
        const issuesWs = XLSX.utils.json_to_sheet(issuesData);
        XLSX.utils.book_append_sheet(wb, issuesWs, 'Issues');
      }

      // By Class sheet
      if (reportData.issues_by_class?.length > 0) {
        const classWs = XLSX.utils.json_to_sheet(reportData.issues_by_class);
        XLSX.utils.book_append_sheet(wb, classWs, 'By Class');
      }

      // By Teacher sheet
      if (reportData.issues_by_teacher?.length > 0) {
        const teacherWs = XLSX.utils.json_to_sheet(reportData.issues_by_teacher);
        XLSX.utils.book_append_sheet(wb, teacherWs, 'By Teacher');
      }

      XLSX.writeFile(wb, `library_report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('📊 Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-4 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold mb-2">Library Reports</h1>
              <p className="text-sm md:text-base text-purple-100">Comprehensive library analytics and insights</p>
            </div>
            <button
              onClick={exportReport}
              disabled={!reportData || loading}
              className="bg-white text-purple-600 hover:bg-purple-50 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="termly">Termly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {(reportType === 'termly' || reportType === 'yearly') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {['2024', '2025', '2026', '2027'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {reportType === 'termly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Books</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{reportData.books?.length || 0}</p>
                  </div>
                  <div className="text-2xl md:text-3xl">📚</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Issues</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{reportData.issues?.length || 0}</p>
                  </div>
                  <div className="text-2xl md:text-3xl">📤</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Student Issues</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                      {reportData.issues?.filter((i: any) => i.borrower_type === 'student').length || 0}
                    </p>
                  </div>
                  <div className="text-3xl">👨‍🎓</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Teacher Issues</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                      {reportData.issues?.filter((i: any) => i.borrower_type === 'teacher').length || 0}
                    </p>
                  </div>
                  <div className="text-3xl">👨‍🏫</div>
                </div>
              </div>
            </div>

            {/* Issues by Class */}
            {reportData.issues_by_class?.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Issues by Class</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Issues</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.issues_by_class.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.class}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">{item.total_issues}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Issues by Teacher */}
            {reportData.issues_by_teacher?.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Issues by Teacher</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Issues</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.issues_by_teacher.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.teacher}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">{item.total_issues}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Issues */}
            {reportData.issues?.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Issues ({reportData.issues.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.issues.slice(0, 50).map((issue: any) => (
                        <tr key={issue.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{issue.book_title}</div>
                            <div className="text-xs text-gray-500">Copy: {issue.copy_number}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{issue.borrower_name}</div>
                            <div className="text-xs text-gray-500">{issue.borrower_class}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              issue.borrower_type === 'student' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {issue.borrower_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            {new Date(issue.issued_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              issue.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                              issue.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {issue.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportData.issues.length > 50 && (
                    <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                      Showing 50 of {reportData.issues.length} issues. Export to see all.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500">No data available for the selected period</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
