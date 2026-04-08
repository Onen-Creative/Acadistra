'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { studentsApi, classesApi, schoolsApi } from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormInput, FormSelect, FormTextarea, FormSection, FormCard, FormActions, StepIndicator, FormGrid, FullWidthField } from '@/components/ui/FormComponents'
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

export default function StudentRegistrationPage() {
  const router = useRouter()
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="Student Registration" 
          subtitle="Admission number will be auto-generated based on school and class"
          action={
            <button
              onClick={() => router.push('/students')}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:shadow-lg transition-all duration-300"
            >
              ⬅️ Back to Students
            </button>
          }
        />

        <FormCard>
          <StepIndicator 
            steps={['Basic Info', 'Guardian', 'Additional']} 
            currentStep={step} 
          />

          {step === 0 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <FormSection title="Personal Information" icon="👤">
                <div className="md:col-span-2 flex flex-col items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo (Optional)</label>
                  {photoPreview && (
                    <div className="mb-3">
                      <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover border-2 border-gray-300" />
                    </div>
                  )}
                  <FileInput
                    placeholder="Upload photo"
                    accept="image/*"
                    value={photoFile}
                    onChange={handlePhotoChange}
                    className="w-full max-w-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 10MB. Will be optimized automatically.</p>
                </div>
                <FormInput
                  {...register('first_name')}
                  label="First Name"
                  icon="📝"
                  required
                  error={errors.first_name?.message}
                  placeholder="Enter first name"
                />
                <FormInput
                  {...register('middle_name')}
                  label="Middle Name"
                  icon="📝"
                  placeholder="Enter middle name (optional)"
                />
                <FormInput
                  {...register('last_name')}
                  label="Last Name"
                  icon="📝"
                  required
                  error={errors.last_name?.message}
                  placeholder="Enter last name"
                />
                <FormInput
                  {...register('date_of_birth')}
                  type="date"
                  label="Date of Birth"
                  icon="📅"
                  required
                  error={errors.date_of_birth?.message}
                />
                <FormSelect
                  {...register('gender')}
                  label="Gender"
                  icon="⚧"
                  required
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' }
                  ]}
                />
                <FormInput
                  {...register('nationality')}
                  label="Nationality"
                  icon="🌍"
                  placeholder="e.g., Ugandan"
                />
                <FormSelect
                  {...register('religion')}
                  label="Religion"
                  icon="🕊️"
                  options={[
                    { value: '', label: 'Select Religion' },
                    { value: 'Catholic', label: 'Catholic' },
                    { value: 'Protestant', label: 'Protestant' },
                    { value: 'Anglican', label: 'Anglican' },
                    { value: 'Pentecostal', label: 'Pentecostal' },
                    { value: 'Seventh Day Adventist', label: 'Seventh Day Adventist' },
                    { value: 'Muslim', label: 'Muslim' },
                    { value: 'Orthodox', label: 'Orthodox' },
                    { value: 'Born Again', label: 'Born Again' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
                <FormInput
                  {...register('lin')}
                  label="LIN (Learner Identification Number)"
                  icon="🔢"
                  placeholder="Enter LIN if available"
                />
              </FormSection>

              <FormSection title="Academic Information" icon="🎓">
                <FormSelect
                  {...register('class_level')}
                  label="Class Level"
                  icon="📚"
                  required
                  error={errors.class_level?.message}
                  options={[
                    { value: '', label: 'Select Level' },
                    ...(levelsData?.levels?.map((level: string) => ({
                      value: level,
                      label: level
                    })) || [])
                  ]}
                />
                <FormSelect
                  {...register('class_id')}
                  label="Class"
                  icon="🏫"
                  required
                  error={errors.class_id?.message}
                  options={[
                    { value: '', label: 'Select Class' },
                    ...(classesData?.classes?.filter((c: any) => c.level === selectedLevel).map((c: any) => ({
                      value: c.id,
                      label: c.name
                    })) || [])
                  ]}
                />
                <FormInput
                  {...register('year')}
                  type="number"
                  label="Academic Year"
                  icon="📆"
                  required
                  placeholder="2026"
                />
                <FormSelect
                  {...register('term')}
                  label="Term"
                  icon="📖"
                  required
                  options={[
                    { value: 'Term 1', label: 'Term 1' },
                    { value: 'Term 2', label: 'Term 2' },
                    { value: 'Term 3', label: 'Term 3' }
                  ]}
                />
              </FormSection>

              <FormSection title="Contact Information" icon="📞">
                <FormInput
                  {...register('email')}
                  type="email"
                  label="Email"
                  icon="📧"
                  placeholder="student@acadistra.com"
                />
                <FormInput
                  {...register('phone')}
                  label="Phone Number"
                  icon="📱"
                  placeholder="+256..."
                />
                <FormInput
                  {...register('district')}
                  label="District"
                  icon="🗺️"
                  placeholder="Enter district"
                />
                <FormInput
                  {...register('village')}
                  label="Village"
                  icon="🏘️"
                  placeholder="Enter village"
                />
                <FormSelect
                  {...register('residence_type')}
                  label="Residence Type"
                  icon="🏠"
                  options={[
                    { value: 'Day', label: 'Day Scholar' },
                    { value: 'Boarding', label: 'Boarding' }
                  ]}
                />
                <FullWidthField>
                  <FormTextarea
                    {...register('address')}
                    label="Full Address"
                    icon="📍"
                    rows={3}
                    placeholder="Enter complete address"
                  />
                </FullWidthField>
              </FormSection>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <FormSection title="Guardian Information" icon="👨‍👩‍👧">
                <FormInput
                  {...register('guardian_full_name')}
                  label="Guardian Full Name"
                  icon="👤"
                  required
                  error={errors.guardian_full_name?.message}
                  placeholder="Enter guardian's full name"
                />
                <FormSelect
                  {...register('guardian_relationship')}
                  label="Relationship"
                  icon="👪"
                  required
                  error={errors.guardian_relationship?.message}
                  options={[
                    { value: '', label: 'Select Relationship' },
                    { value: 'Father', label: 'Father' },
                    { value: 'Mother', label: 'Mother' },
                    { value: 'Legal Guardian', label: 'Legal Guardian' },
                    { value: 'Sponsor', label: 'Sponsor' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
                <FormInput
                  {...register('guardian_phone')}
                  label="Primary Phone"
                  icon="📱"
                  required
                  error={errors.guardian_phone?.message}
                  placeholder="+256..."
                />
                <FormInput
                  {...register('guardian_alternative_phone')}
                  label="Alternative Phone"
                  icon="📞"
                  placeholder="+256... (optional)"
                />
                <FormInput
                  {...register('guardian_email')}
                  type="email"
                  label="Email Address"
                  icon="📧"
                  placeholder="guardian@acadistra.com"
                />
                <FormInput
                  {...register('guardian_occupation')}
                  label="Occupation"
                  icon="💼"
                  placeholder="Enter occupation"
                />
                <FullWidthField>
                  <FormTextarea
                    {...register('guardian_address')}
                    label="Guardian Address"
                    icon="📍"
                    rows={3}
                    placeholder="Enter guardian's complete address"
                  />
                </FullWidthField>
              </FormSection>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <FormSection title="Previous Education" icon="🎒">
                <FormInput
                  {...register('previous_school')}
                  label="Previous School"
                  icon="🏫"
                  placeholder="Enter previous school name"
                />
                <FormInput
                  {...register('previous_class')}
                  label="Previous Class"
                  icon="📚"
                  placeholder="e.g., P7, S3"
                />
              </FormSection>

              <FormSection title="Health & Special Needs" icon="🏥">
                <FullWidthField>
                  <FormTextarea
                    {...register('special_needs')}
                    label="Special Needs"
                    icon="♿"
                    rows={4}
                    placeholder="Describe any special educational needs or accommodations required"
                  />
                </FullWidthField>
                <FullWidthField>
                  <FormTextarea
                    {...register('disability_status')}
                    label="Disability Status"
                    icon="🩺"
                    rows={4}
                    placeholder="Describe any disabilities or medical conditions"
                  />
                </FullWidthField>
              </FormSection>
            </form>
          )}

          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-8">
            <button
              type="button"
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬅️ Back
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                Next ➡️
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={createMutation.isPending}
                className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {createMutation.isPending ? '⏳ Registering...' : '✅ Register Student'}
              </button>
            )}
          </div>
        </FormCard>
      </div>
    </DashboardLayout>
  )
}
