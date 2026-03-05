'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import api from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, StatCard } from '@/components/ui/BeautifulComponents'
import { FormInput, FormSelect, FormCard, FormActions } from '@/components/ui/FormComponents'
import Link from 'next/link'

const userSchema = z.object({
  email: z.string().email('Invalid email'),
  full_name: z.string().min(2, 'Name required'),
  role: z.enum(['teacher', 'bursar', 'librarian', 'nurse', 'store_keeper']),
  password: z.string().min(8, 'Min 8 characters').optional(),
  is_active: z.boolean(),
})

type UserForm = z.infer<typeof userSchema>

export default function UsersPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { is_active: true }
  })

  const { data: users, isLoading } = useQuery({
    queryKey: ['school-users', roleFilter],
    queryFn: async () => {
      const res = await api.get('/school-users', { params: { role: roleFilter } })
      return res.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: UserForm) => 
      editingUser 
        ? api.put(`/school-users/${editingUser.id}`, data)
        : api.post('/school-users', data),
    onSuccess: () => {
      notifications.show({ 
        title: 'Success', 
        message: `User ${editingUser ? 'updated' : 'created'}`, 
        color: 'green' 
      })
      queryClient.invalidateQueries({ queryKey: ['school-users'] })
      setCreateModalOpen(false)
      setEditingUser(null)
      reset()
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to save user', color: 'red' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/school-users/${id}`),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'User deleted', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['school-users'] })
    }
  })

  const onSubmit = (data: UserForm) => createMutation.mutate(data)

  const openEditModal = (user: any) => {
    setEditingUser(user)
    setValue('email', user.email)
    setValue('full_name', user.full_name)
    setValue('role', user.role)
    setValue('is_active', user.is_active)
    setCreateModalOpen(true)
  }

  const roles = [
    { value: 'teacher', label: 'Teacher' },
    { value: 'bursar', label: 'Bursar' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'store_keeper', label: 'Store Keeper' },
  ]

  const filteredUsers = users?.filter((user: any) => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const stats = {
    total: users?.length || 0,
    active: users?.filter((u: any) => u.is_active).length || 0,
    teachers: users?.filter((u: any) => u.role === 'teacher').length || 0,
    staff: users?.filter((u: any) => u.role !== 'teacher').length || 0,
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="User Management" 
          subtitle="Manage school staff and their access"
          action={
            <button
              onClick={() => { setEditingUser(null); reset(); setCreateModalOpen(true) }}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              ➕ Add User
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard title="Total Users" value={stats.total} icon="👥" gradient="from-blue-500 to-blue-700" />
          <StatCard title="Active" value={stats.active} icon="✅" gradient="from-green-500 to-green-700" />
          <StatCard title="Teachers" value={stats.teachers} icon="👨‍🏫" gradient="from-purple-500 to-purple-700" />
          <StatCard title="Staff" value={stats.staff} icon="👔" gradient="from-orange-500 to-orange-700" />
        </div>

        <FormCard>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
            >
              <option value="">All Roles</option>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/users/${user.id}`}
                          className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium"
                        >
                          👁️ View
                        </Link>
                        <button
                          onClick={() => openEditModal(user)}
                          className="px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this user?')) deleteMutation.mutate(user.id)
                          }}
                          className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormCard>

        {createModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">{editingUser ? '✏️ Edit User' : '➕ Add New User'}</h2>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <FormInput
                  {...register('full_name')}
                  label="Full Name"
                  icon="👤"
                  required
                  error={errors.full_name?.message}
                  placeholder="John Doe"
                />
                <FormInput
                  {...register('email')}
                  type="email"
                  label="Email"
                  icon="📧"
                  required
                  error={errors.email?.message}
                  placeholder="user@school.ug"
                />
                <FormSelect
                  {...register('role')}
                  label="Role"
                  icon="💼"
                  required
                  error={errors.role?.message}
                  options={[{ value: '', label: 'Select Role' }, ...roles]}
                />
                {!editingUser && (
                  <FormInput
                    {...register('password')}
                    type="password"
                    label="Password"
                    icon="🔒"
                    required
                    error={errors.password?.message}
                    placeholder="Min 8 characters"
                  />
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={watch('is_active')}
                    onChange={(e) => setValue('is_active', e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-300"
                  />
                  <label className="text-sm font-semibold text-gray-700">Active User</label>
                </div>
                <FormActions
                  onCancel={() => { setCreateModalOpen(false); setEditingUser(null); reset() }}
                  submitText={editingUser ? 'Update User' : 'Create User'}
                  isLoading={createMutation.isPending}
                  loadingText={editingUser ? 'Updating...' : 'Creating...'}
                />
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
