'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { PageHeader } from '@/components/ui/BeautifulComponents'

const schoolSchema = z.object({
  name: z.string().min(3),
  school_type: z.string().min(1),
  address: z.string().optional(),
  country: z.string().min(1),
  region: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  motto: z.string().optional(),
  logo_url: z.string().optional(),
})

type SchoolFormData = z.infer<typeof schoolSchema>

export default function CreateSchoolPage() {
  const router = useRouter()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const { register, handleSubmit, formState: { errors } } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { country: 'Uganda' },
  })

  const createMutation = useMutation({
    mutationFn: async (data: SchoolFormData) => {
      let logoUrl = ''
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const uploadRes = await api.post('/upload/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        logoUrl = uploadRes.data.logo_url
      }
      return api.post('/schools', { ...data, logo_url: logoUrl })
    },
    onSuccess: () => router.push('/system/schools'),
  })

  return (
    
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <PageHeader 
            title="Create New School" 
            description="Register a new school in the system"
            icon="🏫"
          />

          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🏫 School Name *</label>
                <input {...register('name')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" placeholder="Enter school name" />
                {errors.name && <p className="text-red-500 text-sm mt-2 flex items-center gap-1">⚠️ {errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🎯 School Type *</label>
                <select {...register('school_type')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
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
                {errors.school_type && <p className="text-red-500 text-sm mt-2 flex items-center gap-1">⚠️ {errors.school_type.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🌍 Country</label>
                  <input {...register('country')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Region</label>
                  <input {...register('region')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" placeholder="e.g., Central, Western" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Address</label>
                <textarea {...register('address')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" rows={3} placeholder="Full address" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📧 Contact Email</label>
                  <input {...register('contact_email')} type="email" className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                  {errors.contact_email && <p className="text-red-500 text-sm mt-2 flex items-center gap-1">⚠️ {errors.contact_email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📞 Phone</label>
                  <input {...register('phone')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" placeholder="+256..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">✨ School Motto</label>
                <input {...register('motto')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" placeholder="e.g., Excellence in Education" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🖼️ School Logo</label>
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                {logoPreview && (
                  <div className="mt-3">
                    <img src={logoPreview} alt="Logo preview" className="h-24 w-24 object-contain border-2 border-gray-200 rounded-lg p-2" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button type="button" onClick={() => router.back()} className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 transition-all duration-300 hover:shadow-lg">
                ❌ Cancel
              </button>
              <button type="submit" disabled={createMutation.isPending} className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {createMutation.isPending ? '⏳ Creating...' : '✅ Create School'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    
  )
}
