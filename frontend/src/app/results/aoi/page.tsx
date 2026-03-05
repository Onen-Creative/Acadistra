'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormSelect } from '@/components/ui/FormComponents'
import { classesApi, subjectsApi, integrationActivitiesApi } from '@/services/api'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function AOIResultsPage() {
  const [year, setYear] = useState('2026')
  const [term, setTerm] = useState('Term 1')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')

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

  const { data: aoiData } = useQuery({
    queryKey: ['aoi-results', classId, subjectId, term, year],
    queryFn: async () => {
      if (!classId || !subjectId) return { activities: [] }
      const res = await integrationActivitiesApi.getByClass({ class_id: classId, subject_id: subjectId, term, year: parseInt(year) })
      return res
    },
    enabled: !!classId && !!subjectId
  })

  const exportToExcel = () => {
    if (!aoiData?.activities || aoiData.activities.length === 0) {
      notifications.show({ title: 'Error', message: 'No data to export', color: 'red' })
      return
    }

    const exportData = aoiData.activities.map((activity: any, index: number) => {
      const marks = activity.marks || {}
      const activities = [marks.activity1, marks.activity2, marks.activity3, marks.activity4, marks.activity5]
        .filter((v: any) => v !== undefined && v !== null && v !== '' && !isNaN(Number(v)))
        .map((v: any) => Number(v))
      const avg = activities.length > 0 ? activities.reduce((sum: number, v: number) => sum + v, 0) / activities.length : 0
      const outOf20 = ((avg / 3) * 20).toFixed(2)
      
      return {
        '#': index + 1,
        'Student Name': `${activity.student?.first_name || ''} ${activity.student?.middle_name ? activity.student.middle_name + ' ' : ''}${activity.student?.last_name || ''}`,
        'Activity 1': marks.activity1 !== undefined && marks.activity1 !== null ? marks.activity1 : '-',
        'Activity 2': marks.activity2 !== undefined && marks.activity2 !== null ? marks.activity2 : '-',
        'Activity 3': marks.activity3 !== undefined && marks.activity3 !== null ? marks.activity3 : '-',
        'Activity 4': marks.activity4 !== undefined && marks.activity4 !== null ? marks.activity4 : '-',
        'Activity 5': marks.activity5 !== undefined && marks.activity5 !== null ? marks.activity5 : '-',
        'Average': avg.toFixed(2),
        'Out of 20': outOf20
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AOI Marks')
    
    const subjectName = subjectsData?.subjects?.find((s: any) => s.id === subjectId)?.name || 'Subject'
    const filename = `${selectedClass?.name}_${subjectName}_AOI_${term}_${year}.xlsx`
    XLSX.writeFile(workbook, filename)
    
    notifications.show({ title: 'Success', message: 'AOI marks exported successfully', color: 'green' })
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="📊 Activities of Integration Results"
          subtitle="View AOI marks for S1-S4 students"
          action={
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={exportToExcel}
                disabled={!aoiData?.activities || aoiData.activities.length === 0}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                📥 Export
              </button>
              <Link href="/results">
                <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all text-sm sm:text-base">
                  ← Back
                </button>
              </Link>
            </div>
          }
        />

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Select Filters</h3>
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
              onChange={(e) => setSubjectId(e.target.value)}
              label="Subject"
              disabled={!classId}
              options={[
                { value: '', label: 'Select Subject' },
                ...(subjectsData?.subjects?.map((s: any) => ({ value: s.id, label: s.name })) || [])
              ]}
            />
          </div>
        </div>

        {classId && subjectId && aoiData?.activities?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">
              📈 AOI Results: {selectedClass?.name} • {subjectsData?.subjects?.find((s: any) => s.id === subjectId)?.name}
            </h3>

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
                  {aoiData.activities.map((activity: any, index: number) => {
                    const marks = activity.marks || {}
                    const activities = [marks.activity1, marks.activity2, marks.activity3, marks.activity4, marks.activity5]
                      .filter((v: any) => v !== undefined && v !== null && v !== '' && !isNaN(Number(v)))
                      .map((v: any) => Number(v))
                    const avg = activities.length > 0 ? activities.reduce((sum: number, v: number) => sum + v, 0) / activities.length : 0
                    const outOf20 = ((avg / 3) * 20).toFixed(2)
                    
                    return (
                      <tr key={activity.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-2 sm:px-4 text-gray-600 border-r-2 border-gray-300 text-xs sm:text-sm">{index + 1}</td>
                        <td className="py-3 px-2 sm:px-4 font-medium border-r-2 border-gray-300 text-xs sm:text-sm">
                          <span className="hidden sm:inline">{activity.student?.first_name} {activity.student?.middle_name ? activity.student.middle_name + ' ' : ''}{activity.student?.last_name}</span>
                          <span className="sm:hidden">{activity.student?.first_name} {activity.student?.last_name}</span>
                        </td>
                        {[1, 2, 3, 4, 5].map((actNum) => (
                          <td key={actNum} className="py-3 px-1 sm:px-2 text-center border-r border-gray-200">
                            <span className="font-medium text-gray-700 text-xs sm:text-sm">
                              {marks[`activity${actNum}`] !== undefined && marks[`activity${actNum}`] !== null ? marks[`activity${actNum}`] : '-'}
                            </span>
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

        {classId && subjectId && aoiData?.activities?.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <p className="text-gray-500 text-lg">No AOI marks found for the selected filters.</p>
          </div>
        )}

        {!classId && (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-gray-500 text-lg">👆 Select filters above to view AOI results</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
