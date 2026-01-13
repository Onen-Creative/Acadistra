import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi, studentsApi, teachersApi } from '@/services/api';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { useTermYearFilter } from '@/hooks/useTermYearFilter';
import TermYearFilter from '@/components/TermYearFilter';
import Sidebar from '@/components/Sidebar';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function BookIssuesPage() {
  const queryClient = useQueryClient();
  const { dialog, showSuccess, showError, closeDialog } = useActivityDialog();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIssueBook, setShowIssueBook] = useState(false);
  const [issueModeType, setIssueModeType] = useState<'single' | 'bulk'>('single');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { term, year, setTerm, setYear } = useTermYearFilter();

  useWebSocket(['library:']);

  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['library-issues', statusFilter, term, year, searchTerm, page, limit],
    queryFn: () => libraryApi.listIssues({ 
      status: statusFilter, 
      term, 
      year: year.toString(),
      search: searchTerm,
      page,
      limit
    }),
    enabled: true, // Always fetch
  });

  const { data: booksData } = useQuery({
    queryKey: ['library-books-available'],
    queryFn: () => libraryApi.listBooks({ limit: 1000 }),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({ limit: 1000 }),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersApi.list({ limit: 1000 }),
    retry: false,
    enabled: true,
  });

  const issueBookMutation = useMutation({
    mutationFn: (data: any) => libraryApi.issueBook({ ...data, year, term: term.toString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      showSuccess('Success!', 'Book issued successfully');
      setShowIssueBook(false);
    },
    onError: (error: any) => {
      console.error('Issue book error:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to issue book';
      showError('Error!', errorMsg);
    },
  });

  const bulkIssueBookMutation = useMutation({
    mutationFn: (data: any) => libraryApi.bulkIssueBooks({ ...data, year, term: term.toString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      showSuccess('Success!', 'Books issued successfully');
      setShowIssueBook(false);
    },
    onError: () => showError('Error!', 'Failed to issue books'),
  });

  const returnBookMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => libraryApi.returnBook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      showSuccess('Success!', 'Book returned successfully');
      setShowReturnModal(false);
      setSelectedIssue(null);
    },
    onError: () => showError('Error!', 'Failed to return book'),
  });

  const handleReturnBook = (issue: any) => {
    setSelectedIssue(issue);
    setShowReturnModal(true);
  };

  const availableBooks = (booksData?.books || []).filter((b: any) => b.available_copies > 0);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="librarian" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Book Issues"
          subtitle="Manage book borrowing and returns"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <TermYearFilter
              term={term}
              year={year}
              onTermChange={setTerm}
              onYearChange={setYear}
            />
            
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by student name or book title..."
                className="flex-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Issues</option>
                <option value="issued">Issued</option>
                <option value="returned">Returned</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => { setIssueModeType('single'); setShowIssueBook(true); }}
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg text-sm"
              >
                📤 Issue Single Book
              </button>
              <button
                onClick={() => { setIssueModeType('bulk'); setShowIssueBook(true); }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg text-sm"
              >
                📚 Bulk Issue Books
              </button>
            </div>
          </div>

          {/* Issues List */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Book Details</th>
                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Borrower</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Issue Info</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Due Date</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(issuesData?.issues || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <div className="text-6xl mb-4">📚</div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No Book Issues Found</h3>
                              <p className="text-gray-500 mb-4">
                                {statusFilter ? `No ${statusFilter} issues found.` : 'No books have been issued yet.'}
                              </p>
                              <button
                                onClick={() => setShowIssueBook(true)}
                                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                              >
                                Issue First Book
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (issuesData?.issues || []).map((issue: any) => {
                          const isOverdue = issue.status === 'issued' && new Date(issue.due_date) < new Date();
                          return (
                            <tr key={issue.id} className="hover:bg-gray-50">
                              <td className="px-3 lg:px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{issue.book_title}</p>
                                  <p className="text-xs text-gray-500">Copy #{issue.copy_number}</p>
                                  <p className="text-xs text-gray-400">ID: {issue.book_id?.slice(-8)}</p>
                                </div>
                              </td>
                              <td className="px-3 lg:px-6 py-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{issue.borrower_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {issue.borrower_class || issue.borrower_type}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {issue.borrower_type === 'student' ? 'Student' : 'Teacher'}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 lg:px-6 py-4 text-center">
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {new Date(issue.issued_date).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {issue.year} - {issue.term}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 lg:px-6 py-4 text-center">
                                <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                                  {new Date(issue.due_date).toLocaleDateString()}
                                </span>
                                {isOverdue && (
                                  <p className="text-xs text-red-500 font-medium">OVERDUE</p>
                                )}
                              </td>
                              <td className="px-3 lg:px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  issue.status === 'issued' 
                                    ? isOverdue 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-orange-100 text-orange-800'
                                    : issue.status === 'returned'
                                    ? 'bg-green-100 text-green-800'
                                    : issue.status === 'lost'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {issue.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 lg:px-6 py-4 text-center">
                                {issue.status === 'issued' && (
                                  <button
                                    onClick={() => handleReturnBook(issue)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 font-semibold shadow-sm"
                                  >
                                    📥 Return
                                  </button>
                                )}
                                {issue.status === 'returned' && issue.return_date && (
                                  <p className="text-xs text-gray-500">
                                    Returned: {new Date(issue.return_date).toLocaleDateString()}
                                  </p>
                                )}
                                {issue.status === 'lost' && (
                                  <span className="text-xs text-gray-600 font-medium">Marked Lost</span>
                                )}
                                {issue.status === 'damaged' && (
                                  <span className="text-xs text-yellow-600 font-medium">Marked Damaged</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {issuesData && issuesData.total > 0 && (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil((issuesData.total || 0) / limit)}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Issue Book Modal */}
      <Modal
        isOpen={showIssueBook}
        onClose={() => setShowIssueBook(false)}
        title={issueModeType === 'single' ? 'Issue Single Book' : 'Bulk Issue Books'}
        size={issueModeType === 'bulk' ? 'xl' : 'md'}
      >
        {issueModeType === 'single' ? (
          <IssueBookForm
            books={availableBooks}
            students={studentsData?.students || []}
            teachers={teachersData?.teachers || []}
            onSubmit={issueBookMutation.mutate}
            onCancel={() => setShowIssueBook(false)}
          />
        ) : (
          <BulkIssueBookForm
            books={availableBooks}
            students={studentsData?.students || []}
            teachers={teachersData?.teachers || []}
            onSubmit={bulkIssueBookMutation.mutate}
            onCancel={() => setShowIssueBook(false)}
          />
        )}
      </Modal>

      {/* Return Book Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Return Book"
      >
        <ReturnBookForm
          issue={selectedIssue}
          onSubmit={(data: any) => returnBookMutation.mutate({ id: selectedIssue?.id, data })}
          onCancel={() => setShowReturnModal(false)}
        />
      </Modal>

      <ActivityDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
      />
    </div>
  );
}

function IssueBookForm({ books, students, teachers, onSubmit, onCancel }: {
  books: any[];
  students: any[];
  teachers: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [selectedBookId, setSelectedBookId] = useState('');
  const [borrowerType, setBorrowerType] = useState('student');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [issuedCopyNumbers, setIssuedCopyNumbers] = useState<string[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  const getClassFromAdmission = (admissionNo: string) => {
    const parts = admissionNo?.split('/');
    return parts && parts.length > 1 ? parts[1] : null;
  };

  const filteredBooks = books.filter(book => {
    if (classFilter && book.class !== classFilter) return false;
    if (subjectFilter && book.subject !== subjectFilter) return false;
    return true;
  });

  const filteredStudents = students.filter(student => {
    if (!studentClassFilter) return true;
    return getClassFromAdmission(student.admission_no) === studentClassFilter;
  });

  const selectedBook = books.find(b => b.id === selectedBookId);
  const totalCopies = selectedBook?.total_copies || 0;
  const availableCopies = selectedBook?.available_copies || 0;

  const uniqueClasses = [...new Set(books.map(b => b.class).filter(Boolean))];
  const uniqueSubjects = [...new Set(books.map(b => b.subject).filter(Boolean))];
  const uniqueStudentClasses = [...new Set(students.map(s => getClassFromAdmission(s.admission_no)).filter(Boolean))] as string[];

  // Fetch issued copy numbers when book is selected
  const fetchIssuedCopies = async (bookId: string) => {
    setLoadingCopies(true);
    try {
      const data = await libraryApi.getAvailableCopies(bookId);
      setIssuedCopyNumbers(data.issued_copy_numbers || []);
    } catch (error) {
      setIssuedCopyNumbers([]);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleBookChange = (bookId: string) => {
    setSelectedBookId(bookId);
    if (bookId) {
      fetchIssuedCopies(bookId);
    } else {
      setIssuedCopyNumbers([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      book_id: formData.get('book_id'),
      borrower_id: formData.get('borrower_id'),
      borrower_type: borrowerType,
      copy_number: formData.get('copy_number'),
      due_days: parseInt(formData.get('due_days') as string) || 14,
      notes: formData.get('notes'),
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">Class Filter</label>
          <select 
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Classes</option>
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Subject Filter</label>
          <select 
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Subjects</option>
            {uniqueSubjects.map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Book * ({filteredBooks.length} available)</label>
        <select 
          name="book_id" 
          value={selectedBookId}
          onChange={(e) => handleBookChange(e.target.value)}
          required 
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select book</option>
          {filteredBooks.map((book: any) => (
            <option key={book.id} value={book.id}>
              {book.title} - {book.author} ({book.available_copies} available)
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Copy Number *</label>
        {loadingCopies ? (
          <div className="w-full border rounded-lg px-3 py-2 text-gray-500">Loading...</div>
        ) : totalCopies > 0 ? (
          <select 
            name="copy_number" 
            required 
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select copy number</option>
            {Array.from({ length: totalCopies }, (_, i) => i + 1)
              .filter(num => !issuedCopyNumbers.includes(`${num}/${totalCopies}`))
              .map(num => (
                <option key={num} value={`${num}/${totalCopies}`}>
                  {num}/{totalCopies}
                </option>
              ))}
          </select>
        ) : selectedBookId ? (
          <div className="w-full border rounded-lg px-3 py-2 text-red-500">No copies available</div>
        ) : (
          <div className="w-full border rounded-lg px-3 py-2 text-gray-500">Select a book first</div>
        )}
        {availableCopies > 0 && !loadingCopies && (
          <p className="text-xs text-gray-500 mt-1">
            {availableCopies} of {totalCopies} copies available
          </p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Borrower Type *</label>
        <select 
          value={borrowerType}
          onChange={(e) => setBorrowerType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
      </div>
      
      {borrowerType === 'student' && (
        <div>
          <label className="block text-sm font-medium mb-2">Filter by Class</label>
          <select 
            value={studentClassFilter}
            onChange={(e) => setStudentClassFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Classes ({students.length} students)</option>
            {uniqueStudentClasses.map((cls: string) => {
              const studentsInClass = students.filter(s => getClassFromAdmission(s.admission_no) === cls).length;
              return (
                <option key={cls} value={cls}>{cls} ({studentsInClass} students)</option>
              );
            })}
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {borrowerType === 'student' ? `Student (${filteredStudents.length} available)` : 'Teacher'} *
        </label>
        <select name="borrower_id" required className="w-full border rounded-lg px-3 py-2">
          <option value="">Select {borrowerType}</option>
          {borrowerType === 'student' 
            ? filteredStudents.map((student: any) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} - {getClassFromAdmission(student.admission_no)} - {student.admission_no}
                </option>
              ))
            : teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name} - {teacher.specialization || 'Teacher'}
                </option>
              ))
          }
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Due Days *</label>
        <input 
          name="due_days" 
          type="number" 
          defaultValue={14} 
          min="1" 
          required 
          className="w-full border rounded-lg px-3 py-2" 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea 
          name="notes" 
          rows={3}
          className="w-full border rounded-lg px-3 py-2" 
          placeholder="Optional notes..."
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button 
          type="submit" 
          disabled={!selectedBookId || availableCopies === 0}
          className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Issue Book
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ReturnBookForm({ issue, onSubmit, onCancel }: {
  issue: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      status: formData.get('status') || 'returned',
      fine: parseFloat(formData.get('fine') as string) || 0,
      notes: formData.get('notes'),
    };
    onSubmit(data);
  };

  if (!issue) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900">{issue.book?.title}</h4>
        <p className="text-sm text-gray-600">
          Borrower: {issue.borrower_name} ({issue.borrower_class || issue.borrower_type})
        </p>
        <p className="text-sm text-gray-600">
          Due: {new Date(issue.due_date).toLocaleDateString()}
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Return Status *</label>
        <select name="status" required className="w-full border rounded-lg px-3 py-2">
          <option value="returned">Returned</option>
          <option value="lost">Lost</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Fine (UGX)</label>
        <input 
          name="fine" 
          type="number" 
          min="0" 
          step="0.01"
          defaultValue={0}
          className="w-full border rounded-lg px-3 py-2" 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea 
          name="notes" 
          rows={3}
          className="w-full border rounded-lg px-3 py-2" 
          placeholder="Optional notes about the return..."
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button 
          type="submit" 
          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Process Return
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BulkIssueBookForm({ books, students, teachers, onSubmit, onCancel }: {
  books: any[];
  students: any[];
  teachers: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [borrowerType, setBorrowerType] = useState('student');
  const [selectedBooks, setSelectedBooks] = useState<Array<{id: string; copy_number: string}>>([]);
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [currentBookId, setCurrentBookId] = useState('');
  const [currentCopyNumber, setCurrentCopyNumber] = useState('');
  const [currentBookTotalCopies, setCurrentBookTotalCopies] = useState(0);
  const [issuedCopyNumbers, setIssuedCopyNumbers] = useState<string[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  const getClassFromAdmission = (admissionNo: string) => {
    const parts = admissionNo?.split('/');
    return parts && parts.length > 1 ? parts[1] : null;
  };

  const filteredBooks = books.filter(book => {
    if (classFilter && book.class !== classFilter) return false;
    if (subjectFilter && book.subject !== subjectFilter) return false;
    return true;
  });

  const filteredStudents = students.filter(student => {
    if (!studentClassFilter) return true;
    return getClassFromAdmission(student.admission_no) === studentClassFilter;
  });

  const uniqueClasses = [...new Set(books.map(b => b.class).filter(Boolean))];
  const uniqueSubjects = [...new Set(books.map(b => b.subject).filter(Boolean))];
  const uniqueStudentClasses = [...new Set(students.map(s => getClassFromAdmission(s.admission_no)).filter(Boolean))] as string[];

  const fetchIssuedCopies = async (bookId: string) => {
    setLoadingCopies(true);
    try {
      const data = await libraryApi.getAvailableCopies(bookId);
      setIssuedCopyNumbers(data.issued_copy_numbers || []);
    } catch (error) {
      setIssuedCopyNumbers([]);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleBookChange = (bookId: string) => {
    setCurrentBookId(bookId);
    setCurrentCopyNumber('');
    const book = books.find(b => b.id === bookId);
    setCurrentBookTotalCopies(book?.total_copies || 0);
    if (bookId) {
      fetchIssuedCopies(bookId);
    } else {
      setIssuedCopyNumbers([]);
    }
  };

  const handleAddBook = () => {
    if (currentBookId && currentCopyNumber) {
      setSelectedBooks(prev => [...prev, { id: currentBookId, copy_number: currentCopyNumber }]);
      setCurrentBookId('');
      setCurrentCopyNumber('');
      setIssuedCopyNumbers([]);
    }
  };

  const handleRemoveBook = (index: number) => {
    setSelectedBooks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      borrower_id: formData.get('borrower_id'),
      borrower_type: borrowerType,
      books: selectedBooks.map(b => ({ book_id: b.id, copy_number: b.copy_number })),
      due_days: parseInt(formData.get('due_days') as string) || 14,
      notes: formData.get('notes'),
    };
    onSubmit(data);
  };

  const getBookTitle = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    return book ? `${book.title} - ${book.author}` : bookId;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <label className="block text-sm font-medium mb-2">Borrower Type *</label>
        <select 
          value={borrowerType}
          onChange={(e) => setBorrowerType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
      </div>

      {borrowerType === 'student' && (
        <div>
          <label className="block text-sm font-medium mb-2">Filter by Class</label>
          <select 
            value={studentClassFilter}
            onChange={(e) => setStudentClassFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Classes ({students.length} students)</option>
            {uniqueStudentClasses.map((cls: string) => {
              const studentsInClass = students.filter(s => getClassFromAdmission(s.admission_no) === cls).length;
              return (
                <option key={cls} value={cls}>{cls} ({studentsInClass} students)</option>
              );
            })}
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {borrowerType === 'student' ? `Student (${filteredStudents.length} available)` : 'Teacher'} *
        </label>
        <select name="borrower_id" required className="w-full border rounded-lg px-3 py-2">
          <option value="">Select {borrowerType}</option>
          {borrowerType === 'student' 
            ? filteredStudents.map((student: any) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} - {getClassFromAdmission(student.admission_no)} - {student.admission_no}
                </option>
              ))
            : teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name} - {teacher.specialization || 'Teacher'}
                </option>
              ))
          }
        </select>
      </div>

      <div className="border-t pt-6">
        <label className="block text-sm font-medium mb-3">Add Books ({selectedBooks.length} selected)</label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Class Filter</label>
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Subject Filter</label>
            <select 
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <select 
            value={currentBookId}
            onChange={(e) => handleBookChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select book ({filteredBooks.length} available)</option>
            {filteredBooks.map((book: any) => (
              <option key={book.id} value={book.id}>
                {book.title} - {book.author} ({book.available_copies} available)
              </option>
            ))}
          </select>
          {loadingCopies ? (
            <div className="border rounded-lg px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : (
            <select
              value={currentCopyNumber}
              onChange={(e) => setCurrentCopyNumber(e.target.value)}
              disabled={!currentBookId}
              className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Copy # ({currentBookTotalCopies - issuedCopyNumbers.length} available)</option>
              {currentBookTotalCopies > 0 && Array.from({ length: currentBookTotalCopies }, (_, i) => i + 1)
                .filter(num => !issuedCopyNumbers.includes(`${num}/${currentBookTotalCopies}`))
                .map(num => (
                  <option key={num} value={`${num}/${currentBookTotalCopies}`}>
                    {num}/{currentBookTotalCopies}
                  </option>
                ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleAddBook}
            disabled={!currentBookId || !currentCopyNumber || loadingCopies}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
          >
            ➕ Add Book
          </button>
        </div>

        {selectedBooks.length > 0 && (
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            {selectedBooks.map((book, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getBookTitle(book.id)}</p>
                  <p className="text-xs text-gray-500">Copy #{book.copy_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBook(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium ml-2 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Due Days *</label>
        <input 
          name="due_days" 
          type="number" 
          defaultValue={14} 
          min="1" 
          required 
          className="w-full border rounded-lg px-3 py-2" 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea 
          name="notes" 
          rows={3}
          className="w-full border rounded-lg px-3 py-2" 
          placeholder="Optional notes..."
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white pb-2">
        <button 
          type="submit" 
          disabled={selectedBooks.length === 0}
          className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Issue {selectedBooks.length} Book{selectedBooks.length !== 1 ? 's' : ''}
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}