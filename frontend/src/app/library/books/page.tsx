'use client';

import { useState, useEffect } from 'react';
import { libraryApi, subjectsApi } from '@/services/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function BooksPage() {
  const { user } = useRequireAuth(['librarian', 'school_admin']);
  const [books, setBooks] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingBook, setViewingBook] = useState<any>(null);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    subject: '',
    isbn: '',
    publisher: '',
    published_year: new Date().getFullYear(),
    total_copies: 1,
    location: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchBooks();
      fetchSubjects();
    }
  }, [user, searchTerm, selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const response = await subjectsApi.getSchoolSubjects();
      const uniqueSubjects = Array.from(new Set(response.map((s: any) => s.name))).sort();
      setSubjects(uniqueSubjects as string[]);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await libraryApi.listBooks({
        search: searchTerm || undefined,
        subject: selectedSubject || undefined
      });
      setBooks(response.books || []);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      subject: '',
      isbn: '',
      publisher: '',
      published_year: new Date().getFullYear(),
      total_copies: 1,
      location: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleViewDetails = (book: any) => {
    setViewingBook(book);
    setShowDetailsModal(true);
  };

  const handleEditBook = (book: any) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      subject: book.subject,
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      published_year: book.published_year || new Date().getFullYear(),
      total_copies: book.total_copies,
      location: book.location || '',
      description: book.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(editingBook ? 'Updating book...' : 'Adding book...');
    try {
      if (editingBook) {
        await libraryApi.updateBook(editingBook.id, formData);
        toast.success('✅ Book updated successfully!', { id: loadingToast });
      } else {
        await libraryApi.createBook(formData);
        toast.success('✅ Book added successfully!', { id: loadingToast });
      }
      setShowModal(false);
      fetchBooks();
    } catch (error) {
      console.error('Failed to save book:', error);
      toast.error('Failed to save book', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    const loadingToast = toast.loading('Deleting book...');
    try {
      await libraryApi.deleteBook(id);
      toast.success('🗑️ Book deleted successfully!', { id: loadingToast });
      fetchBooks();
    } catch (error) {
      console.error('Failed to delete book:', error);
      toast.error('Failed to delete book', { id: loadingToast });
    }
  };

  const exportBooks = () => {
    if (!books.length) {
      toast.error('No books to export');
      return;
    }
    try {
      const data = books.map((book, index) => ({
        '#': index + 1,
        'Title': book.title,
        'Author': book.author,
        'Subject': book.subject,
        'ISBN': book.isbn,
        'Publisher': book.publisher,
        'Publication Year': book.published_year,
        'Total Copies': book.total_copies,
        'Available Copies': book.available_copies,
        'Location': book.location
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Books');
      XLSX.writeFile(wb, `library_books_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('📊 Books exported successfully!');
    } catch (error) {
      toast.error('Failed to export books');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-4 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold mb-2">Books Management</h1>
              <p className="text-sm md:text-base text-purple-100">Manage your library collection</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
              <button
                onClick={handleAddBook}
                className="flex-1 md:flex-none bg-white text-purple-600 hover:bg-purple-50 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Book</span>
                <span className="sm:hidden">Add</span>
              </button>
              <button
                onClick={exportBooks}
                disabled={!books.length}
                className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Books</label>
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Subjects</option>
                {subjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSearchTerm(''); setSelectedSubject(''); }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Books Table */}
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
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Details</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Subject</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avail</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {books.length > 0 ? books.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4">
                        <div>
                          <div className="text-xs md:text-sm font-medium text-gray-900">{book.title}</div>
                          <div className="text-xs text-gray-500">by {book.author}</div>
                          {book.isbn && <div className="text-xs text-gray-400">ISBN: {book.isbn}</div>}
                          <div className="md:hidden mt-1">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {book.subject}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 hidden md:table-cell">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {book.subject}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center font-semibold text-xs md:text-sm">{book.total_copies}</td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <span className={`font-semibold text-xs md:text-sm ${
                          book.available_copies > 5 ? 'text-green-600' :
                          book.available_copies > 0 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {book.available_copies}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600 hidden lg:table-cell">{book.location || 'Not specified'}</td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <div className="flex flex-col md:flex-row justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => handleViewDetails(book)}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 whitespace-nowrap"
                          >
                            <span className="hidden md:inline">👁️ View</span>
                            <span className="md:hidden">👁️</span>
                          </button>
                          <button
                            onClick={() => handleEditBook(book)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 whitespace-nowrap"
                          >
                            <span className="hidden md:inline">✏️ Edit</span>
                            <span className="md:hidden">✏️</span>
                          </button>
                          <button
                            onClick={() => handleDelete(book.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 whitespace-nowrap"
                          >
                            <span className="hidden md:inline">🗑️ Delete</span>
                            <span className="md:hidden">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-3 md:px-6 py-8 text-center text-gray-500 text-sm">
                        No books found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">{editingBook ? 'Edit' : 'Add'} Book</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Author *</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({...formData, author: e.target.value})}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Subject *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select subject</option>
                      {subjects.map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ISBN</label>
                    <input
                      type="text"
                      value={formData.isbn}
                      onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Publisher</label>
                    <input
                      type="text"
                      value={formData.publisher}
                      onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Publication Year</label>
                    <input
                      type="number"
                      value={formData.published_year}
                      onChange={(e) => setFormData({...formData, published_year: parseInt(e.target.value)})}
                      min="1900"
                      max={new Date().getFullYear()}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Copies *</label>
                    <input
                      type="number"
                      value={formData.total_copies}
                      onChange={(e) => setFormData({...formData, total_copies: parseInt(e.target.value)})}
                      required
                      min="1"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g., Shelf A1, Section 2"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                  >
                    {editingBook ? 'Update' : 'Add'} Book
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {showDetailsModal && viewingBook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Book Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                  <h4 className="text-xl font-semibold text-gray-900 mb-1">{viewingBook.title}</h4>
                  <p className="text-gray-600">by {viewingBook.author}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Subject</p>
                    <p className="font-semibold text-gray-900">{viewingBook.subject}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">ISBN</p>
                    <p className="font-semibold text-gray-900">{viewingBook.isbn || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Publisher</p>
                    <p className="font-semibold text-gray-900">{viewingBook.publisher || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Publication Year</p>
                    <p className="font-semibold text-gray-900">{viewingBook.published_year || 'Not specified'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Copies</p>
                    <p className="font-semibold text-gray-900">{viewingBook.total_copies}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Available Copies</p>
                    <p className={`font-semibold ${
                      viewingBook.available_copies > 5 ? 'text-green-600' :
                      viewingBook.available_copies > 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {viewingBook.available_copies}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="font-semibold text-gray-900">{viewingBook.location || 'Not specified'}</p>
                  </div>
                </div>

                {viewingBook.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">Description</p>
                    <p className="text-gray-700">{viewingBook.description}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEditBook(viewingBook);
                    }}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                  >
                    Edit Book
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}