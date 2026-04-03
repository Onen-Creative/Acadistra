'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'

import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'

const userSchema = z.object({
  full_name: z.string().min(3),
  email: z.string().email(),
  role: z.enum(['school_admin']),
  school_id: z.string().min(1, 'School is required'),
  password: z.string().min(8),
})

type UserFormData = z.infer<typeof userSchema>

export default function SystemUsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [viewingUser, setViewingUser] = useState<any>(null)
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  })

  const { data: users, isLoading } = useQuery({
    queryKey: ['system-users', searchTerm, roleFilter, currentPage],
    queryFn: () => api.get('/api/v1/users', { 
      params: { 
        search: searchTerm, 
        role: roleFilter,
        page: currentPage,
        limit: 10 // Show 10 users per page
      } 
    }).then(res => res.data),
  })

  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get('/api/v1/schools').then(res => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) => api.post('/api/v1/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
      setIsModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormData }) => 
      api.put(`/api/v1/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
      setIsModalOpen(false)
      setEditingUser(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-users'] }),
  })

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const openEditModal = (user: any) => {
    setEditingUser(user)
    reset(user)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingUser(null)
    reset()
    setIsModalOpen(true)
  }

  const totalPages = Math.ceil((users?.total || 0) / 10)
  const startUser = ((currentPage - 1) * 10) + 1
  const endUser = Math.min(currentPage * 10, users?.total || 0)

  return (
    
      <DashboardLayout>
        <div className="space-y-8">
          <PageHeader 
            title="System Users" 
            subtitle={`Manage all users across all schools (${users?.total || 0} total users)`}
            action={
              <button onClick={openCreateModal} className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                + Create User
              </button>
            }
          />

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="🔍 Search users..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1) // Reset to first page when searching
                  }}
                  className="input flex-1 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                />
                <select 
                  value={roleFilter} 
                  onChange={(e) => {
                    setRoleFilter(e.target.value)
                    setCurrentPage(1) // Reset to first page when filtering
                  }} 
                  className="input w-48 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                >
                  <option value="">All Roles</option>
                  <option value="system_admin">System Admin</option>
                  <option value="school_admin">School Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="bursar">Bursar</option>
                  <option value="librarian">Librarian</option>
                  <option value="nurse">Nurse</option>
                  <option value="storekeeper">Store Keeper</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              {users?.total && (
                <div className="text-sm text-gray-600">
                  Showing {startUser}-{endUser} of {users.total} users
                </div>
              )}
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
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">School</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users?.users?.map((user: any) => (
                        <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                                {user.full_name.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 capitalize">
                              {user.role?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.school_name || 'System'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                              user.is_active ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? '● Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm space-x-3">
                            <button onClick={() => setViewingUser(user)} className="text-green-600 hover:text-green-800 font-semibold">
                              View
                            </button>
                            <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800 font-semibold">
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this user?')) {
                                  deleteMutation.mutate(user.id)
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
                  {users?.users?.map((user: any) => (
                    <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {user.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{user.full_name}</h3>
                          <p className="text-sm text-gray-600 truncate">{user.email}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Role:</span>
                          <span className="text-gray-900 font-medium capitalize">{user.role?.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">School:</span>
                          <span className="text-gray-900 font-medium truncate ml-2">{user.school_name || 'System'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900 font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button onClick={() => setViewingUser(user)} className="flex-1 text-xs py-2 px-3 bg-green-50 text-green-700 rounded-lg font-semibold">
                          View
                        </button>
                        <button onClick={() => openEditModal(user)} className="flex-1 text-xs py-2 px-3 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this user?')) {
                              deleteMutation.mutate(user.id)
                            }
                          }}
                          className="flex-1 text-xs py-2 px-3 bg-red-50 text-red-700 rounded-lg font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {users?.total && users.total > 10 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {viewingUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    User Details
                  </h2>
                  <button onClick={() => setViewingUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl">
                      {viewingUser.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{viewingUser.full_name}</h3>
                      <p className="text-sm text-gray-500">{viewingUser.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Role</label>
                      <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{viewingUser.role?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          viewingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {viewingUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">School</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{viewingUser.school_name || 'System Admin'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Created At</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{new Date(viewingUser.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Updated At</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{new Date(viewingUser.updated_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button onClick={() => setViewingUser(null)} className="btn-secondary">
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
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="label">Full Name *</label>
                    <input {...register('full_name')} className="input" />
                    {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
                  </div>

                  <div>
                    <label className="label">Email *</label>
                    <input {...register('email')} type="email" className="input" />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="label">School *</label>
                    <select {...register('school_id')} className="input">
                      <option value="">Select School</option>
                      {schools?.schools?.map((school: any) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                    {errors.school_id && <p className="text-red-500 text-sm mt-1">{errors.school_id.message}</p>}
                  </div>

                  <div>
                    <label className="label">Password *</label>
                    <input {...register('password')} type="password" className="input" placeholder="Min 8 characters" />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                  </div>

                  <input type="hidden" {...register('role')} value="school_admin" />

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false)
                        setEditingUser(null)
                        reset()
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingUser ? 'Update' : 'Create'}
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
