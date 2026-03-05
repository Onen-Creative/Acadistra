'use client';

import { useState, useEffect } from 'react';
import { libraryApi, studentsApi, staffApi, schoolsApi, classesApi } from '@/services/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function BookIssuesPage() {
  const { user } = useRequireAuth(['librarian', 'school_admin']);
  const [issues, setIssues] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [borrowerTypeFilter, setBorrowerTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [returningIssue, setReturningIssue] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchIssues();
      fetchStudents();
      fetchTeachers();
      fetchBooks();
      fetchLevels();
      fetchClasses();
    }
  }, [user, searchTerm, statusFilter, borrowerTypeFilter, levelFilter]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await libraryApi.listIssues({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        limit: 1000,
      });
      setIssues(response.issues || []);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId?: string) => {
    try {
      const params: any = { limit: 1000 };
      if (classId) params.class_id = classId;
      const response = await studentsApi.list(params);
      setStudents(response.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await staffApi.list({ role: 'Teacher', limit: 1000 });
      const teachersArray = Array.isArray(response) ? response : (response.staff || []);
      setTeachers(teachersArray);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      const response = await libraryApi.listBooks({ limit: 1000 });
      setBooks(response.books || []);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await schoolsApi.getLevels();
      setLevels(response.levels || []);
    } catch (error) {
      console.error('Failed to fetch levels:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classesApi.list();
      setClasses(response.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleIssueBook = async (data: any) => {
    const loadingToast = toast.loading('Issuing book...');
    try {
      await libraryApi.issueBook(data);
      toast.success('📚 Book issued successfully!', { id: loadingToast });
      setShowIssueModal(false);
      fetchIssues();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to issue book', { id: loadingToast });
    }
  };

  const handleBulkIssue = async (data: any) => {
    const loadingToast = toast.loading('Issuing books...');
    try {
      const response = await libraryApi.bulkIssueBooks(data);
      const totalBooks = data.books.length;
      toast.success(`📚 Successfully issued ${totalBooks} book${totalBooks > 1 ? 's' : ''}!`, { id: loadingToast, duration: 4000 });
      setShowBulkModal(false);
      fetchIssues();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to issue books', { id: loadingToast });
    }
  };

  const handleReturnBook = async (id: string, data: any) => {
    const loadingToast = toast.loading('Processing return...');
    try {
      await libraryApi.returnBook(id, data);
      toast.success('📥 Book returned successfully!', { id: loadingToast });
      setReturningIssue(null);
      fetchIssues();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to return book', { id: loadingToast });
    }
  };

  const exportIssues = () => {
    if (!issues.length) {
      toast.error('No issues to export');
      return;
    }
    try {
      const data = issues.map((issue, index) => ({
        '#': index + 1,
        'Book Title': issue.book_title,
        'Copy Number': issue.copy_number,
        'Student Name': issue.borrower_name,
        'Class': issue.borrower_class,
        'Issue Date': new Date(issue.issued_date).toLocaleDateString(),
        'Due Date': new Date(issue.due_date).toLocaleDateString(),
        'Return Date': issue.return_date ? new Date(issue.return_date).toLocaleDateString() : 'Not returned',
        'Status': issue.status,
        'Fine': issue.fine || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Book Issues');
      XLSX.writeFile(wb, `book_issues_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('📊 Issues exported successfully!');
    } catch (error) {
      toast.error('Failed to export issues');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'returned': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'damaged': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-4 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold mb-2">Book Issues</h1>
              <p className="text-sm md:text-base text-purple-100">Manage book issues and returns</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowIssueModal(true)}
                className="flex-1 md:flex-none bg-white text-purple-600 hover:bg-purple-50 px-3 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Issue Book</span>
                <span className="sm:hidden">Issue</span>
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Bulk Issue</span>
                <span className="sm:hidden">Bulk</span>
              </button>
              <button
                onClick={exportIssues}
                disabled={!issues.length}
                className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by book title, borrower name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="issued">Issued</option>
                <option value="returned">Returned</option>
                <option value="overdue">Overdue</option>
                <option value="lost">Lost/Stolen</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Borrower Type</label>
              <select
                value={borrowerTypeFilter}
                onChange={(e) => setBorrowerTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level/Class</label>
              <input
                type="text"
                placeholder="Filter by level (e.g., S1, P5)"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-3 md:mt-4">
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter(''); setBorrowerTypeFilter(''); setLevelFilter(''); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Issues Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issues.length > 0 ? issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{issue.book_title}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {issue.borrower_name} {issue.borrower_class && `- ${issue.borrower_class}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        issue.borrower_type === 'student' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {issue.borrower_type === 'student' ? '👨‍🎓 Student' : '👨‍🏫 Teacher'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                        {issue.copy_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {new Date(issue.issued_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {new Date(issue.due_date).toLocaleDateString()}
                      {issue.status === 'overdue' && (
                        <p className="text-xs text-red-600 mt-1">
                          {getDaysOverdue(issue.due_date)} days overdue
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                        {issue.status === 'lost' ? '❌ Lost' : 
                         issue.status === 'damaged' ? '⚠️ Damaged' :
                         issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {issue.fine ? `UGX ${issue.fine.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {issue.status === 'issued' || issue.status === 'overdue' ? (
                        <button
                          onClick={() => setReturningIssue(issue)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                        >
                          📥 Process
                        </button>
                      ) : issue.status === 'returned' ? (
                        <span className="text-xs text-green-600">✓ Returned</span>
                      ) : issue.status === 'lost' ? (
                        <span className="text-xs text-red-600">❌ Lost</span>
                      ) : issue.status === 'damaged' ? (
                        <span className="text-xs text-yellow-600">⚠️ Damaged</span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-3 md:px-6 py-8 text-center text-gray-500 text-sm">
                      No issues found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Issue Book Modal */}
      {showIssueModal && (
        <IssueBookModal
          onClose={() => setShowIssueModal(false)}
          onSubmit={handleIssueBook}
          students={students}
          teachers={teachers}
          books={books}
          onClassChange={fetchStudents}
        />
      )}

      {/* Bulk Issue Modal */}
      {showBulkModal && (
        <BulkIssueModal
          onClose={() => setShowBulkModal(false)}
          onSubmit={handleBulkIssue}
          students={students}
          teachers={teachers}
          books={books}
          onClassChange={fetchStudents}
        />
      )}

      {/* Return Book Modal */}
      {returningIssue && (
        <ReturnBookModal
          issue={returningIssue}
          onClose={() => setReturningIssue(null)}
          onSubmit={(data: any) => handleReturnBook(returningIssue.id, data)}
        />
      )}
    </DashboardLayout>
  );
}

function IssueBookModal({ onClose, onSubmit, students, teachers, books, onClassChange }: any) {
  const [formData, setFormData] = useState({
    book_id: '',
    copy_number: '',
    borrower_id: '',
    borrower_type: 'student',
    term: 'Term 1',
    year: 2026,
    due_days: 14,
  });
  const [availableCopies, setAvailableCopies] = useState<any>(null);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classesApi.list();
      const classesArray = Array.isArray(response) ? response : (response.classes || []);
      setClasses(classesArray);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAvailableCopies = async (bookId: string) => {
    try {
      setLoadingCopies(true);
      const response = await libraryApi.getAvailableCopies(bookId);
      setAvailableCopies(response);
    } catch (error) {
      console.error('Failed to fetch available copies:', error);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleBookChange = (bookId: string) => {
    setFormData({ ...formData, book_id: bookId, copy_number: '' });
    if (bookId) {
      fetchAvailableCopies(bookId);
    } else {
      setAvailableCopies(null);
    }
  };

  const getAvailableCopyNumbers = () => {
    if (!availableCopies) return [];
    const unavailableSet = new Set(availableCopies.unavailable_copy_numbers || []);
    const available = [];
    for (let i = 1; i <= availableCopies.total_copies; i++) {
      const copyNum = `${i}/${availableCopies.total_copies}`;
      if (!unavailableSet.has(copyNum)) {
        available.push(copyNum);
      }
    }
    return available;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const filteredStudents = students;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Issue Book</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Borrower Type *</label>
            <select
              value={formData.borrower_type}
              onChange={(e) => setFormData({ ...formData, borrower_type: e.target.value, borrower_id: '' })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          {formData.borrower_type === 'student' && (
            <div>
              <label className="block text-sm font-medium mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setFormData({ ...formData, borrower_id: '' });
                  onClassChange(e.target.value || undefined);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Classes</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">{formData.borrower_type === 'student' ? 'Student' : 'Teacher'} *</label>
            <select
              value={formData.borrower_id}
              onChange={(e) => setFormData({ ...formData, borrower_id: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select {formData.borrower_type}</option>
              {formData.borrower_type === 'student' ? (
                filteredStudents.map((student: any) => {
                  const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.replace(/\s+/g, ' ').trim();
                  return (
                    <option key={student.id} value={student.id}>
                      {fullName}
                    </option>
                  );
                })
              ) : (
                teachers && teachers.length > 0 ? (
                  teachers.map((teacher: any) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))
                ) : (
                  <option disabled>No teachers available</option>
                )
              )}
            </select>
            {formData.borrower_type === 'student' && filteredStudents.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Showing {filteredStudents.length} of {students.length} students
              </p>
            )}
            {formData.borrower_type === 'teacher' && teachers.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {teachers.length} teachers available
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Book *</label>
            <select
              value={formData.book_id}
              onChange={(e) => handleBookChange(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select book</option>
              {books.map((book: any) => (
                <option key={book.id} value={book.id}>
                  {book.title} - {book.author} ({book.available_copies} available)
                </option>
              ))}
            </select>
          </div>
          {loadingCopies && (
            <div className="text-sm text-gray-500">Loading available copies...</div>
          )}
          {availableCopies && (
            <div>
              <label className="block text-sm font-medium mb-2">Copy Number *</label>
              <select
                value={formData.copy_number}
                onChange={(e) => setFormData({ ...formData, copy_number: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select copy</option>
                {getAvailableCopyNumbers().map((copyNum) => (
                  <option key={copyNum} value={copyNum}>
                    Copy {copyNum}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {availableCopies.available_copies} of {availableCopies.total_copies} copies available
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Due Days</label>
            <input
              type="number"
              value={formData.due_days}
              onChange={(e) => setFormData({ ...formData, due_days: parseInt(e.target.value) })}
              min="1"
              max="90"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!formData.book_id || !formData.copy_number || !formData.borrower_id}
              className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Issue Book
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkIssueModal({ onClose, onSubmit, students, teachers, books, onClassChange }: any) {
  const [formData, setFormData] = useState({
    borrower_id: '',
    borrower_type: 'student',
    term: 'Term 1',
    year: 2026,
    due_days: 14,
  });
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Array<{bookId: string, copies: string[]}>>([]);
  const [currentBookId, setCurrentBookId] = useState('');
  const [availableCopies, setAvailableCopies] = useState<any>(null);
  const [loadingCopies, setLoadingCopies] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classesApi.list();
      const classesArray = Array.isArray(response) ? response : (response.classes || []);
      setClasses(classesArray);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAvailableCopies = async (bookId: string) => {
    try {
      setLoadingCopies(true);
      const response = await libraryApi.getAvailableCopies(bookId);
      setAvailableCopies(response);
    } catch (error) {
      console.error('Failed to fetch available copies:', error);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleBookChange = (bookId: string) => {
    setCurrentBookId(bookId);
    if (bookId) {
      fetchAvailableCopies(bookId);
    } else {
      setAvailableCopies(null);
    }
  };

  const getAvailableCopyNumbers = () => {
    if (!availableCopies) return [];
    const unavailableSet = new Set(availableCopies.unavailable_copy_numbers || []);
    const available = [];
    for (let i = 1; i <= availableCopies.total_copies; i++) {
      const copyNum = `${i}/${availableCopies.total_copies}`;
      if (!unavailableSet.has(copyNum)) {
        available.push(copyNum);
      }
    }
    return available;
  };

  const addBookWithCopies = (copies: string[]) => {
    if (!currentBookId || copies.length === 0) return;
    setSelectedBooks(prev => [...prev, { bookId: currentBookId, copies }]);
    setCurrentBookId('');
    setAvailableCopies(null);
  };

  const removeBook = (index: number) => {
    setSelectedBooks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const booksData = selectedBooks.flatMap(book => 
      book.copies.map(copyNum => ({
        book_id: book.bookId,
        copy_number: copyNum
      }))
    );
    onSubmit({ ...formData, books: booksData });
  };

  const filteredStudents = students;
  const totalCopies = selectedBooks.reduce((sum, book) => sum + book.copies.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Bulk Issue Books</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Borrower Type *</label>
            <select
              value={formData.borrower_type}
              onChange={(e) => setFormData({ ...formData, borrower_type: e.target.value, borrower_id: '' })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          {formData.borrower_type === 'student' && (
            <div>
              <label className="block text-sm font-medium mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setFormData({ ...formData, borrower_id: '' });
                  onClassChange(e.target.value || undefined);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Classes</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">{formData.borrower_type === 'student' ? 'Student' : 'Teacher'} *</label>
            <select
              value={formData.borrower_id}
              onChange={(e) => setFormData({ ...formData, borrower_id: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select {formData.borrower_type}</option>
              {formData.borrower_type === 'student' ? (
                filteredStudents.map((student: any) => {
                  const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.replace(/\s+/g, ' ').trim();
                  return (
                    <option key={student.id} value={student.id}>
                      {fullName}
                    </option>
                  );
                })
              ) : (
                teachers && teachers.length > 0 ? (
                  teachers.map((teacher: any) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))
                ) : (
                  <option disabled>No teachers available</option>
                )
              )}
            </select>
          </div>

          {/* Selected Books List */}
          {selectedBooks.length > 0 && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Selected Books ({totalCopies} copies)</label>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedBooks.map((book, index) => {
                  const bookInfo = books.find((b: any) => b.id === book.bookId);
                  return (
                    <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{bookInfo?.title}</p>
                        <p className="text-xs text-gray-500">{book.copies.length} copies: {book.copies.join(', ')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBook(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Book Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">Add Book</label>
            <select
              value={currentBookId}
              onChange={(e) => handleBookChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-2"
            >
              <option value="">Select book to add</option>
              {books.map((book: any) => (
                <option key={book.id} value={book.id}>
                  {book.title} - {book.author} ({book.available_copies} available)
                </option>
              ))}
            </select>
            {loadingCopies && (
              <div className="text-sm text-gray-500">Loading available copies...</div>
            )}
            {availableCopies && currentBookId && (
              <AddCopiesSection
                availableCopies={getAvailableCopyNumbers()}
                totalCopies={availableCopies.total_copies}
                availableCount={availableCopies.available_copies}
                onAdd={addBookWithCopies}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Due Days</label>
            <input
              type="number"
              value={formData.due_days}
              onChange={(e) => setFormData({ ...formData, due_days: parseInt(e.target.value) })}
              min="1"
              max="90"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!formData.borrower_id || selectedBooks.length === 0}
              className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Issue {totalCopies} Books
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCopiesSection({ availableCopies, totalCopies, availableCount, onAdd }: any) {
  const [selectedCopies, setSelectedCopies] = useState<string[]>([]);

  const toggleCopy = (copyNum: string) => {
    setSelectedCopies(prev =>
      prev.includes(copyNum) ? prev.filter(c => c !== copyNum) : [...prev, copyNum]
    );
  };

  const handleAdd = () => {
    if (selectedCopies.length > 0) {
      onAdd(selectedCopies);
      setSelectedCopies([]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Select Copies ({selectedCopies.length} selected)</label>
      <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 mb-2">
        {availableCopies.map((copyNum: string) => (
          <label key={copyNum} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={selectedCopies.includes(copyNum)}
              onChange={() => toggleCopy(copyNum)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-mono">Copy {copyNum}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {availableCount} of {totalCopies} copies available
      </p>
      <button
        type="button"
        onClick={handleAdd}
        disabled={selectedCopies.length === 0}
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
      >
        Add {selectedCopies.length} Copies
      </button>
    </div>
  );
}

function ReturnBookModal({ issue, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    status: 'returned',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const daysOverdue = issue.status === 'overdue' ? 
    Math.ceil((new Date().getTime() - new Date(issue.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Process Book Return</h3>
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold text-sm">{issue.book_title}</p>
          <p className="text-xs text-gray-600">Copy: {issue.copy_number}</p>
          <p className="text-xs text-gray-600">{issue.borrower_name}</p>
          {daysOverdue > 0 && (
            <p className="text-xs text-red-600 mt-1">{daysOverdue} days overdue</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Return Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="returned">✅ Returned (Good Condition)</option>
              <option value="damaged">⚠️ Returned (Damaged)</option>
              <option value="lost">❌ Lost/Stolen</option>
            </select>
          </div>
          
          {formData.status === 'returned' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                📚 Book will be marked as returned and made available for other borrowers.
              </p>
            </div>
          )}
          
          {formData.status === 'damaged' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Book will be marked as damaged. The copy count will be updated accordingly.
              </p>
            </div>
          )}
          
          {formData.status === 'lost' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                ❌ Book will be marked as lost/stolen. The copy will be removed from circulation.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">
              {formData.status === 'lost' ? 'Incident Details *' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              required={formData.status === 'lost'}
              placeholder={
                formData.status === 'lost' 
                  ? 'Describe the circumstances (e.g., stolen from locker, lost during field trip)'
                  : formData.status === 'damaged'
                  ? 'Describe the damage (e.g., torn pages, water damage, missing cover)'
                  : 'Any additional notes about the return'
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              className={`flex-1 text-white py-2 rounded-lg font-medium ${
                formData.status === 'returned' ? 'bg-green-500 hover:bg-green-600' :
                formData.status === 'damaged' ? 'bg-yellow-500 hover:bg-yellow-600' :
                'bg-red-500 hover:bg-red-600'
              }`}
            >
              {formData.status === 'returned' ? 'Complete Return' :
               formData.status === 'damaged' ? 'Mark as Damaged' :
               'Mark as Lost'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
