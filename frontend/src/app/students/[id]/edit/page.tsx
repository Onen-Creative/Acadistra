'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import { useForm } from 'react-hook-form'
import { notifications } from '@mantine/notifications'
import { FileInput } from '@mantine/core'
import { uploadStudentPhoto } from '@/utils/upload'
import { useState } from 'react'

const FormInput = ({ label, error, required, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const FormSelect = ({ label, options, error, required, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const FormTextarea = ({ label, error, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <textarea
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

export default function EditStudentPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const studentId = params.id as string
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}`)
      return res.data.student
    },
  })

  const { data: guardiansData } = useQuery({
    queryKey: ['guardians', studentId],
    queryFn: async () => {
      const res = await api.get(`/guardians?student_id=${studentId}`)
      return res.data.guardians || []
    },
    enabled: !!studentId
  })

  const { register, handleSubmit, formState: { errors } } = useForm({
    values: studentData ? {
      first_name: studentData.first_name || '',
      middle_name: studentData.middle_name || '',
      last_name: studentData.last_name || '',
      date_of_birth: studentData.date_of_birth ? studentData.date_of_birth.split('T')[0] : '',
      gender: studentData.gender || '',
      nationality: studentData.nationality || '',
      religion: studentData.religion || '',
      lin: studentData.lin || '',
      schoolpay_code: studentData.schoolpay_code || '',
      email: studentData.email || '',
      phone: studentData.phone || '',
      address: studentData.address || '',
      district: studentData.district || '',
      village: studentData.village || '',
      residence_type: studentData.residence_type || '',
      previous_school: studentData.previous_school || '',
      previous_class: studentData.previous_class || '',
      special_needs: studentData.special_needs || '',
      disability_status: studentData.disability_status || '',
      status: studentData.status || 'active',
      guardian_full_name: guardiansData?.[0]?.full_name || '',
      guardian_phone: guardiansData?.[0]?.phone || '',
      guardian_email: guardiansData?.[0]?.email || '',
      guardian_relationship: guardiansData?.[0]?.relationship || '',
      guardian_occupation: guardiansData?.[0]?.occupation || '',
      guardian_address: guardiansData?.[0]?.address || '',
      guardian_nin: guardiansData?.[0]?.nin || '',
      guardian2_full_name: guardiansData?.[1]?.full_name || '',
      guardian2_phone: guardiansData?.[1]?.phone || '',
      guardian2_email: guardiansData?.[1]?.email || '',
      guardian2_relationship: guardiansData?.[1]?.relationship || '',
      guardian2_occupation: guardiansData?.[1]?.occupation || '',
      guardian2_address: guardiansData?.[1]?.address || '',
      guardian2_nin: guardiansData?.[1]?.nin || '',
    } : undefined
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/students/${studentId}`, data),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Student updated successfully', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push(`/students/${studentId}`)
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to update student', color: 'red' })
    }
  })

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setPhotoPreview(null)
    }
  }

  const onSubmit = async (data: any) => {
    let photoUrl = data.photo_url || ''
    
    if (photoFile) {
      try {
        const result = await uploadStudentPhoto(photoFile)
        if (result.photo_url) photoUrl = result.photo_url
      } catch (error) {
        console.error('Photo upload failed:', error)
        notifications.show({ 
          title: 'Warning', 
          message: 'Photo upload failed, but student will be updated without new photo', 
          color: 'yellow' 
        })
      }
    }
    
    const studentData = {
      first_name: data.first_name,
      middle_name: data.middle_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      nationality: data.nationality,
      religion: data.religion,
      lin: data.lin,
      schoolpay_code: data.schoolpay_code,
      email: data.email,
      phone: data.phone,
      address: data.address,
      district: data.district,
      village: data.village,
      residence_type: data.residence_type,
      previous_school: data.previous_school,
      previous_class: data.previous_class,
      special_needs: data.special_needs,
      disability_status: data.disability_status,
      status: data.status,
      photo_url: photoUrl
    }
    
    updateMutation.mutate(studentData)
    
    if (data.guardian_full_name && data.guardian_phone) {
      const guardian1Data = {
        student_id: studentId,
        full_name: data.guardian_full_name,
        phone: data.guardian_phone,
        email: data.guardian_email,
        relationship: data.guardian_relationship,
        occupation: data.guardian_occupation,
        address: data.guardian_address,
        nin: data.guardian_nin
      }
      
      try {
        if (guardiansData?.[0]?.id) {
          await api.put(`/guardians/${guardiansData[0].id}`, guardian1Data)
        } else {
          await api.post('/guardians', guardian1Data)
        }
      } catch (error) {
        console.error('Guardian 1 update failed:', error)
      }
    }
    
    if (data.guardian2_full_name && data.guardian2_phone) {
      const guardian2Data = {
        student_id: studentId,
        full_name: data.guardian2_full_name,
        phone: data.guardian2_phone,
        email: data.guardian2_email,
        relationship: data.guardian2_relationship,
        occupation: data.guardian2_occupation,
        address: data.guardian2_address,
        nin: data.guardian2_nin
      }
      
      try {
        if (guardiansData?.[1]?.id) {
          await api.put(`/guardians/${guardiansData[1].id}`, guardian2Data)
        } else {
          await api.post('/guardians', guardian2Data)
        }
      } catch (error) {
        console.error('Guardian 2 update failed:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Student</h1>
              <p className="text-sm text-gray-500">{studentData?.first_name} {studentData?.last_name}</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span> Personal Information
            </h2>
            <div className="flex flex-col items-center mb-6 p-4 bg-gray-50 rounded-lg">
              {(photoPreview || studentData?.photo_url) && (
                <img 
                  src={photoPreview || studentData?.photo_url} 
                  alt="Student" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-3" 
                />
              )}
              <FileInput
                placeholder="Upload new photo"
                accept="image/*"
                value={photoFile}
                onChange={handlePhotoChange}
                className="w-full max-w-sm"
              />
              <p className="text-xs text-gray-500 mt-2">Max 10MB • JPG, PNG</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput {...register('first_name', { required: 'Required' })} label="First Name" required error={errors.first_name?.message as string} />
              <FormInput {...register('middle_name')} label="Middle Name" />
              <FormInput {...register('last_name', { required: 'Required' })} label="Last Name" required error={errors.last_name?.message as string} />
              <FormInput {...register('date_of_birth')} type="date" label="Date of Birth" />
              <FormSelect {...register('gender', { required: 'Required' })} label="Gender" required error={errors.gender?.message as string} options={[
                { value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }
              ]} />
              <FormInput {...register('nationality')} label="Nationality" placeholder="Ugandan" />
              <FormInput {...register('religion')} label="Religion" />
              <FormInput {...register('lin')} label="LIN" placeholder="Learner ID" />
              <FormInput {...register('schoolpay_code')} label="SchoolPay Code" placeholder="SchoolPay Code" />
              <FormSelect {...register('status')} label="Status" options={[
                { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' },
                { value: 'graduated', label: 'Graduated' }, { value: 'transferred', label: 'Transferred' }, { value: 'withdrawn', label: 'Withdrawn' }
              ]} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📞</span> Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput {...register('email')} type="email" label="Email" placeholder="student@example.com" />
              <FormInput {...register('phone')} label="Phone" placeholder="+256..." />
              <FormInput {...register('district')} label="District" />
              <FormInput {...register('village')} label="Village" />
              <FormSelect {...register('residence_type')} label="Residence Type" options={[
                { value: '', label: 'Select' }, { value: 'Day', label: 'Day Scholar' }, { value: 'Boarding', label: 'Boarding' }
              ]} />
              <div className="md:col-span-2">
                <FormTextarea {...register('address')} label="Full Address" rows={2} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎒</span> Previous Education
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput {...register('previous_school')} label="Previous School" />
              <FormInput {...register('previous_class')} label="Previous Class" placeholder="P7, S3, etc." />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏥</span> Health & Special Needs
            </h2>
            <div className="space-y-4">
              <FormTextarea {...register('special_needs')} label="Special Educational Needs" rows={3} />
              <FormTextarea {...register('disability_status')} label="Medical Conditions" rows={3} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">👨👩👧</span> Primary Guardian
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput {...register('guardian_full_name')} label="Full Name" />
              <FormInput {...register('guardian_phone')} label="Phone" placeholder="+256..." />
              <FormInput {...register('guardian_email')} type="email" label="Email" />
              <FormSelect {...register('guardian_relationship')} label="Relationship" options={[
                { value: '', label: 'Select' }, { value: 'Father', label: 'Father' }, { value: 'Mother', label: 'Mother' },
                { value: 'Guardian', label: 'Guardian' }, { value: 'Uncle', label: 'Uncle' }, { value: 'Aunt', label: 'Aunt' },
                { value: 'Grandparent', label: 'Grandparent' }, { value: 'Sibling', label: 'Sibling' }, { value: 'Other', label: 'Other' }
              ]} />
              <FormInput {...register('guardian_occupation')} label="Occupation" />
              <FormInput {...register('guardian_nin')} label="National ID (NIN)" />
              <div className="md:col-span-2">
                <FormTextarea {...register('guardian_address')} label="Address" rows={2} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">👨👩👧👦</span> Secondary Guardian (Optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput {...register('guardian2_full_name')} label="Full Name" />
              <FormInput {...register('guardian2_phone')} label="Phone" placeholder="+256..." />
              <FormInput {...register('guardian2_email')} type="email" label="Email" />
              <FormSelect {...register('guardian2_relationship')} label="Relationship" options={[
                { value: '', label: 'Select' }, { value: 'Father', label: 'Father' }, { value: 'Mother', label: 'Mother' },
                { value: 'Guardian', label: 'Guardian' }, { value: 'Uncle', label: 'Uncle' }, { value: 'Aunt', label: 'Aunt' },
                { value: 'Grandparent', label: 'Grandparent' }, { value: 'Sibling', label: 'Sibling' }, { value: 'Other', label: 'Other' }
              ]} />
              <FormInput {...register('guardian2_occupation')} label="Occupation" />
              <FormInput {...register('guardian2_nin')} label="National ID (NIN)" />
              <div className="md:col-span-2">
                <FormTextarea {...register('guardian2_address')} label="Address" rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Student'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
