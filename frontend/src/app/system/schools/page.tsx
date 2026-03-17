'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'

import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const queryClient = useQueryClient()

  const getLogoUrl = (logoUrl: string | null | undefined) => {
    if (!logoUrl) return ''
    if (logoUrl.startsWith('http') || logoUrl.startsWith('blob:')) return logoUrl
    return `http://localhost:8080${logoUrl}`
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
                            <button onClick={() => setViewingSchool(school)} className="text-green-600 hover:text-green-800 font-semibold">
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
                        <button onClick={() => setViewingSchool(school)} className="flex-1 text-xs py-2 px-3 bg-green-50 text-green-700 rounded-lg font-semibold">
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

          {viewingSchool && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    School Details
                  </h2>
                  <button onClick={() => setViewingSchool(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b">
                    {viewingSchool.logo_url ? (
                      <img src={getLogoUrl(viewingSchool.logo_url)} alt="School Logo" className="w-16 h-16 rounded-full object-contain border-2 border-gray-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                        {viewingSchool.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{viewingSchool.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{viewingSchool.type || viewingSchool.school_type?.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">School Type</label>
                      <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{(viewingSchool.type || viewingSchool.school_type || 'N/A').replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          viewingSchool.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {viewingSchool.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Country</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{viewingSchool.country || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Region</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{viewingSchool.region || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{viewingSchool.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{viewingSchool.contact_email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{viewingSchool.phone || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Motto</label>
                      <p className="text-sm font-medium text-gray-900 mt-1 italic">{viewingSchool.motto || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Created At</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{new Date(viewingSchool.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Updated At</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{new Date(viewingSchool.updated_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button onClick={() => setViewingSchool(null)} className="btn-secondary">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {editingSchool ? 'Edit School' : 'Create New School'}
                </h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="label">School Name *</label>
                    <input {...register('name')} className="input" />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="label">School Type *</label>
                    <select {...register('school_type')} className="input">
                      <option value="">Select type</option>
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
                    {errors.school_type && <p className="text-red-500 text-sm mt-1">{errors.school_type.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Country</label>
                      <input {...register('country')} className="input" defaultValue="Uganda" />
                    </div>
                    <div>
                      <label className="label">Region</label>
                      <input {...register('region')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Address</label>
                    <textarea {...register('address')} className="input" rows={2} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Email</label>
                      <input {...register('contact_email')} type="email" className="input" />
                      {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email.message}</p>}
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input {...register('phone')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Motto</label>
                    <input {...register('motto')} className="input" />
                  </div>

                  <div>
                    <label className="label">School Logo</label>
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
                      className="input"
                    />
                    {logoPreview && (
                      <div className="mt-2">
                        <img src={getLogoUrl(logoPreview)} alt="Logo preview" className="h-20 w-20 object-contain border rounded" />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false)
                        setEditingSchool(null)
                        setLogoFile(null)
                        setLogoPreview('')
                        reset()
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingSchool ? 'Update' : 'Create'}
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
