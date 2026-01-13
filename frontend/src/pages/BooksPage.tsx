import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi, subjectsApi } from '@/services/api';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import BookForm from '@/components/forms/BookForm';
import Modal from '@/components/Modal';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function BooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dialog, showSuccess, showError, closeDialog } = useActivityDialog();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useWebSocket(['library:']);

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['library-books', searchTerm, subjectFilter, page, limit],
    queryFn: () => libraryApi.listBooks({ 
      search: searchTerm, 
      subject: subjectFilter,
      page,
      limit
    }),
    enabled: true, // Always fetch
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const allSubjects = await subjectsApi.list();
      const secondaryLevels = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
      const filtered = allSubjects.filter((s: any) => secondaryLevels.includes(s.level));
      const uniqueNames = Array.from(new Set(filtered.map((s: any) => s.name)));
      return uniqueNames.map(name => ({ name }));
    },
  });

  const createBookMutation = useMutation({
    mutationFn: libraryApi.createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      showSuccess('Success!', 'Book added successfully');
      setShowAddBook(false);
    },
    onError: () => showError('Error!', 'Failed to add book'),
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => libraryApi.updateBook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      showSuccess('Success!', 'Book updated successfully');
      setEditingBook(null);
    },
    onError: () => showError('Error!', 'Failed to update book'),
  });

  const deleteBookMutation = useMutation({
    mutationFn: libraryApi.deleteBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      showSuccess('Success!', 'Book deleted successfully');
    },
    onError: () => showError('Error!', 'Failed to delete book'),
  });

  const exportBooks = () => {
    if (!booksData?.books) return;
    const data = booksData.books.map((book: any) => ({
      'Title': book.title,
      'Author': book.author,
      'ISBN': book.isbn,
      'Subject': book.subject,
      'Publisher': book.publisher,
      'Total Copies': book.total_copies,
      'Available': book.available_copies,
      'Location': book.location,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Books');
    XLSX.writeFile(wb, 'library_books.xlsx');
  };

  const handleBookSubmit = (data: any) => {
    if (editingBook) {
      updateBookMutation.mutate({ id: editingBook.id, data });
    } else {
      createBookMutation.mutate(data);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="librarian" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Library Books"
          subtitle="Manage your library collection"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search books by title, author, or ISBN..."
                className="flex-1"
              />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Subjects</option>
                {(subjects || []).map((subject: any, idx: number) => (
                  <option key={idx} value={subject.name}>{subject.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowAddBook(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg text-sm"
              >
                ➕ Add Book
              </button>
              <button
                onClick={exportBooks}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg text-sm"
              >
                📊 Export
              </button>
            </div>
          </div>

          {/* Books List */}
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
                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Author & Subject</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Copies</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                        <th className="px-3 lg:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(booksData?.books || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <div className="text-6xl mb-4">📚</div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No Books Found</h3>
                              <p className="text-gray-500 mb-4">No books in the library yet or no books match your search.</p>
                              <button
                                onClick={() => setShowAddBook(true)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                              >
                                Add First Book
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (booksData?.books || []).map((book: any) => (
                          <tr key={book.id} className="hover:bg-gray-50">
                            <td className="px-3 lg:px-6 py-4">
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{book.title}</p>
                                <p className="text-xs text-gray-500">ISBN: {book.isbn || 'N/A'}</p>
                                <p className="text-xs text-gray-400">Publisher: {book.publisher || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{book.author}</p>
                                <p className="text-xs text-gray-500">{book.subject}</p>
                                <p className="text-xs text-gray-400">Class: {book.class || 'All'}</p>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 text-center">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{book.total_copies} Total</p>
                                <p className="text-xs text-gray-500">{book.available_copies} Available</p>
                                <p className="text-xs text-gray-500">{book.issued_copies} Issued</p>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                book.available_copies > 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : book.issued_copies > 0
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {book.available_copies > 0 
                                  ? 'AVAILABLE' 
                                  : book.issued_copies > 0
                                  ? 'ALL ISSUED'
                                  : 'UNAVAILABLE'
                                }
                              </span>
                              {book.location && (
                                <p className="text-xs text-gray-400 mt-1">📍 {book.location}</p>
                              )}
                            </td>
                            <td className="px-3 lg:px-6 py-4 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() => setEditingBook(book)}
                                  className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs hover:bg-blue-200 font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteBookMutation.mutate(book.id)}
                                  className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs hover:bg-red-200 font-medium"
                                  disabled={book.issued_copies > 0}
                                  title={book.issued_copies > 0 ? 'Cannot delete book with active issues' : 'Delete book'}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {booksData && booksData.total > 0 && (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil((booksData.total || 0) / limit)}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Book Modal */}
      <Modal
        isOpen={showAddBook || !!editingBook}
        onClose={() => { setShowAddBook(false); setEditingBook(null); }}
        title={editingBook ? 'Edit Book' : 'Add New Book'}
      >
        <BookForm
          book={editingBook}
          subjects={subjects || []}
          onSubmit={handleBookSubmit}
          onCancel={() => { setShowAddBook(false); setEditingBook(null); }}
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