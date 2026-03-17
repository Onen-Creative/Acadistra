'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { Heart, Activity, AlertCircle, Calendar, Thermometer } from 'lucide-react'

export default function ParentHealthPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [visits, setVisits] = useState<any[]>([])

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) loadHealth()
  }, [selectedChild])

  const loadChildren = async () => {
    try {
      const res = await api.get('/api/v1/parent/dashboard')
      const childrenData = res.data?.children || []
      setChildren(childrenData)
      if (childrenData.length > 0) setSelectedChild(childrenData[0])
    } catch (error) {
      console.error('Load children error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHealth = async () => {
    if (!selectedChild) return
    try {
      const res = await api.get(`/parent/children/${selectedChild.id}/health`)
      setHealth(res.data?.health_profile || null)
      setVisits(res.data?.recent_visits || [])
    } catch (error) {
      console.error('Load health error:', error)
      setHealth(null)
      setVisits([])
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-3xl p-8 shadow-2xl text-white">
          <h1 className="text-4xl font-bold mb-3">Health Records</h1>
          <p className="text-teal-100 text-lg">Monitor your child's health and clinic visits</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
          <select value={selectedChild?.id || ''} onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold">
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.first_name} {child.last_name} - {child.class_name}</option>
            ))}
          </select>
        </div>

        {health ? (
          <>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Health Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-teal-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    <p className="text-sm text-teal-600 font-medium">Blood Group</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{health.blood_group || 'N/A'}</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <p className="text-sm text-orange-600 font-medium">Allergies</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{health.allergies || 'None'}</p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm text-yellow-600 font-medium">Chronic Conditions</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{health.chronic_conditions || 'None'}</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    <p className="text-sm text-purple-600 font-medium">Disabilities</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{health.disabilities || 'None'}</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-600 font-medium">Emergency Contact</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{health.emergency_contact || 'N/A'}</p>
                  <p className="text-xs text-gray-600 mt-1">{health.emergency_phone || ''}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Clinic Visits</h3>
              <div className="space-y-4">
                {visits.map((visit: any) => (
                  <div key={visit.id} className="p-6 rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-bold text-gray-900">{new Date(visit.visit_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Symptoms:</span> {visit.symptoms}</p>
                        {visit.diagnosis && (
                          <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Diagnosis:</span> {visit.diagnosis}</p>
                        )}
                        {visit.treatment && (
                          <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Treatment:</span> {visit.treatment}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {visit.temperature && (
                          <div className="flex items-center gap-1 text-sm">
                            <Thermometer className="w-4 h-4 text-red-500" />
                            <span className="font-semibold">{visit.temperature}°C</span>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          visit.outcome === 'recovered' ? 'bg-green-100 text-green-700' :
                          visit.outcome === 'referred' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {visit.outcome}
                        </span>
                      </div>
                    </div>
                    {visit.notes && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500"><span className="font-semibold">Notes:</span> {visit.notes}</p>
                      </div>
                    )}
                    {visit.parent_notified && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <AlertCircle className="w-3 h-3" />
                          Parent notified
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {visits.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No recent clinic visits</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Health Profile</h3>
            <p className="text-gray-600">No health information available for this child</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
