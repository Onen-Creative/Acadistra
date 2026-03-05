'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: ''
  })

  useEffect(() => {
    loadHolidays()
  }, [])

  const loadHolidays = async () => {
    setLoading(true)
    try {
      const response = await api.get('/calendar/holidays')
      setHolidays(Array.isArray(response.data) ? response.data : response.data.holidays || [])
    } catch (error) {
      toast.error('Failed to load holidays')
    } finally {
      setLoading(false)
    }
  }

  const seedUgandanHolidays = async () => {
    const currentYear = new Date().getFullYear()
    const ugandanHolidays = [
      { name: 'New Year\'s Day', date: `${currentYear}-01-01`, description: 'First day of the year', day_type: 'holiday', year: currentYear },
      { name: 'NRM Liberation Day', date: `${currentYear}-01-26`, description: 'National Resistance Movement Day', day_type: 'holiday', year: currentYear },
      { name: 'International Women\'s Day', date: `${currentYear}-03-08`, description: 'Celebrating women\'s achievements', day_type: 'holiday', year: currentYear },
      { name: 'Good Friday', date: `${currentYear}-04-03`, description: 'Christian holiday', day_type: 'holiday', year: currentYear },
      { name: 'Easter Monday', date: `${currentYear}-04-06`, description: 'Christian holiday', day_type: 'holiday', year: currentYear },
      { name: 'Labour Day', date: `${currentYear}-05-01`, description: 'International Workers\' Day', day_type: 'holiday', year: currentYear },
      { name: 'Eid al-Fitr', date: `${currentYear}-05-13`, description: 'Islamic holiday marking end of Ramadan', day_type: 'holiday', year: currentYear },
      { name: 'Martyrs\' Day', date: `${currentYear}-06-03`, description: 'Remembering Ugandan martyrs', day_type: 'holiday', year: currentYear },
      { name: 'National Heroes Day', date: `${currentYear}-06-09`, description: 'Honoring national heroes', day_type: 'holiday', year: currentYear },
      { name: 'Eid al-Adha', date: `${currentYear}-07-20`, description: 'Islamic Festival of Sacrifice', day_type: 'holiday', year: currentYear },
      { name: 'Independence Day', date: `${currentYear}-10-09`, description: 'Uganda Independence Day', day_type: 'holiday', year: currentYear },
      { name: 'Christmas Day', date: `${currentYear}-12-25`, description: 'Christian holiday celebrating birth of Jesus', day_type: 'holiday', year: currentYear },
      { name: 'Boxing Day', date: `${currentYear}-12-26`, description: 'Day after Christmas', day_type: 'holiday', year: currentYear }
    ]

    try {
      for (const holiday of ugandanHolidays) {
        await api.post('/calendar/holidays', holiday)
      }
      toast.success('Ugandan holidays added successfully')
      loadHolidays()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add holidays')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const year = new Date(formData.date).getFullYear()
    const payload = {
      ...formData,
      day_type: 'holiday',
      year
    }
    try {
      if (editingHoliday) {
        await api.put(`/calendar/holidays/${editingHoliday.id}`, payload)
        toast.success('Holiday updated successfully')
      } else {
        await api.post('/calendar/holidays', payload)
        toast.success('Holiday added successfully')
      }
      setModalOpen(false)
      setEditingHoliday(null)
      setFormData({ name: '', date: '', description: '' })
      loadHolidays()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save holiday')
    }
  }

  const handleEdit = (holiday: any) => {
    setEditingHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      description: holiday.description || ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return
    try {
      await api.delete(`/calendar/holidays/${id}`)
      toast.success('Holiday deleted successfully')
      loadHolidays()
    } catch (error) {
      toast.error('Failed to delete holiday')
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎉 Holidays Management</h1>
              <p className="text-gray-600 mt-1">Manage school holidays and non-school days</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={seedUgandanHolidays}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                🇺🇬 Add Ugandan Holidays
              </button>
              <button
                onClick={() => {
                  setEditingHoliday(null)
                  setFormData({ name: '', date: '', description: '' })
                  setModalOpen(true)
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                ➕ Add Holiday
              </button>
            </div>
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
              className="py-3 px-4 rounded-xl text-center font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
            >
              🎉 Holidays
            </Link>
            <Link
              href="/attendance/term-dates"
              className="py-3 px-4 rounded-xl text-center font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📅 Term Dates
            </Link>
          </div>
        </div>

        {/* Holidays List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading holidays...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm p-12 text-center">
            <div className="text-7xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Holidays Added</h3>
            <p className="text-gray-600">Click "Add Holiday" to create your first holiday</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-4xl">🎉</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(holiday)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(holiday.id)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{holiday.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  📅 {format(new Date(holiday.date), 'MMMM d, yyyy')}
                </p>
                {holiday.description && (
                  <p className="text-sm text-gray-500">{holiday.description}</p>
                )}
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
                  {editingHoliday ? '✏️ Edit Holiday' : '➕ Add Holiday'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Holiday Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="e.g., Christmas Day"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      setEditingHoliday(null)
                      setFormData({ name: '', date: '', description: '' })
                    }}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    {editingHoliday ? 'Update' : 'Add'}
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
