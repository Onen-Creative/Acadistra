'use client'

import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { notifications } from '@mantine/notifications'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, StatCard } from '@/components/ui/BeautifulComponents'
import { FormInput, FormSelect, FormCard, FormActions } from '@/components/ui/FormComponents'
import { resultsApi, studentsApi, classesApi, subjectsApi } from '@/services/api'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function ResultsPage() {
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [selectedExamType, setSelectedExamType] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const queryClient = useQueryClient()

  const [classLevel, setClassLevel] = useState('')
  const [modalClassId, setModalClassId] = useState('')
  const [modalExamType, setModalExamType] = useState('')
  const [modalSubjectId, setModalSubjectId] = useState('')
  const [bulkMarks, setBulkMarks] = useState<Record<string, { ca: number; exam: number }>>({})
  
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      student_id: '',
      year: 2026,
      term: 'Term 1',
      raw_marks: {}
    }
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes', selectedYear, selectedTerm],
    queryFn: async () => {
      const res = await classesApi.list({ year: Number(selectedYear), term: selectedTerm })
      return Array.isArray(res) ? { classes: res } : res
    }
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students', selectedClass, selectedYear, selectedTerm],
    queryFn: async () => {
      if (!selectedClass) return { students: [] }
      const res = await studentsApi.list({ class_id: selectedClass, year: Number(selectedYear), term: selectedTerm, limit: -1 })
      return Array.isArray(res) ? { students: res } : res
    },
    enabled: !!selectedClass
  })
  
  const { data: modalStudentsData } = useQuery({
    queryKey: ['modal-students', modalClassId],
    queryFn: async () => {
      if (!modalClassId) return { students: [] }
      const res = await studentsApi.list({ class_id: modalClassId, limit: -1 })
      return Array.isArray(res) ? { students: res } : res
    },
    enabled: !!modalClassId
  })
  
  const selectedClassData = classesData?.classes?.find((c: any) => c.id === selectedClass)
  const currentLevel = selectedClassData?.level || ''

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', classLevel],
    queryFn: async () => {
      if (!classLevel) return { subjects: [] }
      const res = await subjectsApi.list({ level: classLevel })
      return Array.isArray(res) ? { subjects: res } : res
    },
    enabled: !!classLevel
  })

  const { data: resultsData } = useQuery({
    queryKey: ['results', selectedClass, selectedStudent, selectedYear, selectedTerm, selectedExamType, selectedSubject],
    queryFn: async () => {
      if (!selectedClass) return []
      
      if (selectedStudent === 'all') {
        // Fetch results for all students in the class
        const students = studentsData?.students || []
        const allResults = await Promise.all(
          students.map(async (student: any) => {
            const params: any = { year: selectedYear, term: selectedTerm }
            if (selectedExamType) params.exam_type = selectedExamType
            const res = await resultsApi.getByStudent(student.id, params)
            return (res.results || []).map((r: any) => ({
              ...r,
              student_name: `${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''} ${student.last_name}`,
              student_id: student.id
            }))
          })
        )
        let results = allResults.flat()
        if (selectedSubject) {
          results = results.filter((r: any) => r.subject_id === selectedSubject)
        }
        return results
      } else {
        const params: any = { year: selectedYear, term: selectedTerm }
        if (selectedExamType) params.exam_type = selectedExamType
        const res = await resultsApi.getByStudent(selectedStudent, params)
        let results = res.results || []
        if (selectedSubject) {
          results = results.filter((r: any) => r.subject_id === selectedSubject)
        }
        return results
      }
    },
    enabled: !!selectedClass && !!studentsData
  })

  const { data: classExamTypes } = useQuery({
    queryKey: ['class-exam-types', selectedClass, selectedYear, selectedTerm],
    queryFn: async () => {
      if (!selectedClass || !studentsData?.students) return []
      const students = studentsData.students
      const allResults = await Promise.all(
        students.map(async (student: any) => {
          const res = await resultsApi.getByStudent(student.id, { year: selectedYear, term: selectedTerm })
          return res.results || []
        })
      )
      const examTypes = [...new Set(allResults.flat().map((r: any) => r.exam_type).filter(Boolean))]
      return examTypes
    },
    enabled: !!selectedClass && !!studentsData
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => resultsApi.createOrUpdate(data),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Result saved successfully', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['results'] })
      setCreateModalOpen(false)
      setBulkMode(false)
      setBulkMarks({})
      setModalClassId('')
      setModalExamType('')
      setModalSubjectId('')
      setClassLevel('')
      reset()
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to save result', color: 'red' })
    }
  })

  const onSubmit = (data: any) => {
    if (bulkMode) {
      const promises = Object.entries(bulkMarks).map(([studentId, marks]) => 
        resultsApi.createOrUpdate({
          student_id: studentId,
          subject_id: modalSubjectId,
          class_id: modalClassId,
          term: data.term,
          year: parseInt(data.year),
          raw_marks: marks
        })
      )
      Promise.all(promises)
        .then(() => {
          notifications.show({ title: 'Success', message: `Saved marks for ${Object.keys(bulkMarks).length} students`, color: 'green' })
          queryClient.invalidateQueries({ queryKey: ['results'] })
          setCreateModalOpen(false)
          setBulkMode(false)
          setBulkMarks({})
          setModalClassId('')
          setModalExamType('')
          setModalSubjectId('')
          setClassLevel('')
          reset()
        })
        .catch((error: any) => {
          notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to save results', color: 'red' })
        })
    } else {
      createMutation.mutate({
        student_id: data.student_id,
        subject_id: modalSubjectId,
        class_id: modalClassId,
        term: data.term,
        year: parseInt(data.year),
        raw_marks: data.raw_marks
      })
    }
  }

  const stats = {
    totalResults: resultsData?.length || 0,
    avgMarks: resultsData?.length ? (() => {
      const isNursery = ['Baby', 'Middle', 'Top'].includes(currentLevel)
      const sum = resultsData.reduce((sum: number, r: any) => {
        const marks = r.raw_marks || {}
        const total = isNursery ? (marks.mark || 0) : (marks.total || 0)
        return sum + total
      }, 0)
      return (sum / resultsData.length).toFixed(1)
    })() : 0,
    passed: resultsData?.filter((r: any) => {
      const isNursery = ['Baby', 'Middle', 'Top'].includes(currentLevel)
      const marks = r.raw_marks || {}
      const total = isNursery ? (marks.mark || 0) : (marks.total || 0)
      return total >= 50
    }).length || 0,
    failed: resultsData?.filter((r: any) => {
      const isNursery = ['Baby', 'Middle', 'Top'].includes(currentLevel)
      const marks = r.raw_marks || {}
      const total = isNursery ? (marks.mark || 0) : (marks.total || 0)
      return total < 50
    }).length || 0,
  }

  const exportToExcel = () => {
    if (!resultsData || resultsData.length === 0) {
      notifications.show({ title: 'Error', message: 'No data to export', color: 'red' })
      return
    }

    const className = classesData?.classes?.find((c: any) => c.id === selectedClass)?.name || 'Class'
    const examTypeLabel = selectedExamType || 'All'
    
    const exportData = resultsData.map((result: any) => {
      const marks = result.raw_marks || {}
      const paper = marks.paper || null
      const isAdvanced = ['S5', 'S6'].includes(currentLevel)
      const isOLevel = ['S1', 'S2', 'S3', 'S4'].includes(currentLevel)
      const isNursery = ['Baby', 'Middle', 'Top'].includes(currentLevel)
      const caLabel = isOLevel ? 'AOI' : 'CA'
      const totalLabel = isNursery ? 'Average' : 'Total'
      const row: any = {
        'Student': result.student_name || 'N/A',
        'Subject': result.subject_name,
        ...(isAdvanced && paper ? { 'Paper': `Paper ${paper}` } : {}),
        'Exam Type': result.exam_type || 'N/A',
        [caLabel]: marks.ca || 0,
        'Exam': marks.exam || 0,
        [totalLabel]: marks.total || marks.mark || 0,
        'Grade': result.final_grade
      }
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results')
    
    const filename = `${className}_${selectedTerm}_${selectedYear}_${examTypeLabel}_Results.xlsx`
    XLSX.writeFile(workbook, filename)
    
    notifications.show({ title: 'Success', message: 'Results exported successfully', color: 'green' })
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="Results Management" 
          subtitle="Manage student examination results and grades"
          action={
            <div className="flex gap-3">
              <Link href="/results/aoi">
                <button className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  📊 AOI Results
                </button>
              </Link>
              <button
                onClick={exportToExcel}
                disabled={!resultsData || resultsData.length === 0}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📥 Export Excel
              </button>
              <Link href="/marks/enter">
                <button className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  ➕ Enter Marks
                </button>
              </Link>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard title="Total Results" value={stats.totalResults} icon="📊" gradient="from-blue-500 to-blue-700" />
          <StatCard title="Average Marks" value={stats.avgMarks} icon="📈" gradient="from-green-500 to-green-700" />
          <StatCard title="Passed" value={stats.passed} icon="✅" gradient="from-purple-500 to-purple-700" />
          <StatCard title="Failed" value={stats.failed} icon="❌" gradient="from-red-500 to-red-700" />
        </div>

        <FormCard>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <FormSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
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
                ...(classesData?.classes?.map((c: any) => ({ value: c.id, label: c.name })) || [])
              ]}
            />
            <FormSelect
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value)
                setSelectedExamType('')
              }}
              label="Student"
              icon="👤"
              disabled={!selectedClass}
              options={[
                { value: 'all', label: 'All Students' },
                ...(studentsData?.students?.map((s: any) => ({ value: s.id, label: `${s.first_name}${s.middle_name ? ' ' + s.middle_name : ''} ${s.last_name}` })) || [])
              ]}
            />
            <FormSelect
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              label="Exam Type"
              icon="📝"
              disabled={!selectedClass}
              options={[
                { value: '', label: 'All Exam Types' },
                ...(classExamTypes?.map((et: string) => ({ value: et, label: et })) || [])
              ]}
            />
            <FormSelect
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              label="Subject"
              icon="📚"
              disabled={!selectedClass}
              options={[
                { value: '', label: 'All Subjects' },
                ...(() => {
                  const subjects = new Set<string>()
                  const subjectMap = new Map<string, string>()
                  if (resultsData) {
                    resultsData.forEach((r: any) => {
                      if (r.subject_id && r.subject_name) {
                        subjectMap.set(r.subject_id, r.subject_name)
                      }
                    })
                  }
                  return Array.from(subjectMap.entries()).map(([id, name]) => ({ value: id, label: name }))
                })()
              ]}
            />
          </div>

          {selectedClass && resultsData && resultsData.length > 0 && (
            <div className="overflow-x-auto">
              {['S5', 'S6'].includes(currentLevel) ? (
                // Advanced Level Table
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      {selectedStudent === 'all' && (
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                      )}
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Exam</th>
                      {(() => {
                        const allPapers = new Set<number>()
                        resultsData.forEach((result: any) => {
                          const paperNum = result.raw_marks?.paper || 1
                          allPapers.add(paperNum)
                        })
                        const sortedPapers = Array.from(allPapers).sort((a, b) => a - b)
                        return sortedPapers.map(paperNum => (
                          <th key={paperNum} className="text-center py-3 px-4 font-semibold text-gray-700">
                            P{paperNum}
                          </th>
                        ))
                      })()}
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const grouped = resultsData.reduce((acc: any, result: any) => {
                        const key = `${result.student_id || 'single'}-${result.subject_id}-${result.exam_type}`
                        if (!acc[key]) {
                          acc[key] = {
                            student_name: result.student_name,
                            subject_name: result.subject_name,
                            exam_type: result.exam_type,
                            papers: {},
                            final_grade: result.final_grade
                          }
                        }
                        const paperNum = result.raw_marks?.paper || 1
                        // Check multiple formats: mark, total, or ca+exam
                        const total = result.raw_marks?.mark || 
                                     result.raw_marks?.total || 
                                     ((result.raw_marks?.ca || 0) + (result.raw_marks?.exam || 0))
                        acc[key].papers[paperNum] = total
                        if (result.final_grade) {
                          acc[key].final_grade = result.final_grade
                        }
                        return acc
                      }, {})
                      
                      const allPapers = new Set<number>()
                      resultsData.forEach((result: any) => {
                        const paperNum = result.raw_marks?.paper || 1
                        allPapers.add(paperNum)
                      })
                      const sortedPapers = Array.from(allPapers).sort((a, b) => a - b)
                      
                      return Object.values(grouped).map((group: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          {selectedStudent === 'all' && (
                            <td className="py-3 px-4 font-medium text-gray-800">{group.student_name}</td>
                          )}
                          <td className="py-3 px-4 text-gray-700">{group.subject_name}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {group.exam_type || 'N/A'}
                            </span>
                          </td>
                          {sortedPapers.map(paperNum => (
                            <td key={paperNum} className="py-3 px-4 text-center font-medium text-gray-900">
                              {group.papers[paperNum] !== undefined ? group.papers[paperNum].toFixed(1) : '-'}
                            </td>
                          ))}
                          <td className="py-3 px-4 text-center">
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                              {group.final_grade}
                            </span>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              ) : (
                // Other Levels Table
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      {selectedStudent === 'all' && (
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Student</th>
                      )}
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Subject</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">Exam Type</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">{['S1', 'S2', 'S3', 'S4'].includes(currentLevel) ? 'AOI' : 'CA'}</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">Exam</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">{['Baby', 'Middle', 'Top'].includes(currentLevel) ? 'Average' : 'Total'}</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsData.map((result: any, idx: number) => {
                      const marks = result.raw_marks || {}
                      const isNursery = ['Baby', 'Middle', 'Top'].includes(currentLevel)
                      // For nursery, use 'mark' field; for others use 'total'
                      const total = isNursery ? (marks.mark || 0) : (marks.total || 0)
                      const ca = marks.ca || 0
                      const exam = marks.exam || 0
                      const examType = result.exam_type || 'N/A'
                      
                      return (
                        <tr key={`${result.id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                          {selectedStudent === 'all' && (
                            <td className="py-4 px-4 font-medium">{result.student_name}</td>
                          )}
                          <td className="py-4 px-4">{result.subject_name}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {examType}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-medium">{ca}</td>
                          <td className="py-4 px-4 text-center font-medium">{exam}</td>
                          <td className="py-4 px-4 font-bold text-center">{total.toFixed(1)}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              total >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.final_grade}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          
          {selectedClass && resultsData && resultsData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No results found for the selected filters.
            </div>
          )}
        </FormCard>
      </div>
    </DashboardLayout>
  )
}
