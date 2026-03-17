'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function TermDatesPage() {
  const [termDates, setTermDates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<any>(null)
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    term: 'Term 1',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    loadTermDates()
  }, [])

  const loadTermDates = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/v1/term-dates')
      setTermDates(Array.isArray(response.data) ? response.data : response.data.term_dates || [])
    } catch (error) {
      toast.error('Failed to load term dates')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/term-dates', formData)
      toast.success('Term dates saved successfully')
      setModalOpen(false)
      setEditingTerm(null)
      setFormData({ year: new Date().getFullYear(), term: 'Term 1', start_date: '', end_date: '' })
      loadTermDates()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save term dates')
    }
  }

  const handleEdit = (term: any) => {
    setEditingTerm(term)
    setFormData({
      year: term.year,
      term: term.term,
      start_date: term.start_date.split('T')[0],
      end_date: term.end_date.split('T')[0]
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this term date?')) return
    try {
      await api.delete(`/term-dates/${id}`)
      toast.success('Term date deleted successfully')
      loadTermDates()
    } catch (error) {
      toast.error('Failed to delete term date')
    }
  }

  const groupedTerms = termDates.reduce((acc: any, term: any) => {
    if (!acc[term.year]) acc[term.year] = []
    acc[term.year].push(term)
    return acc
  }, {})

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📅 Term Dates Management</h1>
              <p className="text-gray-600 mt-1">Configure academic term start and end dates</p>
            </div>
            <button
              onClick={() => {
                setEditingTerm(null)
                setFormData({ year: new Date().getFullYear(), term: 'Term 1', start_date: '', end_date: '' })
                setModalOpen(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              ➕ Add Term Dates
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link
              href="/attendance"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📋 Mark Attendance
            </Link>
            <Link
              href="/attendance/history"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📊 History & Reports
            </Link>
            <Link
              href="/attendance/holidays"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              🎉 Holidays
            </Link>
            <Link
              href="/attendance/term-dates"
              className="py-3 px-4 rounded-xl text-center font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
            >
              📅 Term Dates
            </Link>
          </div>
        </div>

        {/* Term Dates List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading term dates...</p>
          </div>
        ) : Object.keys(groupedTerms).length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm p-12 text-center">
            <div className="text-7xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Term Dates Configured</h3>
            <p className="text-gray-600">Click "Add Term Dates" to configure your first term</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTerms).sort((a, b) => Number(b) - Number(a)).map((year) => (
              <div key={year} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white">Academic Year {year}</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {groupedTerms[year].sort((a: any, b: any) => a.term.localeCompare(b.term)).map((term: any) => (
                      <div key={term.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="text-3xl">📚</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(term)}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(term.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">{term.term}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-700">Start:</span>
                            <span className="text-gray-600">{format(new Date(term.start_date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-700">End:</span>
                            <span className="text-gray-600">{format(new Date(term.end_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">
                  {editingTerm ? '✏️ Edit Term Dates' : '➕ Add Term Dates'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year *</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Term *</label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      setEditingTerm(null)
                      setFormData({ year: new Date().getFullYear(), term: 'Term 1', start_date: '', end_date: '' })
                    }}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    {editingTerm ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
