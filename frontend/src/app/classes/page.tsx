'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { classesApi, teachersApi, schoolsApi } from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, StatCard } from '@/components/ui/BeautifulComponents'
import { FormInput, FormSelect, FormCard, FormActions, FormSection } from '@/components/ui/FormComponents'
import Link from 'next/link'

const classSchema = z.object({
  level: z.string().min(1, 'Level is required'),
  stream: z.string().optional(),
  teacher_id: z.string().optional(),
  capacity: z.number().min(10).max(100),
  year: z.number().min(2020).max(2030),
  term: z.string().min(1, 'Term is required'),
})

type ClassFormData = z.infer<typeof classSchema>

export default function ClassesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const queryClient = useQueryClient()
  const notificationShownRef = useRef(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const { data: levelsData, isLoading: levelsLoading, error: levelsError, isSuccess } = useQuery({
    queryKey: ['school-levels'],
    queryFn: async () => {
      const response = await schoolsApi.getLevels()
      return response
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled: !!user, // Only run query when user is loaded
  })

  const availableLevels = levelsData?.levels || []

  useEffect(() => {
    // Only show notification once and only if there's an actual error
    if (levelsError && !notificationShownRef.current) {
      console.error('Failed to load levels:', levelsError)
      notifications.show({ 
        id: 'levels-error',
        title: 'Warning', 
        message: 'Failed to load school levels. Please refresh the page.', 
        color: 'orange',
        autoClose: 5000,
      })
      notificationShownRef.current = true
    }
    
    // Only show "no levels" notification if:
    // 1. The query has completed successfully (isSuccess)
    // 2. Not currently loading
    // 3. levelsData exists and has levels property
    // 4. The levels array is actually empty (length is 0)
    // 5. Notification hasn't been shown yet
    if (isSuccess && !levelsLoading && levelsData?.levels && levelsData.levels.length === 0 && !notificationShownRef.current) {
      console.warn('No levels configured for this school')
      notifications.show({ 
        id: 'no-levels',
        title: 'No Levels Configured', 
        message: 'Your school has no levels configured. Please contact your system administrator to set up school levels.', 
        color: 'yellow',
        autoClose: false,
      })
      notificationShownRef.current = true
    }
  }, [levelsError, isSuccess, levelsLoading, levelsData])

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      level: '',
      stream: '',
      teacher_id: '',
      capacity: 30,
      year: 2026,
      term: 'Term 1',
    },
  })

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await classesApi.list()
      return Array.isArray(response) ? { classes: response } : response
    },
  })

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await classesApi.getTeachers()
      return Array.isArray(response) ? response : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const createClassMutation = useMutation({
    mutationFn: (classData: ClassFormData) => classesApi.create(classData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      notifications.show({ title: 'Success', message: 'Class created successfully', color: 'green' })
      setCreateModalOpen(false)
      reset()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create class'
      notifications.show({ title: 'Error', message: errorMessage, color: 'red' })
    },
  })

  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassFormData }) => classesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      notifications.show({ title: 'Success', message: 'Class updated successfully', color: 'green' })
      setEditingClass(null)
      setCreateModalOpen(false)
      reset()
    },
  })

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => classesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      notifications.show({ title: 'Success', message: 'Class deleted successfully', color: 'green' })
    },
  })

  const onSubmit = (values: ClassFormData) => {
    const payload = {
      level: values.level,
      stream: values.stream || '',
      teacher_profile_id: values.teacher_id || undefined,
      capacity: Number(values.capacity),
      year: Number(values.year),
      term: values.term,
    }
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, data: payload })
    } else {
      createClassMutation.mutate(payload)
    }
  }

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem)
    setValue('level', classItem.level)
    setValue('stream', classItem.stream || '')
    setValue('teacher_id', classItem.teacher_id || '')
    setValue('capacity', classItem.capacity)
    setValue('year', classItem.year)
    setValue('term', classItem.term)
    setCreateModalOpen(true)
  }

  const handleDelete = (classItem: any) => {
    if (confirm(`Are you sure you want to delete ${classItem.name}?`)) {
      deleteClassMutation.mutate(classItem.id)
    }
  }

  const stats = {
    total: classesData?.classes?.length || 0,
    students: classesData?.classes?.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0) || 0,
    capacity: classesData?.classes?.reduce((sum: number, c: any) => sum + (c.capacity || 0), 0) || 0,
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="Classes Management" 
          subtitle="Organize and manage school classes"
          action={
            <button
              onClick={() => { setEditingClass(null); reset(); setCreateModalOpen(true) }}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              ➕ Create Class
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
          <StatCard title="Total Classes" value={stats.total} icon="🏫" gradient="from-blue-500 to-blue-700" />
          <StatCard title="Total Students" value={stats.students} icon="👥" gradient="from-green-500 to-green-700" />
          <StatCard title="Total Capacity" value={stats.capacity} icon="📊" gradient="from-purple-500 to-purple-700" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {(classesData?.classes || []).map((classItem: any) => (
            <div key={classItem.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{classItem.name}</h3>
                  <p className="text-sm text-gray-500">Year {classItem.year} • Term {classItem.term}</p>
                </div>
                <div className="relative">
                  <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={(e) => {
                    e.currentTarget.nextElementSibling?.classList.toggle('hidden')
                  }}>⋮</button>
                  <div className="hidden absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-10 py-2">
                    <Link href={`/classes/${classItem.id}`} className="block px-4 py-2 hover:bg-gray-100 text-gray-700">👁️ View Details</Link>
                    <button onClick={() => handleEdit(classItem)} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">✏️ Edit Class</button>
                    <button onClick={() => handleDelete(classItem)} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">🗑️ Delete</button>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Students</span>
                  <span className="font-bold text-gray-800">{classItem.student_count || 0}/{classItem.capacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-700 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((classItem.student_count || 0) / classItem.capacity) * 100, 100)}%` }}
                  />
                </div>
                {classItem.teacher_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>👨‍🏫</span>
                    <span>{classItem.teacher_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {createModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">{editingClass ? '✏️ Edit Class' : '➕ Create New Class'}</h2>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <FormSection title="Class Information" icon="📚">
                  <FormSelect
                    {...register('level')}
                    label="Level"
                    icon="🎓"
                    required
                    error={errors.level?.message}
                    disabled={levelsLoading}
                    options={[
                      { value: '', label: levelsLoading ? 'Loading levels...' : 'Select Level' },
                      ...availableLevels.map((l: string) => ({ value: l, label: l }))
                    ]}
                  />
                  <FormInput
                    {...register('stream')}
                    label="Stream"
                    icon="🔤"
                    placeholder="A, B, Blue, etc."
                  />
                  <FormInput
                    {...register('capacity', { valueAsNumber: true })}
                    type="number"
                    label="Capacity"
                    icon="👥"
                    required
                    error={errors.capacity?.message}
                    placeholder="30"
                  />
                  <FormSelect
                    {...register('teacher_id')}
                    label="Class Teacher"
                    icon="👨‍🏫"
                    options={[
                      { value: '', label: 'Select Teacher (Optional)' },
                      ...(Array.isArray(teachersData) ? teachersData.map((t: any) => ({ 
                        value: t.teacher_profile_id || t.id, 
                        label: `${t.first_name} ${t.last_name}` 
                      })) : [])
                    ]}
                  />
                </FormSection>

                <FormSection title="Academic Period" icon="📅">
                  <FormInput
                    {...register('year', { valueAsNumber: true })}
                    type="number"
                    label="Academic Year"
                    icon="📆"
                    required
                    error={errors.year?.message}
                    placeholder="2026"
                  />
                  <FormSelect
                    {...register('term')}
                    label="Term"
                    icon="📖"
                    required
                    error={errors.term?.message}
                    options={[
                      { value: 'Term 1', label: 'Term 1' },
                      { value: 'Term 2', label: 'Term 2' },
                      { value: 'Term 3', label: 'Term 3' }
                    ]}
                  />
                </FormSection>

                <FormActions
                  onCancel={() => { setCreateModalOpen(false); setEditingClass(null); reset() }}
                  submitText={editingClass ? 'Update Class' : 'Create Class'}
                  isLoading={createClassMutation.isPending || updateClassMutation.isPending}
                  loadingText={editingClass ? 'Updating...' : 'Creating...'}
                />
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
