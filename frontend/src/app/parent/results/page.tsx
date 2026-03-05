'use client'

import { useState, useEffect, Fragment } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { Award, BookOpen } from 'lucide-react'

export default function ParentResultsPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedExamType, setSelectedExamType] = useState('')
  const [examTypes, setExamTypes] = useState<string[]>([])

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) loadResults()
  }, [selectedChild, term, year, selectedExamType])

  const loadChildren = async () => {
    try {
      const res = await api.get('/parent/dashboard')
      const childrenData = res.data?.children || []
      setChildren(childrenData)
      if (childrenData.length > 0) setSelectedChild(childrenData[0])
    } catch (error) {
      console.error('Load children error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadResults = async () => {
    if (!selectedChild) return
    try {
      const res = await api.get(`/parent/children/${selectedChild.id}/results`, { params: { term, year } })
      const rawResults = res.data?.results || []
      
      // Extract unique exam types
      const types = [...new Set(rawResults.map((r: any) => r.exam_type).filter(Boolean))] as string[]
      setExamTypes(types)
      
      // Filter by exam type if selected
      const filtered = selectedExamType ? rawResults.filter((r: any) => r.exam_type === selectedExamType) : rawResults
      setResults(filtered)
    } catch (error) {
      console.error('Load results error:', error)
    }
  }

  const getGradeColor = (grade: string) => {
    if (!grade) return 'bg-gray-100 text-gray-700'
    const firstChar = grade.charAt(0)
    if (firstChar === 'D' || firstChar === '1') return 'bg-green-100 text-green-700'
    if (firstChar === 'C' || firstChar === '2') return 'bg-blue-100 text-blue-700'
    if (firstChar === 'P' || firstChar === '3') return 'bg-yellow-100 text-yellow-700'
    if (firstChar === 'F' || firstChar === '4') return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const currentLevel = selectedChild?.class_name?.match(/S[56]/)?.[0] || ''
  const isAdvancedLevel = ['S5', 'S6'].includes(currentLevel)
  
  const principalResults = isAdvancedLevel ? results.filter((r: any) => {
    const subject = r.subject || r.standard_subject
    return subject?.grading_type !== 'subsidiary'
  }) : results
  
  const subsidiaryResults = isAdvancedLevel ? results.filter((r: any) => {
    const subject = r.subject || r.standard_subject
    return subject?.grading_type === 'subsidiary'
  }) : []

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl text-white">
          <h1 className="text-4xl font-bold mb-3">Academic Results</h1>
          <p className="text-blue-100 text-lg">View your child's academic performance</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
              <select value={selectedChild?.id || ''} onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.first_name} {child.last_name} - {child.class_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold">
                <option value="">All Exam Types</option>
                {examTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">{isAdvancedLevel ? 'Principal Subjects' : 'Subject Results'}</h3>
          <div className="overflow-x-auto">
            {isAdvancedLevel ? (
              // Advanced Level (S5-S6) Table with Papers
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 border-r-2 border-gray-300" rowSpan={2}>Subject</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r-2 border-gray-300" rowSpan={2}>Exam Type</th>
                    {(() => {
                      const grouped = principalResults.reduce((acc: any, result: any) => {
                        const key = `${result.subject_id}-${result.exam_type}`
                        if (!acc[key]) acc[key] = { papers: {} }
                        const paperNum = result.raw_marks?.paper || result.paper || 1
                        acc[key].papers[paperNum] = true
                        return acc
                      }, {})
                      const allPapers = new Set<number>()
                      Object.values(grouped).forEach((g: any) => {
                        Object.keys(g.papers).forEach(p => allPapers.add(parseInt(p)))
                      })
                      const sortedPapers = Array.from(allPapers).sort((a, b) => a - b)
                      return sortedPapers.map(paperNum => (
                        <th key={paperNum} className="text-center py-3 px-4 font-semibold text-gray-700 border-r-2 border-gray-300" colSpan={3}>
                          Paper {paperNum}
                        </th>
                      ))
                    })()}
                    <th className="text-center py-3 px-4 font-semibold text-gray-700" rowSpan={2}>Grade</th>
                  </tr>
                  <tr className="bg-gray-50 border-b-2 border-gray-300">
                    {(() => {
                      const grouped = principalResults.reduce((acc: any, result: any) => {
                        const key = `${result.subject_id}-${result.exam_type}`
                        if (!acc[key]) acc[key] = { papers: {} }
                        const paperNum = result.raw_marks?.paper || result.paper || 1
                        acc[key].papers[paperNum] = true
                        return acc
                      }, {})
                      const allPapers = new Set<number>()
                      Object.values(grouped).forEach((g: any) => {
                        Object.keys(g.papers).forEach(p => allPapers.add(parseInt(p)))
                      })
                      const sortedPapers = Array.from(allPapers).sort((a, b) => a - b)
                      return sortedPapers.map(paperNum => (
                        <Fragment key={paperNum}>
                          <th className="text-center py-2 px-2 font-medium text-gray-600 text-sm border-r border-gray-200">CA</th>
                          <th className="text-center py-2 px-2 font-medium text-gray-600 text-sm border-r border-gray-200">Exam</th>
                          <th className="text-center py-2 px-2 font-medium text-gray-600 text-sm border-r-2 border-gray-300">Total</th>
                        </Fragment>
                      ))
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const grouped = principalResults.reduce((acc: any, result: any) => {
                      const key = `${result.subject_id}-${result.exam_type}`
                      if (!acc[key]) {
                        acc[key] = {
                          subject_name: result.subject?.name || result.standard_subject?.name || 'N/A',
                          exam_type: result.exam_type,
                          papers: {},
                          final_grade: result.final_grade
                        }
                      }
                      const paperNum = result.raw_marks?.paper || result.paper || 1
                      acc[key].papers[paperNum] = {
                        ca: result.raw_marks?.ca || 0,
                        exam: result.raw_marks?.exam || 0
                      }
                      if (result.final_grade) acc[key].final_grade = result.final_grade
                      return acc
                    }, {})
                    
                    const allPapers = new Set<number>()
                    Object.values(grouped).forEach((g: any) => {
                      Object.keys(g.papers).forEach(p => allPapers.add(parseInt(p)))
                    })
                    const sortedPapers = Array.from(allPapers).sort((a, b) => a - b)
                    
                    return Object.values(grouped).map((group: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700 border-r-2 border-gray-300">{group.subject_name}</td>
                        <td className="py-3 px-4 text-center border-r-2 border-gray-300">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {group.exam_type || 'N/A'}
                          </span>
                        </td>
                        {sortedPapers.map(paperNum => (
                          <Fragment key={paperNum}>
                            <td className="py-3 px-2 text-center text-gray-700 border-r border-gray-200">{group.papers[paperNum]?.ca || 0}</td>
                            <td className="py-3 px-2 text-center text-gray-700 border-r border-gray-200">{group.papers[paperNum]?.exam || 0}</td>
                            <td className="py-3 px-2 text-center font-semibold text-gray-900 border-r-2 border-gray-300">
                              {group.papers[paperNum] ? (group.papers[paperNum].ca + group.papers[paperNum].exam).toFixed(1) : '0.0'}
                            </td>
                          </Fragment>
                        ))}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(group.final_grade)}`}>
                            {group.final_grade || 'N/A'}
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
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Subject</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Exam Type</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">CA</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Exam</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Total</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result: any, idx: number) => {
                    const marks = result.raw_marks || {}
                    const total = marks.total || 0
                    const ca = marks.ca || 0
                    const exam = marks.exam || 0
                    
                    return (
                      <tr key={`${result.id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">{result.subject?.name || result.standard_subject?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {result.exam_type || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-medium">{ca}</td>
                        <td className="py-4 px-4 text-center font-medium">{exam}</td>
                        <td className="py-4 px-4 font-bold text-center">{total.toFixed(1)}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(result.final_grade)}`}>
                            {result.final_grade || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {results.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No results available for this term</p>
              </div>
            )}
          </div>
        </div>

        {isAdvancedLevel && subsidiaryResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Subsidiary Subjects</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Subject</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Exam Type</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Marks</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {subsidiaryResults.map((result: any, idx: number) => {
                    const marks = result.raw_marks || {}
                    const total = marks.total || marks.exam || 0
                    
                    return (
                      <tr key={`${result.id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-gray-900">{result.subject?.name || result.standard_subject?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            {result.exam_type || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-center">{total.toFixed(1)}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(result.final_grade)}`}>
                            {result.final_grade || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
