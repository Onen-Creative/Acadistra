'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormSelect } from '@/components/ui/FormComponents'
import { studentsApi, classesApi, subjectsApi, integrationActivitiesApi } from '@/services/api'
import Link from 'next/link'

export default function AOIMarksEntryPage() {
  const [year, setYear] = useState('2026')
  const [term, setTerm] = useState('Term 1')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [aoiMarks, setAoiMarks] = useState<Record<string, { activity1?: number; activity2?: number; activity3?: number; activity4?: number; activity5?: number }>>({})
  const [userRole, setUserRole] = useState('')
  const [hasExistingMarks, setHasExistingMarks] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUserRole(JSON.parse(userData).role)
    }
  }, [])

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await classesApi.list()
      return Array.isArray(res) ? { classes: res } : res
    }
  })

  const selectedClass = classesData?.classes?.find((c: any) => c.id === classId)
  const classLevel = selectedClass?.level || ''

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', classLevel],
    queryFn: async () => {
      if (!classLevel) return { subjects: [] }
      const res = await subjectsApi.list({ level: classLevel })
      return Array.isArray(res) ? { subjects: res } : res
    },
    enabled: !!classLevel
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students', classId],
    queryFn: async () => {
      if (!classId) return { students: [] }
      const res = await studentsApi.list({ class_id: classId })
      return Array.isArray(res) ? { students: res } : res
    },
    enabled: !!classId
  })

  const { data: existingActivities } = useQuery({
    queryKey: ['aoi-activities', classId, subjectId, term, year],
    queryFn: async () => {
      if (!classId || !subjectId) return { activities: [] }
      const res = await integrationActivitiesApi.getByClass({ class_id: classId, subject_id: subjectId, term, year: parseInt(year) })
      return res
    },
    enabled: !!classId && !!subjectId
  })

  useEffect(() => {
    if (existingActivities?.activities?.length > 0) {
      setHasExistingMarks(true)
      const marks: Record<string, any> = {}
      existingActivities.activities.forEach((activity: any) => {
        marks[activity.student_id] = activity.marks
      })
      setAoiMarks(marks)
    } else {
      setHasExistingMarks(false)
      setAoiMarks({})
    }
  }, [existingActivities])

  const handleSave = async () => {
    if (!subjectId || !classId) {
      notifications.show({ title: 'Error', message: 'Please select class and subject', color: 'red' })
      return
    }
    try {
      const promises = Object.entries(aoiMarks).map(([studentId, marks]) =>
        integrationActivitiesApi.createOrUpdate({
          student_id: studentId,
          subject_id: subjectId,
          class_id: classId,
          term,
          year: parseInt(year),
          marks
        })
      )
      await Promise.all(promises)
      notifications.show({ title: 'Success', message: `Saved AOI marks for ${Object.keys(aoiMarks).length} students`, color: 'green' })
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to save', color: 'red' })
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="📝 Activities of Integration Entry"
          subtitle="Enter marks for Activities of Integration (S1-S4)"
          action={
            <Link href="/marks/enter">
              <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all text-sm sm:text-base">
                ← Back
              </button>
            </Link>
          }
        />

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Step 1: Select Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormSelect
              value={year}
              onChange={(e) => setYear(e.target.value)}
              label="Year"
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
                { value: '2027', label: '2027' }
              ]}
            />
            <FormSelect
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              label="Term"
              options={[
                { value: 'Term 1', label: 'Term 1' },
                { value: 'Term 2', label: 'Term 2' },
                { value: 'Term 3', label: 'Term 3' }
              ]}
            />
            <FormSelect
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setSubjectId('')
                setAoiMarks({})
              }}
              label="Class (S1-S4 only)"
              options={[
                { value: '', label: 'Select Class' },
                ...(classesData?.classes
                  ?.filter((c: any) => ['S1', 'S2', 'S3', 'S4'].includes(c.level))
                  ?.map((c: any) => ({ value: c.id, label: c.name })) || [])
              ]}
            />
            <FormSelect
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value)
              }}
              label="Subject"
              disabled={!classId}
              options={[
                { value: '', label: 'Select Subject' },
                ...(subjectsData?.subjects?.map((s: any) => ({ value: s.id, label: s.name })) || [])
              ]}
            />
          </div>
        </div>

        {classId && subjectId && ['S1', 'S2', 'S3', 'S4'].includes(classLevel) && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">✍️ Step 2: Enter AOI Marks</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedClass?.name} • {subjectsData?.subjects?.find((s: any) => s.id === subjectId)?.name} • 5 Activities (0-3 each)
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={Object.keys(aoiMarks).length === 0 || !subjectId || !classId || (hasExistingMarks && userRole !== 'school_admin')}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                💾 {hasExistingMarks ? 'Update' : 'Save'} {Object.keys(aoiMarks).length}
              </button>
            </div>

            {hasExistingMarks && userRole !== 'school_admin' && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ View Only:</strong> AOI marks have already been entered for this subject. Only School Admin can edit existing marks.
                </p>
              </div>
            )}
            {hasExistingMarks && userRole === 'school_admin' && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                <p className="text-sm text-green-900">
                  <strong>✏️ Edit Mode:</strong> You can edit existing AOI marks as School Admin.
                </p>
              </div>
            )}
            {!hasExistingMarks && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Instructions:</strong> Enter marks between 0 and 3 for each of the 5 activities. Average and Out of 20 are calculated automatically.
                </p>
              </div>
            )}

            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 border-r-2 border-gray-300 text-xs sm:text-sm">#</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 border-r-2 border-gray-300 text-xs sm:text-sm">Student Name</th>
                    <th className="text-center py-3 px-1 sm:px-2 font-semibold text-gray-700 border-r border-gray-200 text-xs sm:text-sm">Act 1</th>
                    <th className="text-center py-3 px-1 sm:px-2 font-semibold text-gray-700 border-r border-gray-200 text-xs sm:text-sm">Act 2</th>
                    <th className="text-center py-3 px-1 sm:px-2 font-semibold text-gray-700 border-r border-gray-200 text-xs sm:text-sm">Act 3</th>
                    <th className="text-center py-3 px-1 sm:px-2 font-semibold text-gray-700 border-r border-gray-200 text-xs sm:text-sm">Act 4</th>
                    <th className="text-center py-3 px-1 sm:px-2 font-semibold text-gray-700 border-r-2 border-gray-300 text-xs sm:text-sm">Act 5</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-semibold text-gray-700 bg-blue-50 border-r-2 border-gray-300 text-xs sm:text-sm">Avg</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-semibold text-gray-700 bg-green-50 text-xs sm:text-sm">Out of 20</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsData?.students?.map((student: any, index: number) => {
                    const studentMarks = aoiMarks[student.id] || {}
                    const activities = [studentMarks.activity1, studentMarks.activity2, studentMarks.activity3, studentMarks.activity4, studentMarks.activity5]
                      .filter((v): v is number => v !== undefined && v !== null && typeof v === 'number' && !isNaN(v))
                    const avg = activities.length > 0 ? activities.reduce((sum, v) => sum + v, 0) / activities.length : 0
                    const outOf20 = ((avg / 3) * 20).toFixed(2)
                    
                    return (
                      <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-2 sm:px-4 text-gray-600 border-r-2 border-gray-300 text-xs sm:text-sm">{index + 1}</td>
                        <td className="py-3 px-2 sm:px-4 font-medium border-r-2 border-gray-300 text-xs sm:text-sm">
                          <span className="hidden sm:inline">{student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}</span>
                          <span className="sm:hidden">{student.first_name} {student.last_name}</span>
                        </td>
                        {[1, 2, 3, 4, 5].map((actNum) => (
                          <td key={actNum} className="py-2 px-1 sm:px-2 text-center border-r border-gray-200">
                            <input
                              type="number"
                              min="0"
                              max="3"
                              step="0.5"
                              value={studentMarks[`activity${actNum}` as keyof typeof studentMarks] || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (value <= 3) {
                                  setAoiMarks(prev => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], [`activity${actNum}`]: value }
                                  }))
                                }
                              }}
                              disabled={hasExistingMarks && userRole !== 'school_admin'}
                              className="w-full px-1 sm:px-2 py-1 text-center text-xs sm:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="0-3"
                            />
                          </td>
                        ))}
                        <td className="py-3 px-2 sm:px-4 text-center font-semibold text-blue-700 bg-blue-50 border-r-2 border-gray-300 text-xs sm:text-sm">
                          {avg.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-center font-bold text-green-700 bg-green-50 text-xs sm:text-sm">
                          {outOf20}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!classId && (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-gray-500 text-lg">👆 Select filters above to start entering AOI marks</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
