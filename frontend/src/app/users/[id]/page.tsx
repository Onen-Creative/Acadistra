'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { FormCard } from '@/components/ui/FormComponents'
import api from '@/services/api'

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const { data: user, isLoading } = useQuery({
    queryKey: ['school-user', userId],
    queryFn: async () => {
      const res = await api.get(`/school-users/${userId}`)
      return res.data
    },
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    )
  }

  const roleColors: any = {
    teacher: 'from-blue-500 to-blue-700',
    bursar: 'from-green-500 to-green-700',
    librarian: 'from-purple-500 to-purple-700',
    nurse: 'from-pink-500 to-pink-700',
    store_keeper: 'from-orange-500 to-orange-700',
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title={user?.full_name || 'User Details'} 
          subtitle={`${user?.role?.replace('_', ' ').toUpperCase()} • ${user?.email}`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FormCard>
              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b-2 border-gray-200">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${roleColors[user?.role] || 'from-gray-500 to-gray-700'} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{user?.full_name}</h2>
                    <p className="text-gray-600">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-1">Role</label>
                    <p className="text-lg font-medium text-gray-800 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user?.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-1">Created At</label>
                    <p className="text-lg font-medium text-gray-800">{new Date(user?.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-1">Last Updated</label>
                    <p className="text-lg font-medium text-gray-800">{new Date(user?.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </FormCard>
          </div>

          <div className="space-y-4">
            <FormCard className="bg-gradient-to-br from-blue-50 to-indigo-50">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/users')}
                  className="w-full px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:shadow-lg transition-all duration-300"
                >
                  ⬅️ Back to Users
                </button>
              </div>
            </FormCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
