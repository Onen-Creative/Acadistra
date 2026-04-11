'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'

import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { getImageUrl } from '@/utils/imageUrl'

const schoolSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  school_type: z.string().min(1, 'School type is required'),
  address: z.string().optional(),
  country: z.string().min(1),
  region: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  motto: z.string().optional(),
  logo_url: z.string().optional(),
})

type SchoolFormData = z.infer<typeof schoolSchema>

export default function SchoolsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<any>(null)
  const [viewingSchool, setViewingSchool] = useState<any>(null)
  const [schoolDetails, setSchoolDetails] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const queryClient = useQueryClient()

  const getLogoUrl = (logoUrl: string | null | undefined) => {
    if (!logoUrl) return ''
    if (logoUrl.startsWith('blob:')) return logoUrl // For preview images
    return getImageUrl(logoUrl)
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
  })

  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools', searchTerm],
    queryFn: () => api.get('/api/v1/schools', { params: { search: searchTerm } }).then(res => res.data),
  })

  const createMutation = useMutation({
    mutationFn: async (data: SchoolFormData) => {
      let logoUrl = data.logo_url
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const uploadRes = await api.post('/api/v1/upload/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        logoUrl = uploadRes.data.logo_url
      }
      return api.post('/api/v1/schools', { ...data, logo_url: logoUrl })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setIsModalOpen(false)
      setLogoFile(null)
      setLogoPreview('')
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SchoolFormData }) => {
      let logoUrl = data.logo_url
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const uploadRes = await api.post('/api/v1/upload/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        logoUrl = uploadRes.data.logo_url
      }
      return api.put(`/api/v1/schools/${id}`, { ...data, logo_url: logoUrl })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setIsModalOpen(false)
      setEditingSchool(null)
      setLogoFile(null)
      setLogoPreview('')
      reset()
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/schools/${id}/toggle-active`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schools'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/schools/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schools'] }),
  })

  const onSubmit = (data: SchoolFormData) => {
    if (editingSchool) {
      updateMutation.mutate({ id: editingSchool.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const openEditModal = (school: any) => {
    setEditingSchool(school)
    setLogoPreview(school.logo_url || '')
    reset({
      name: school.name,
      school_type: school.type || school.school_type,
      address: school.address || '',
      country: school.country || 'Uganda',
      region: school.region || '',
      contact_email: school.contact_email || '',
      phone: school.phone || '',
      motto: school.motto || '',
      logo_url: school.logo_url || '',
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingSchool(null)
    setLogoFile(null)
    setLogoPreview('')
    reset({
      name: '',
      school_type: '',
      address: '',
      country: 'Uganda',
      region: '',
      contact_email: '',
      phone: '',
      motto: '',
      logo_url: '',
    })
    setIsModalOpen(true)
  }

  const openViewModal = async (school: any) => {
    setViewingSchool(school)
    try {
      const res = await api.get(`/api/v1/schools/${school.id}`)
      setSchoolDetails(res.data)
    } catch (error) {
      console.error('Failed to fetch school details:', error)
      setSchoolDetails(school)
    }
  }

  return (
    
      <DashboardLayout>
        <div className="space-y-8">
          <PageHeader 
            title="Schools Management" 
            subtitle="Manage all registered schools"
            action={
              <button onClick={openCreateModal} className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                + Create School
              </button>
            }
          />

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full max-w-md border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              />
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {schools?.schools?.map((school: any) => (
                        <tr key={school.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {school.logo_url ? (
                                <img src={getLogoUrl(school.logo_url)} alt="Logo" className="w-10 h-10 rounded-full object-contain mr-3" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                                  {school.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-semibold text-gray-900">{school.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 capitalize">{school.type || school.school_type?.replace('_', ' ')}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{school.region || school.country}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{school.phone || school.contact_email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                              school.is_active ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-red-100 text-red-800'
                            }`}>
                              {school.is_active ? '● Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm space-x-3">
                            <button onClick={() => openViewModal(school)} className="text-green-600 hover:text-green-800 font-semibold">
                              View
                            </button>
                            <button onClick={() => openEditModal(school)} className="text-blue-600 hover:text-blue-800 font-semibold">
                              Edit
                            </button>
                            <button 
                              onClick={() => toggleActiveMutation.mutate(school.id)}
                              className="text-orange-600 hover:text-orange-800 font-semibold"
                            >
                              {school.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this school?')) {
                                  deleteMutation.mutate(school.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800 font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {schools?.schools?.map((school: any) => (
                    <div key={school.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start gap-3 mb-3">
                        {school.logo_url ? (
                          <img src={getLogoUrl(school.logo_url)} alt="Logo" className="w-12 h-12 rounded-full object-contain flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {school.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{school.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{school.type || school.school_type?.replace('_', ' ')}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
                          school.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {school.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span className="text-gray-900 font-medium">{school.region || school.country}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Contact:</span>
                          <span className="text-gray-900 font-medium truncate ml-2">{school.phone || school.contact_email}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button onClick={() => openViewModal(school)} className="flex-1 text-xs py-2 px-3 bg-green-50 text-green-700 rounded-lg font-semibold">
                          View
                        </button>
                        <button onClick={() => openEditModal(school)} className="flex-1 text-xs py-2 px-3 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                          Edit
                        </button>
                        <button 
                          onClick={() => toggleActiveMutation.mutate(school.id)}
                          className="flex-1 text-xs py-2 px-3 bg-orange-50 text-orange-700 rounded-lg font-semibold"
                        >
                          {school.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this school?')) {
                              deleteMutation.mutate(school.id)
                            }
                          }}
                          className="text-xs py-2 px-3 bg-red-50 text-red-700 rounded-lg font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {viewingSchool && schoolDetails && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl">
                {/* Header with gradient background */}
                <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-8 pb-20">
                  <button 
                    onClick={() => { setViewingSchool(null); setSchoolDetails(null); }} 
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:rotate-90 duration-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center gap-6">
                    {viewingSchool.logo_url ? (
                      <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-xl">
                        <img src={getLogoUrl(viewingSchool.logo_url)} alt="School Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                        <span className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {viewingSchool.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">{viewingSchool.name}</h2>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium capitalize">
                          {(viewingSchool.type || viewingSchool.school_type || '').replace(/_/g, ' ')}
                        </span>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                          viewingSchool.is_active 
                            ? 'bg-green-400/90 text-white' 
                            : 'bg-red-400/90 text-white'
                        }`}>
                          {viewingSchool.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Overlapping header */}
                <div className="relative -mt-12 px-8 mb-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900">{schoolDetails.user_count || 0}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-600">Total Users</div>
                      <div className="mt-2 text-xs text-gray-500">System accounts</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900">{schoolDetails.staff_count || 0}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-600">Active Staff</div>
                      <div className="mt-2 text-xs text-gray-500">Teaching & non-teaching</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900">{schoolDetails.student_count || 0}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-600">Active Students</div>
                      <div className="mt-2 text-xs text-gray-500">Currently enrolled</div>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="px-8 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 320px)' }}>
                  {/* School Information */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      School Information
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Country</div>
                        <div className="text-base font-semibold text-gray-900">{viewingSchool.country || 'N/A'}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Region</div>
                        <div className="text-base font-semibold text-gray-900">{viewingSchool.region || 'N/A'}</div>
                      </div>
                      <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Address</div>
                        <div className="text-base font-semibold text-gray-900">{viewingSchool.address || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Contact Details
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</div>
                        <div className="text-base font-semibold text-gray-900 break-all">{viewingSchool.contact_email || 'N/A'}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</div>
                        <div className="text-base font-semibold text-gray-900">{viewingSchool.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        School Motto
                      </h3>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-base font-medium text-gray-900 italic">
                          {viewingSchool.motto || 'No motto set'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Timestamps
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-white rounded-xl p-3 shadow-sm">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Created</div>
                          <div className="text-sm font-medium text-gray-900">{new Date(viewingSchool.created_at).toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 shadow-sm">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Last Updated</div>
                          <div className="text-sm font-medium text-gray-900">{new Date(viewingSchool.updated_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 sticky bottom-0 bg-white">
                    <button 
                      onClick={() => openEditModal(viewingSchool)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
                    >
                      Edit School
                    </button>
                    <button 
                      onClick={() => { setViewingSchool(null); setSchoolDetails(null); }} 
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {editingSchool ? 'Edit School' : 'Create New School'}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Fill in the details below to {editingSchool ? 'update' : 'register'} the school</p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 180px)' }}>
                  <div className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Basic Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">School Name *</label>
                          <input 
                            {...register('name')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            placeholder="Enter school name"
                          />
                          {errors.name && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.name.message}
                          </p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">School Type *</label>
                          <select 
                            {...register('school_type')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                          >
                            <option value="">Select school type</option>
                            <option value="nursery">Nursery</option>
                            <option value="primary">Primary</option>
                            <option value="ordinary">Ordinary (S1-S4)</option>
                            <option value="advanced">Advanced (S5-S6)</option>
                            <option value="nursery_primary">Nursery & Primary</option>
                            <option value="primary_ordinary">Primary & Ordinary</option>
                            <option value="ordinary_advanced">Ordinary & Advanced</option>
                            <option value="nursery_primary_ordinary">Nursery, Primary & Ordinary</option>
                            <option value="primary_ordinary_advanced">Primary, Ordinary & Advanced</option>
                            <option value="nursery_primary_ordinary_advanced">All Levels</option>
                          </select>
                          {errors.school_type && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.school_type.message}
                          </p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">School Motto</label>
                          <input 
                            {...register('motto')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            placeholder="Enter school motto"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location Information */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                          <input 
                            {...register('country')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                            placeholder="Uganda"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Region</label>
                          <input 
                            {...register('region')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                            placeholder="Enter region"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                          <textarea 
                            {...register('address')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none resize-none"
                            rows={3}
                            placeholder="Enter full address"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                          <input 
                            {...register('contact_email')} 
                            type="email"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                            placeholder="school@example.com"
                          />
                          {errors.contact_email && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.contact_email.message}
                          </p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                          <input 
                            {...register('phone')} 
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                            placeholder="+256 XXX XXX XXX"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        School Logo
                      </h3>
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Logo</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setLogoFile(file)
                                setLogoPreview(URL.createObjectURL(file))
                              }
                            }}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 file:font-semibold hover:file:bg-orange-200"
                          />
                          <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB</p>
                        </div>
                        {logoPreview && (
                          <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl border-2 border-gray-200 bg-white p-2 shadow-sm">
                              <img src={getLogoUrl(logoPreview)} alt="Logo preview" className="w-full h-full object-contain" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Sticky */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false)
                        setEditingSchool(null)
                        setLogoFile(null)
                        setLogoPreview('')
                        reset()
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingSchool ? 'Update School' : 'Create School'}
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
