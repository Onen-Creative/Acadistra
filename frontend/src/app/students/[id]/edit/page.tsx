'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { FormInput, FormSelect, FormTextarea, FormSection, FormCard, FormActions } from '@/components/ui/FormComponents'
import api from '@/services/api'
import { useForm } from 'react-hook-form'
import { notifications } from '@mantine/notifications'

export default function EditStudentPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const studentId = params.id as string

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}`)
      return res.data.student
    },
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

  const onSubmit = (data: any) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="Edit Student" 
          subtitle={`Update information for ${studentData?.first_name} ${studentData?.last_name}`}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormCard>
            <FormSection title="Personal Information" icon="👤">
              <FormInput
                {...register('first_name', { required: 'First name is required' })}
                label="First Name"
                icon="📝"
                required
                error={errors.first_name?.message as string}
                placeholder="Enter first name"
              />
              <FormInput
                {...register('middle_name')}
                label="Middle Name"
                icon="📝"
                placeholder="Enter middle name"
              />
              <FormInput
                {...register('last_name', { required: 'Last name is required' })}
                label="Last Name"
                icon="📝"
                required
                error={errors.last_name?.message as string}
                placeholder="Enter last name"
              />
              <FormInput
                {...register('date_of_birth')}
                type="date"
                label="Date of Birth"
                icon="📅"
              />
              <FormSelect
                {...register('gender', { required: 'Gender is required' })}
                label="Gender"
                icon="⚧"
                required
                error={errors.gender?.message as string}
                options={[
                  { value: '', label: 'Select Gender' },
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
              <FormInput
                {...register('religion')}
                label="Religion"
                icon="🕊️"
                placeholder="Enter religion"
              />
              <FormInput
                {...register('lin')}
                label="LIN"
                icon="🔢"
                placeholder="Learner ID Number"
              />
              <FormSelect
                {...register('status')}
                label="Status"
                icon="📊"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'graduated', label: 'Graduated' },
                  { value: 'transferred', label: 'Transferred' },
                  { value: 'withdrawn', label: 'Withdrawn' }
                ]}
              />
            </FormSection>
          </FormCard>

          <FormCard>
            <FormSection title="Contact Information" icon="📞">
              <FormInput
                {...register('email')}
                type="email"
                label="Email"
                icon="📧"
                placeholder="student@example.com"
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
                  { value: '', label: 'Select Type' },
                  { value: 'Day', label: 'Day Scholar' },
                  { value: 'Boarding', label: 'Boarding' }
                ]}
              />
              <div className="md:col-span-2">
                <FormTextarea
                  {...register('address')}
                  label="Full Address"
                  icon="📍"
                  rows={3}
                  placeholder="Enter complete address"
                />
              </div>
            </FormSection>
          </FormCard>

          <FormCard>
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
          </FormCard>

          <FormCard>
            <FormSection title="Health & Special Needs" icon="🏥">
              <div className="md:col-span-2">
                <FormTextarea
                  {...register('special_needs')}
                  label="Special Needs"
                  icon="♿"
                  rows={4}
                  placeholder="Describe any special educational needs"
                />
              </div>
              <div className="md:col-span-2">
                <FormTextarea
                  {...register('disability_status')}
                  label="Disability Status"
                  icon="🩺"
                  rows={4}
                  placeholder="Describe any disabilities or medical conditions"
                />
              </div>
            </FormSection>
          </FormCard>

          <FormCard>
            <FormActions
              onCancel={() => router.back()}
              submitText="Update Student"
              isLoading={updateMutation.isPending}
              loadingText="Updating..."
            />
          </FormCard>
        </form>
      </div>
    </DashboardLayout>
  )
}
