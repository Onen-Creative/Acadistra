'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { studentsApi, classesApi, schoolsApi } from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import { FileInput } from '@mantine/core'
import { uploadStudentPhoto } from '@/utils/upload'

const studentSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Required'),
  date_of_birth: z.string().min(1, 'Required'),
  gender: z.enum(['Male', 'Female']),
  nationality: z.string().min(1, 'Required'),
  religion: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  residence_type: z.enum(['Day', 'Boarding']),
  lin: z.string().optional(),
  class_level: z.string().min(1, 'Required'),
  class_id: z.string().min(1, 'Required'),
  year: z.number().min(2020).max(2030),
  term: z.string().min(1, 'Required'),
  previous_school: z.string().optional(),
  previous_class: z.string().optional(),
  special_needs: z.string().optional(),
  disability_status: z.string().optional(),
  guardian_relationship: z.string().min(1, 'Required'),
  guardian_full_name: z.string().min(1, 'Required'),
  guardian_phone: z.string().min(1, 'Required'),
  guardian_alternative_phone: z.string().optional(),
  guardian_email: z.string().email().optional().or(z.literal('')),
  guardian_occupation: z.string().optional(),
  guardian_address: z.string().optional(),
})

type StudentForm = z.infer<typeof studentSchema>

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

export default function StudentRegistrationPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nationality: 'Ugandan',
      residence_type: 'Day',
      year: 2026,
      term: 'Term 1',
      gender: 'Male',
    },
  })

  const selectedLevel = watch('class_level')

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await classesApi.list()
      return Array.isArray(response) ? { classes: response } : response
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: levelsData } = useQuery({
    queryKey: ['school-levels'],
    queryFn: () => schoolsApi.getLevels(),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => studentsApi.create(data),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Student registered', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push('/students')
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed', color: 'red' })
    },
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

  const onSubmit = async (data: StudentForm) => {
    let photoUrl = ''
    
    if (photoFile) {
      try {
        const result = await uploadStudentPhoto(photoFile)
        if (result.photo_url) photoUrl = result.photo_url
      } catch (error) {
        console.error('Photo upload failed:', error)
        notifications.show({ 
          title: 'Warning', 
          message: 'Photo upload failed, but student will be registered without photo', 
          color: 'yellow' 
        })
      }
    }

    const payload = {
      first_name: data.first_name,
      middle_name: data.middle_name || '',
      last_name: data.last_name,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      nationality: data.nationality,
      religion: data.religion || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      district: data.district || '',
      village: data.village || '',
      residence_type: data.residence_type,
      lin: data.lin || '',
      class_level: data.class_level,
      class_id: data.class_id,
      year: data.year,
      term: data.term,
      previous_school: data.previous_school || '',
      previous_class: data.previous_class || '',
      special_needs: data.special_needs || '',
      disability_status: data.disability_status || '',
      photo_url: photoUrl,
      guardians: [{
        relationship: data.guardian_relationship,
        full_name: data.guardian_full_name,
        phone: data.guardian_phone,
        alternative_phone: data.guardian_alternative_phone || '',
        email: data.guardian_email || '',
        occupation: data.guardian_occupation || '',
        address: data.guardian_address || '',
      }],
    }
    createMutation.mutate(payload)
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">New Student Registration</h1>
              <p className="text-sm text-gray-500">Admission number will be auto-generated</p>
            </div>
            <button
              onClick={() => router.push('/students')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {['Basic Info', 'Guardian', 'Additional'].map((label, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    idx === step ? 'bg-blue-600 text-white' : 
                    idx < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {idx < step ? '✓' : idx + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    idx === step ? 'text-blue-600' : idx < step ? 'text-green-600' : 'text-gray-500'
                  }`}>{label}</span>
                  {idx < 2 && <div className="w-16 h-0.5 bg-gray-200 mx-4" />}
                </div>
              ))}
            </div>
          </div>

          {step === 0 && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">👤</span> Personal Information
                </h2>
                <div className="flex flex-col items-center mb-6 p-4 bg-gray-50 rounded-lg">
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-3" />
                  )}
                  <FileInput
                    placeholder="Upload student photo"
                    accept="image/*"
                    value={photoFile}
                    onChange={handlePhotoChange}
                    className="w-full max-w-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Optional • Max 10MB • JPG, PNG</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput {...register('first_name')} label="First Name" required error={errors.first_name?.message} placeholder="John" />
                  <FormInput {...register('middle_name')} label="Middle Name" placeholder="Optional" />
                  <FormInput {...register('last_name')} label="Last Name" required error={errors.last_name?.message} placeholder="Doe" />
                  <FormInput {...register('date_of_birth')} type="date" label="Date of Birth" required error={errors.date_of_birth?.message} />
                  <FormSelect {...register('gender')} label="Gender" required options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
                  <FormInput {...register('nationality')} label="Nationality" placeholder="Ugandan" />
                  <FormSelect {...register('religion')} label="Religion" options={[
                    { value: '', label: 'Select' }, { value: 'Catholic', label: 'Catholic' }, { value: 'Protestant', label: 'Protestant' },
                    { value: 'Anglican', label: 'Anglican' }, { value: 'Muslim', label: 'Muslim' }, { value: 'Other', label: 'Other' }
                  ]} />
                  <FormInput {...register('lin')} label="LIN" placeholder="Optional" />
                  <FormSelect {...register('residence_type')} label="Residence" options={[
                    { value: 'Day', label: 'Day Scholar' }, { value: 'Boarding', label: 'Boarding' }
                  ]} />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎓</span> Academic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormSelect {...register('class_level')} label="Class Level" required error={errors.class_level?.message} options={[
                    { value: '', label: 'Select Level' },
                    ...(levelsData?.levels?.map((level: string) => ({ value: level, label: level })) || [])
                  ]} />
                  <FormSelect {...register('class_id')} label="Class" required error={errors.class_id?.message} options={[
                    { value: '', label: 'Select Class' },
                    ...(classesData?.classes?.filter((c: any) => c.level === selectedLevel).map((c: any) => ({ value: c.id, label: c.name })) || [])
                  ]} />
                  <FormInput {...register('year')} type="number" label="Academic Year" required placeholder="2026" />
                  <FormSelect {...register('term')} label="Term" required options={[
                    { value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }
                  ]} />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📞</span> Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput {...register('email')} type="email" label="Email" placeholder="student@example.com" />
                  <FormInput {...register('phone')} label="Phone" placeholder="+256..." />
                  <FormInput {...register('district')} label="District" placeholder="Kampala" />
                  <FormInput {...register('village')} label="Village" placeholder="Village name" />
                  <div className="md:col-span-2">
                    <FormTextarea {...register('address')} label="Full Address" rows={2} placeholder="Complete address" />
                  </div>
                </div>
              </div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">👨👩👧</span> Guardian / Parent Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput {...register('guardian_full_name')} label="Full Name" required error={errors.guardian_full_name?.message} placeholder="Guardian name" />
                  <FormSelect {...register('guardian_relationship')} label="Relationship" required error={errors.guardian_relationship?.message} options={[
                    { value: '', label: 'Select' }, { value: 'Father', label: 'Father' }, { value: 'Mother', label: 'Mother' },
                    { value: 'Legal Guardian', label: 'Legal Guardian' }, { value: 'Sponsor', label: 'Sponsor' }, { value: 'Other', label: 'Other' }
                  ]} />
                  <FormInput {...register('guardian_phone')} label="Primary Phone" required error={errors.guardian_phone?.message} placeholder="+256..." />
                  <FormInput {...register('guardian_alternative_phone')} label="Alternative Phone" placeholder="+256... (optional)" />
                  <FormInput {...register('guardian_email')} type="email" label="Email" placeholder="guardian@example.com" />
                  <FormInput {...register('guardian_occupation')} label="Occupation" placeholder="Teacher, Farmer, etc." />
                  <div className="md:col-span-2">
                    <FormTextarea {...register('guardian_address')} label="Address" rows={2} placeholder="Guardian's address" />
                  </div>
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎒</span> Previous Education
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput {...register('previous_school')} label="Previous School" placeholder="School name" />
                  <FormInput {...register('previous_class')} label="Previous Class" placeholder="P7, S3, etc." />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏥</span> Health & Special Needs
                </h2>
                <div className="space-y-4">
                  <FormTextarea {...register('special_needs')} label="Special Educational Needs" rows={3} placeholder="Any special accommodations required (optional)" />
                  <FormTextarea {...register('disability_status')} label="Medical Conditions" rows={3} placeholder="Any disabilities or medical conditions (optional)" />
                </div>
              </div>
            </form>
          )}

          <div className="flex justify-between items-center border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              type="button"
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={createMutation.isPending}
                className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? 'Registering...' : 'Register Student'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
