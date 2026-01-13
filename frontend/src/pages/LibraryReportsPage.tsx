import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { libraryApi } from '@/services/api';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import * as XLSX from 'xlsx';

export default function LibraryReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly'>('daily');
  const [term, setTerm] = useState('1');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['library-reports', reportType, term, year],
    queryFn: () => libraryApi.getReports({ type: reportType, term, year: year.toString() }),
    enabled: false,
  });

  const handleGenerateReport = () => {
    refetch();
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Books Inventory
    const booksData = reportData.books.map((book: any) => ({
      'Title': book.title,
      'Author': book.author,
      'ISBN': book.isbn || 'N/A',
      'Subject': book.subject,
      'Class': book.class || 'N/A',
      'Total Copies': book.total_copies,
      'Available': book.available_copies,
      'Issued': book.issued_copies,
      'Lost': book.lost_copies,
      'Damaged': book.damaged_copies,
      'Location': book.location || 'N/A',
    }));
    const ws1 = XLSX.utils.json_to_sheet(booksData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Books Inventory');

    // Sheet 2: Book Issues
    const issuesData = reportData.issues.map((issue: any) => ({
      'Book Title': issue.book_title,
      'Copy Number': issue.copy_number,
      'Borrower': issue.borrower_name,
      'Type': issue.borrower_type,
      'Class/Dept': issue.borrower_class,
      'Issued Date': new Date(issue.issued_date).toLocaleDateString(),
      'Due Date': new Date(issue.due_date).toLocaleDateString(),
      'Return Date': issue.return_date ? new Date(issue.return_date).toLocaleDateString() : 'Not Returned',
      'Status': issue.status,
      'Term': issue.term,
      'Year': issue.year,
    }));
    const ws2 = XLSX.utils.json_to_sheet(issuesData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Book Issues');

    // Sheet 3: Issues by Class
    const classSummary = reportData.issues_by_class.map((item: any) => ({
      'Class': item.class,
      'Total Issues': item.total_issues,
    }));
    const ws3 = XLSX.utils.json_to_sheet(classSummary);
    XLSX.utils.book_append_sheet(wb, ws3, 'Issues by Class');

    // Sheet 4: Issues by Teachers
    const teacherSummary = reportData.issues_by_teacher.map((item: any) => ({
      'Teacher': item.teacher,
      'Total Issues': item.total_issues,
    }));
    const ws4 = XLSX.utils.json_to_sheet(teacherSummary);
    XLSX.utils.book_append_sheet(wb, ws4, 'Issues by Teachers');

    // Generate filename
    const filename = `Library_Report_${reportType}_${reportType === 'termly' || reportType === 'yearly' ? `${year}_T${term}` : new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="librarian" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Library Reports"
          subtitle="Generate and export comprehensive library activity reports"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Report Configuration */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Report Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily Activity</option>
                  <option value="weekly">Weekly Activity</option>
                  <option value="monthly">Monthly Activity</option>
                  <option value="termly">Termly Activity</option>
                  <option value="yearly">Yearly Activity</option>
                </select>
              </div>

              {(reportType === 'termly' || reportType === 'yearly') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500"
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
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg disabled:opacity-50"
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

          {/* Report Preview */}
          {reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">📚</div>
                  <div className="text-2xl font-bold">{reportData.books.length}</div>
                  <div className="text-sm opacity-90">Total Books</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">📤</div>
                  <div className="text-2xl font-bold">{reportData.issues.length}</div>
                  <div className="text-sm opacity-90">Total Issues</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">🎓</div>
                  <div className="text-2xl font-bold">{reportData.issues_by_class.length}</div>
                  <div className="text-sm opacity-90">Classes Served</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl mb-2">👨‍🏫</div>
                  <div className="text-2xl font-bold">{reportData.issues_by_teacher.length}</div>
                  <div className="text-sm opacity-90">Teachers Served</div>
                </div>
              </div>

              {/* Books Inventory Table */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <h3 className="text-lg font-bold text-gray-900">📚 Books Inventory</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Author</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Subject</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Available</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Issued</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Lost</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Damaged</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.books.map((book: any) => (
                        <tr key={book.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{book.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{book.author}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{book.subject}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold">{book.total_copies}</td>
                          <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{book.available_copies}</td>
                          <td className="px-4 py-3 text-sm text-center text-orange-600 font-semibold">{book.issued_copies}</td>
                          <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{book.lost_copies}</td>
                          <td className="px-4 py-3 text-sm text-center text-yellow-600 font-semibold">{book.damaged_copies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Issues by Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                    <h3 className="text-lg font-bold text-gray-900">🎓 Issues by Class</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Class</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total Issues</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.issues_by_class.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.class}</td>
                            <td className="px-4 py-3 text-sm text-center font-semibold text-purple-600">{item.total_issues}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Issues by Teachers */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b">
                    <h3 className="text-lg font-bold text-gray-900">👨‍🏫 Issues by Teachers</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Teacher</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total Issues</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.issues_by_teacher.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.teacher}</td>
                            <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">{item.total_issues}</td>
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
