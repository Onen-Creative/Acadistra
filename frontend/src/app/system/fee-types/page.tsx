'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

interface StandardFeeType {
  id: string
  name: string
  code: string
  category: string
  description: string
  is_compulsory: boolean
  applies_to_levels: {
    levels: string[]
  }
  created_at: string
  updated_at: string
}

export default function StandardFeeTypesPage() {
  const [feeTypes, setFeeTypes] = useState<StandardFeeType[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [compulsoryFilter, setCompulsoryFilter] = useState('')

  useEffect(() => {
    loadFeeTypes()
  }, [])

  const loadFeeTypes = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/v1/standard-fee-types')
      setFeeTypes(response.data.fee_types || [])
    } catch (error) {
      console.error('Failed to load standard fee types:', error)
      toast.error('Failed to load standard fee types')
    } finally {
      setLoading(false)
    }
  }

  const seedFeeTypes = async () => {
    try {
      await api.post('/api/v1/seed-fee-types')
      toast.success('Standard fee types seeded successfully')
      loadFeeTypes()
    } catch (error) {
      console.error('Failed to seed fee types:', error)
      toast.error('Failed to seed fee types')
    }
  }

  // Get unique categories and levels
  const categories = Array.from(new Set(feeTypes.map(ft => ft.category))).sort()
  const allLevels = Array.from(new Set(feeTypes.flatMap(ft => ft.applies_to_levels?.levels || []))).sort()

  // Filter fee types
  const filteredFeeTypes = feeTypes.filter(ft => {
    if (categoryFilter && ft.category !== categoryFilter) return false
    if (levelFilter && !ft.applies_to_levels?.levels?.includes(levelFilter)) return false
    if (compulsoryFilter === 'compulsory' && !ft.is_compulsory) return false
    if (compulsoryFilter === 'optional' && ft.is_compulsory) return false
    return true
  })

  // Group by category
  const groupedFeeTypes = categories.reduce((acc, category) => {
    acc[category] = filteredFeeTypes.filter(ft => ft.category === category)
    return acc
  }, {} as Record<string, StandardFeeType[]>)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Standard Fee Types</h1>
          <button
            onClick={seedFeeTypes}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Reseed Fee Types
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Levels</option>
              {allLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <select
              value={compulsoryFilter}
              onChange={(e) => setCompulsoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="compulsory">Compulsory Only</option>
              <option value="optional">Optional Only</option>
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredFeeTypes.length} of {feeTypes.length} fee types
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600">Total Fee Types</p>
            <p className="text-2xl font-bold text-blue-700">{feeTypes.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600">Compulsory</p>
            <p className="text-2xl font-bold text-green-700">
              {feeTypes.filter(ft => ft.is_compulsory).length}
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Optional</p>
            <p className="text-2xl font-bold text-yellow-700">
              {feeTypes.filter(ft => !ft.is_compulsory).length}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600">Categories</p>
            <p className="text-2xl font-bold text-purple-700">{categories.length}</p>
          </div>
        </div>

        {/* Fee Types by Category */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFeeTypes).map(([category, categoryFeeTypes]) => (
              categoryFeeTypes.length > 0 && (
                <div key={category} className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category} ({categoryFeeTypes.length})
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryFeeTypes.map((feeType) => (
                        <div
                          key={feeType.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{feeType.name}</h4>
                            {feeType.is_compulsory && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                Compulsory
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{feeType.code}</p>
                          {feeType.description && (
                            <p className="text-sm text-gray-700 mb-3">{feeType.description}</p>
                          )}
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Applies to:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {feeType.applies_to_levels?.levels?.map((level) => (
                                  <span
                                    key={level}
                                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                  >
                                    {level}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {filteredFeeTypes.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No fee types found matching the current filters
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}