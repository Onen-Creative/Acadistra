'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormSelect, FormCard } from '@/components/ui/FormComponents'
import { ReportCardTemplate } from '@/components/ReportCard/ReportCardTemplate'
import PrimaryReportCard from '@/components/ReportCard/PrimaryReportCard'
import NurseryReportCard from '@/components/ReportCard/NurseryReportCard'
import OrdinaryLevelReportCard from '@/components/ReportCard/OrdinaryLevelReportCard'
import AdvancedLevelReportCard from '@/components/ReportCard/AdvancedLevelReportCard'
import { resultsApi, studentsApi, classesApi, subjectsApi, api } from '@/services/api'

export default function ReportCardPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedExamType, setSelectedExamType] = useState('')
  const [nextTermBegins, setNextTermBegins] = useState('')
  const [nextTermEnds, setNextTermEnds] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkPrintMode, setBulkPrintMode] = useState(false)

  const { data: schoolData } = useQuery({
    queryKey: ['school'],
    queryFn: async () => {
      const res = await api.get('/api/v1/school')
      return res.data.school || res.data
    }
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes', selectedYear, selectedTerm],
    queryFn: async () => {
      const res = await classesApi.list({ year: selectedYear, term: selectedTerm })
      return Array.isArray(res) ? { classes: res } : res
    }
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return { students: [] }
      const res = await studentsApi.list({ class_id: selectedClass, limit: -1 })
      return Array.isArray(res) ? { students: res } : res
    },
    enabled: !!selectedClass
  })

  const selectedClassData = classesData?.classes?.find((c: any) => c.id === selectedClass)
  const selectedStudentData = studentsData?.students?.find((s: any) => s.id === selectedStudent)

  const { data: allSubjectsData } = useQuery({
    queryKey: ['all-subjects', selectedClassData?.level],
    queryFn: async () => {
      if (!selectedClassData?.level) return { subjects: [] }
      const res = await subjectsApi.list({ level: selectedClassData.level })
      return Array.isArray(res) ? { subjects: res } : res
    },
    enabled: !!selectedClassData?.level
  })

  const { data: resultsData } = useQuery({
    queryKey: ['results', selectedStudent, selectedStudents, selectedYear, selectedTerm, selectedExamType, bulkPrintMode],
    queryFn: async () => {
      if (bulkPrintMode && selectedStudents.length > 0) {
        const allResults = await Promise.all(
          selectedStudents.map(async (studentId) => {
            const params: any = { year: selectedYear, term: selectedTerm }
            if (selectedExamType) params.exam_type = selectedExamType
            const res = await resultsApi.getByStudent(studentId, params)
            return {
              results: (res.results || []).map((r: any) => ({ ...r, student_id: studentId })),
              outstanding_fees: res.outstanding_fees || 0,
              student_id: studentId
            }
          })
        )
        return allResults
      }
      if (!selectedStudent) return { results: [], outstanding_fees: 0 }
      const params: any = { year: selectedYear, term: selectedTerm }
      if (selectedExamType) params.exam_type = selectedExamType
      const res = await resultsApi.getByStudent(selectedStudent, params)
      return { results: res.results || [], outstanding_fees: res.outstanding_fees || 0 }
    },
    enabled: !!(bulkPrintMode ? selectedStudents.length > 0 : selectedStudent)
  })



  const { data: examTypesData } = useQuery({
    queryKey: ['exam-types', selectedStudent, selectedClass, selectedYear, selectedTerm, bulkPrintMode],
    queryFn: async () => {
      if (bulkPrintMode && selectedClass) {
        // In bulk mode, get exam types from all students in the class
        const students = studentsData?.students || []
        if (students.length === 0) return []
        const allExamTypes = new Set<string>()
        await Promise.all(
          students.slice(0, 5).map(async (student: any) => {
            const params: any = { year: selectedYear, term: selectedTerm }
            const res = await resultsApi.getByStudent(student.id, params)
            const results = res.results || []
            results.forEach((r: any) => {
              if (r.exam_type) allExamTypes.add(r.exam_type)
            })
          })
        )
        return Array.from(allExamTypes)
      }
      if (!selectedStudent) return []
      const params: any = { year: selectedYear, term: selectedTerm }
      const res = await resultsApi.getByStudent(selectedStudent, params)
      const results = res.results || []
      return [...new Set(results.map((r: any) => r.exam_type).filter(Boolean))]
    },
    enabled: bulkPrintMode ? !!selectedClass && !!studentsData : !!selectedStudent
  })

  const currentResults = bulkPrintMode ? [] : (Array.isArray(resultsData) ? [] : resultsData?.results || [])
  const outstandingFees = bulkPrintMode ? 0 : (Array.isArray(resultsData) ? 0 : resultsData?.outstanding_fees || 0)

  const mergedSubjects = allSubjectsData?.subjects?.map((subject: any) => {
    const result = currentResults?.find((r: any) => r.subject_id === subject.id)
    return result || { subject_name: subject.name, subject_id: subject.id, raw_marks: {}, final_grade: '' }
  }) || []

  const handlePrint = () => {
    window.print()
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    )
  }

  const selectAllStudents = () => {
    setSelectedStudents(studentsData?.students?.map((s: any) => s.id) || [])
  }

  const clearSelection = () => {
    setSelectedStudents([])
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="print:hidden">
          <PageHeader 
            title="Report Cards" 
            subtitle="Generate and print student report cards"
            action={
              <div className="flex gap-3">
                {bulkPrintMode && selectedStudents.length > 0 && (
                  <button
                    onClick={handlePrint}
                    disabled={!selectedExamType || selectedStudents.length === 0}
                    className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🖨️ Print {selectedStudents.length} Report{selectedStudents.length > 1 ? 's' : ''}
                  </button>
                )}
                {!bulkPrintMode && (
                  <button
                    onClick={handlePrint}
                    disabled={!selectedStudent || !currentResults || currentResults.length === 0}
                    className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🖨️ Print Report Card
                  </button>
                )}
                <button
                  onClick={() => {
                    setBulkPrintMode(!bulkPrintMode)
                    setSelectedStudent('')
                    setSelectedStudents([])
                  }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {bulkPrintMode ? '👤 Single Mode' : '📋 Bulk Mode'}
                </button>
              </div>
            }
          />

          <FormCard>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
                onChange={(e) => {
                  setSelectedClass(e.target.value)
                  setSelectedStudent('')
                }}
                label="Class"
                icon="🏫"
                options={[
                  { value: '', label: 'Select Class' },
                  ...(classesData?.classes?.map((c: any) => ({ value: c.id, label: c.name })) || [])
                ]}
              />
              <FormSelect
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                label="Student"
                icon="👤"
                disabled={!selectedClass || bulkPrintMode}
                options={[
                  { value: '', label: 'Select Student' },
                  ...(studentsData?.students?.map((s: any) => ({ 
                    value: s.id, 
                    label: `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}` 
                  })) || [])
                ]}
              />
              <FormSelect
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                label="Exam Type"
                icon="📝"
                disabled={bulkPrintMode ? !selectedClass : !selectedStudent}
                options={[
                  { value: '', label: 'Select Exam Type' },
                  ...(examTypesData?.map((et: any) => ({ value: et, label: et })) || [])
                ]}
              />
            </div>
            {bulkPrintMode && selectedClass && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-blue-900">Select Students ({selectedStudents.length} selected)</h3>
                  <div className="flex gap-2">
                    <button onClick={selectAllStudents} className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Select All
                    </button>
                    <button onClick={clearSelection} className="text-sm px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {studentsData?.students?.map((student: any) => (
                    <label key={student.id} className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{student.first_name} {student.last_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Term Begins</label>
                <input
                  type="date"
                  value={nextTermBegins}
                  onChange={(e) => setNextTermBegins(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Term Ends</label>
                <input
                  type="date"
                  value={nextTermEnds}
                  onChange={(e) => setNextTermEnds(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </FormCard>
        </div>

        {selectedStudent && selectedExamType && mergedSubjects && mergedSubjects.length > 0 && !bulkPrintMode && (
          <div className="mt-8">
            {['Baby', 'Middle', 'Top'].includes(selectedClassData?.level || '') ? (
              <NurseryReportCard
                student={{ ...selectedStudentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level }}
                results={currentResults || []}
                subjects={allSubjectsData?.subjects || []}
                term={selectedTerm}
                year={selectedYear.toString()}
                examType={selectedExamType}
                school={schoolData}
                outstandingBalance={outstandingFees}
                nextTermBegins={nextTermBegins}
                nextTermEnds={nextTermEnds}
              />
            ) : ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(selectedClassData?.level || '') ? (
              <PrimaryReportCard
                student={{ ...selectedStudentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level, class_id: selectedClass }}
                results={currentResults || []}
                subjects={allSubjectsData?.subjects || []}
                term={selectedTerm}
                year={selectedYear.toString()}
                examType={selectedExamType}
                school={schoolData}
                outstandingBalance={outstandingFees}
                nextTermBegins={nextTermBegins}
                nextTermEnds={nextTermEnds}
              />
            ) : ['S1', 'S2', 'S3', 'S4'].includes(selectedClassData?.level || '') ? (
              <OrdinaryLevelReportCard
                student={{ ...selectedStudentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level }}
                results={currentResults || []}
                subjects={allSubjectsData?.subjects || []}
                term={selectedTerm}
                year={selectedYear.toString()}
                examType={selectedExamType}
                school={schoolData}
                outstandingBalance={outstandingFees}
                nextTermBegins={nextTermBegins}
                nextTermEnds={nextTermEnds}
              />
            ) : ['S5', 'S6'].includes(selectedClassData?.level || '') ? (
              <AdvancedLevelReportCard
                student={{ ...selectedStudentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level }}
                results={currentResults || []}
                subjects={allSubjectsData?.subjects || []}
                term={selectedTerm}
                year={selectedYear.toString()}
                examType={selectedExamType}
                school={schoolData}
                outstandingBalance={outstandingFees}
                nextTermBegins={nextTermBegins}
                nextTermEnds={nextTermEnds}
              />
            ) : (
              <ReportCardTemplate
                student={selectedStudentData}
                school={schoolData || {}}
                results={mergedSubjects}
                term={selectedTerm}
                year={selectedYear.toString()}
                level={selectedClassData?.level || ''}
                className={selectedClassData?.name || ''}
                examType={selectedExamType}
                outstandingBalance={outstandingFees}
                nextTermBegins={nextTermBegins}
                nextTermEnds={nextTermEnds}
              />
            )}
          </div>
        )}

        {bulkPrintMode && selectedStudents.length > 0 && selectedExamType && (
          <div className="mt-8">
            {selectedStudents.map((studentId, index) => {
              const studentData = studentsData?.students?.find((s: any) => s.id === studentId)
              if (!studentData) return null
              
              const studentResultData = Array.isArray(resultsData) ? resultsData?.find((r: any) => r.student_id === studentId) : null
              const studentResults = studentResultData?.results || []
              const studentOutstandingFees = studentResultData?.outstanding_fees || 0
              const isLastStudent = index === selectedStudents.length - 1
              
              return (
                <div key={studentId} className={!isLastStudent ? 'print:break-after-page' : ''}>
                  {['Baby', 'Middle', 'Top'].includes(selectedClassData?.level || '') ? (
                    <NurseryReportCard
                      student={{ ...studentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level }}
                      results={studentResults}
                      subjects={allSubjectsData?.subjects || []}
                      term={selectedTerm}
                      year={selectedYear.toString()}
                      examType={selectedExamType}
                      school={schoolData}
                      outstandingBalance={studentOutstandingFees}
                      nextTermBegins={nextTermBegins}
                      nextTermEnds={nextTermEnds}
                    />
                  ) : ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(selectedClassData?.level || '') ? (
                    <PrimaryReportCard
                      student={{ ...studentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level, class_id: selectedClass }}
                      results={studentResults}
                      subjects={allSubjectsData?.subjects || []}
                      term={selectedTerm}
                      year={selectedYear.toString()}
                      examType={selectedExamType}
                      school={schoolData}
                      outstandingBalance={studentOutstandingFees}
                      nextTermBegins={nextTermBegins}
                      nextTermEnds={nextTermEnds}
                    />
                  ) : ['S1', 'S2', 'S3', 'S4'].includes(selectedClassData?.level || '') ? (
                    <OrdinaryLevelReportCard
                      student={{ ...studentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level }}
                      results={studentResults}
                      subjects={allSubjectsData?.subjects || []}
                      term={selectedTerm}
                      year={selectedYear.toString()}
                      examType={selectedExamType}
                      school={schoolData}
                      outstandingBalance={studentOutstandingFees}
                      nextTermBegins={nextTermBegins}
                      nextTermEnds={nextTermEnds}
                    />
                  ) : ['S5', 'S6'].includes(selectedClassData?.level || '') ? (
                    <AdvancedLevelReportCard
                      student={{ ...studentData, class_name: selectedClassData?.name, class_level: selectedClassData?.level }}
                      results={studentResults}
                      subjects={allSubjectsData?.subjects || []}
                      term={selectedTerm}
                      year={selectedYear.toString()}
                      examType={selectedExamType}
                      school={schoolData}
                      outstandingBalance={studentOutstandingFees}
                      nextTermBegins={nextTermBegins}
                      nextTermEnds={nextTermEnds}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {selectedStudent && selectedExamType && (!mergedSubjects || mergedSubjects.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No subjects found for this class level.
          </div>
        )}

        {(!selectedStudent || !selectedExamType) && (
          <div className="text-center py-12 text-gray-500 print:hidden">
            Please select a student and exam type to view the report card.
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
