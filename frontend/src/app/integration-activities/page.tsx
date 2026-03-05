'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, StatCard } from '@/components/ui/BeautifulComponents'
import { FormSelect, FormCard } from '@/components/ui/FormComponents'
import { classesApi, studentsApi, subjectsApi, integrationActivitiesApi } from '@/services/api'

export default function IntegrationActivitiesPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedClass, setSelectedClass] = useState('')
  const queryClient = useQueryClient()

  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({})

  const { data: classesData } = useQuery({
    queryKey: ['classes', selectedYear, selectedTerm],
    queryFn: async () => {
      const res = await classesApi.list({ year: selectedYear, term: selectedTerm })
      return Array.isArray(res) ? { classes: res } : res
    }
  })

  const selectedClassData = classesData?.classes?.find((c: any) => c.id === selectedClass)
  const currentLevel = selectedClassData?.level || ''
  const isValidLevel = ['S1', 'S2', 'S3', 'S4'].includes(currentLevel)

  const { data: studentsData } = useQuery({
    queryKey: ['students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return { students: [] }
      const res = await studentsApi.list({ class_id: selectedClass })
      return Array.isArray(res) ? { students: res } : res
    },
    enabled: !!selectedClass && isValidLevel
  })

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', currentLevel],
    queryFn: async () => {
      if (!currentLevel) return { subjects: [] }
      const res = await subjectsApi.list({ level: currentLevel })
      return Array.isArray(res) ? { subjects: res } : res
    },
    enabled: !!currentLevel && isValidLevel
  })

  const { data: activitiesData } = useQuery({
    queryKey: ['integration-activities', selectedClass, selectedYear, selectedTerm],
    queryFn: async () => {
      if (!selectedClass) return { activities: [] }
      const res = await integrationActivitiesApi.getByClass({
        class_id: selectedClass,
        term: selectedTerm,
        year: selectedYear
      })
      return res
    },
    enabled: !!selectedClass && isValidLevel
  })

  useEffect(() => {
    if (activitiesData?.activities) {
      const newMarks: Record<string, Record<string, number>> = {}
      activitiesData.activities.forEach((activity: any) => {
        newMarks[activity.student_id] = activity.marks || {}
      })
      setMarks(newMarks)
    }
  }, [activitiesData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(marks).map(([studentId, studentMarks]) =>
        integrationActivitiesApi.createOrUpdate({
          student_id: studentId,
          class_id: selectedClass,
          term: selectedTerm,
          year: selectedYear,
          marks: studentMarks
        })
      )
      return Promise.all(promises)
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Activities of Integration marks saved', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['integration-activities'] })
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to save marks', color: 'red' })
    }
  })

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0 || numValue > 3) return

    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: numValue
      }
    }))
  }

  const calculateAverage = (studentId: string) => {
    const studentMarks = marks[studentId] || {}
    const values = Object.values(studentMarks).filter(v => typeof v === 'number')
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  const calculateOutOf20 = (studentId: string) => {
    const avg = calculateAverage(studentId)
    return ((avg / 3) * 20).toFixed(2)
  }

  const stats = {
    totalStudents: studentsData?.students?.length || 0,
    totalSubjects: subjectsData?.subjects?.length || 0,
    completed: Object.keys(marks).length,
    pending: (studentsData?.students?.length || 0) - Object.keys(marks).length
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="Activities of Integration (S1-S4)" 
          subtitle="Record marks for activities of integration (0-3 per subject)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard title="Total Students" value={stats.totalStudents} icon="👥" gradient="from-blue-500 to-blue-700" />
          <StatCard title="Total Subjects" value={stats.totalSubjects} icon="📚" gradient="from-green-500 to-green-700" />
          <StatCard title="Completed" value={stats.completed} icon="✅" gradient="from-purple-500 to-purple-700" />
          <StatCard title="Pending" value={stats.pending} icon="⏳" gradient="from-orange-500 to-orange-700" />
        </div>

        <FormCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <FormSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              label="Year"
              icon="📅"
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
                { value: '2027', label: '2027' }
              ]}
            />
            <FormSelect
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              label="Term"
              icon="📖"
              options={[
                { value: 'Term 1', label: 'Term 1' },
                { value: 'Term 2', label: 'Term 2' },
                { value: 'Term 3', label: 'Term 3' }
              ]}
            />
            <FormSelect
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              label="Class"
              icon="🏫"
              options={[
                { value: '', label: 'Select Class' },
                ...(classesData?.classes
                  ?.filter((c: any) => ['S1', 'S2', 'S3', 'S4'].includes(c.level))
                  ?.map((c: any) => ({ value: c.id, label: c.name })) || [])
              ]}
            />
          </div>

          {!isValidLevel && selectedClass && (
            <div className="text-center py-8 text-orange-600 bg-orange-50 rounded-lg">
              Activities of Integration are only for S1-S4 classes
            </div>
          )}

          {isValidLevel && selectedClass && studentsData && subjectsData && (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 border-r-2 border-gray-300 sticky left-0 bg-gray-50 z-10">Student</th>
                      {subjectsData.subjects?.map((subject: any) => (
                        <th key={subject.id} className="text-center py-3 px-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[80px]">
                          {subject.name}
                        </th>
                      ))}
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 border-l-2 border-gray-300 bg-blue-50">Average</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-green-50">Out of 20</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.students?.map((student: any) => (
                      <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-800 border-r-2 border-gray-300 sticky left-0 bg-white">
                          {student.first_name} {student.middle_name} {student.last_name}
                        </td>
                        {subjectsData.subjects?.map((subject: any) => (
                          <td key={subject.id} className="py-2 px-2 text-center border-r border-gray-200">
                            <input
                              type="number"
                              min="0"
                              max="3"
                              step="0.5"
                              value={marks[student.id]?.[subject.id] ?? ''}
                              onChange={(e) => handleMarkChange(student.id, subject.id, e.target.value)}
                              className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0-3"
                            />
                          </td>
                        ))}
                        <td className="py-3 px-4 text-center font-semibold text-blue-700 border-l-2 border-gray-300 bg-blue-50">
                          {calculateAverage(student.id).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-green-700 bg-green-50">
                          {calculateOutOf20(student.id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : '💾 Save All Marks'}
                </button>
              </div>
            </>
          )}

          {isValidLevel && selectedClass && (!studentsData?.students || studentsData.students.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No students found in this class
            </div>
          )}
        </FormCard>
      </div>
    </DashboardLayout>
  )
}
