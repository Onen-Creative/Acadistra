'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Users, 
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Award,
  Target,
  Activity,
  GraduationCap,
  FileText,
  Calendar
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'

interface GradeAnalytics {
  grade_context: {
    class_name: string
    level: string
    stream: string
    year: number
    term: string
    total_students: number
    grade_summary: Record<string, number>
  }
  subject_overview: Array<{
    subject_id: string
    subject_name: string
    average_score: number
    previous_average?: number
    average_change?: number
    highest_score: number
    lowest_score: number
    pass_rate: number
    student_count: number
  }>
  grade_distribution: Record<string, {
    a: number
    b: number
    c: number
    d: number
    e?: number  // For Advanced Level
    o?: number  // For Advanced Level
    f: number
    // Primary level grades
    d1?: number
    d2?: number
    c3?: number
    c4?: number
    c5?: number
    c6?: number
    p7?: number
    p8?: number
    f9?: number
    // Nursery level grades
    mastering?: number
    secure?: number
    developing?: number
    emerging?: number
    not_yet?: number
  }>
  subject_ranking: Array<{
    subject_name: string
    average_score: number
    previous_average?: number
    average_change?: number
    pass_rate: number
    rank: number
    previous_rank?: number
    rank_change?: number
  }>
  difficulty_index: Array<{
    subject_name: string
    fail_rate: number
    avg_score: number
    difficulty: string
  }>
  top_performers: Record<string, Array<{
    student_id: string
    student_name: string
    score: number
    grade: string
  }>>
  grade_insights: string[]
  student_details?: Array<{
    student_id: string
    student_name: string
    admission_no: string
    gender: string
    subjects: Array<{
      subject_id: string
      subject_name: string
      papers?: number[]
      ca?: number
      exam?: number
      total: number
      grade: string
      points?: number
    }>
    total_points?: number
    average_marks: number
    overall_grade?: string
    rank: number
  }>
  advanced_subject_analysis?: Array<{
    subject_id: string
    subject_name: string
    is_subsidiary: boolean
    total_students: number
    paper_averages: number[]
    overall_average: number
    grade_distribution: Record<string, number>
    pass_rate: number
    fail_rate: number
    rank: number
    ranking_criteria: string
  }>
}

export default function PerformanceAnalytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'classes' | 'grades'>('overview')
  const [loading, setLoading] = useState(false)
  const [gradeAnalytics, setGradeAnalytics] = useState<GradeAnalytics | null>(null)
  
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedExamType, setSelectedExamType] = useState('')
  const [examTypes, setExamTypes] = useState<string[]>([])

  useEffect(() => {
    fetchClasses()
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchExamTypes()
    }
  }, [selectedClass, selectedYear, selectedTerm])

  useEffect(() => {
    if (selectedClass && activeTab === 'classes') {
      fetchGradeAnalytics()
    }
  }, [selectedClass, selectedYear, selectedTerm, selectedExamType, activeTab])

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      const data = await res.json()
      const classesList = Array.isArray(data) ? data : (data.classes || [])
      setClasses(classesList)
      if (classesList.length > 0) setSelectedClass(classesList[0].id)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
    }
  }

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/subjects/school`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      const data = await res.json()
      const subjectsList = Array.isArray(data) ? data : []
      setSubjects(subjectsList)
      if (subjectsList.length > 0) setSelectedSubject(subjectsList[0].id)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
    }
  }

  const fetchExamTypes = async () => {
    if (!selectedClass) return
    
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/results/exam-types?class_id=${selectedClass}&year=${selectedYear}&term=${selectedTerm}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }
      )
      if (res.ok) {
        const data = await res.json()
        const types = Array.isArray(data) ? data : (data.exam_types || [])
        setExamTypes(types)
        if (types.length > 0 && !selectedExamType) {
          setSelectedExamType(types[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch exam types:', error)
    }
  }

  const fetchGradeAnalytics = async () => {
    if (!selectedClass) return
    
    setLoading(true)
    try {
      let url = `${API_BASE_URL}/api/v1/analytics/grade?class_id=${selectedClass}&year=${selectedYear}&term=${selectedTerm}`
      if (selectedExamType) {
        url += `&exam_type=${selectedExamType}`
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Grade Analytics Data:', data)
        setGradeAnalytics(data)
      } else {
        console.error('Failed to fetch analytics:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch grade analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = async () => {
    if (!selectedClass) return
    
    try {
      const className = classes.find(c => c.id === selectedClass)?.name || 'Class'
      let url = `${API_BASE_URL}/api/v1/analytics/grade/export?class_id=${selectedClass}&year=${selectedYear}&term=${selectedTerm}&class_name=${encodeURIComponent(className)}`
      if (selectedExamType) {
        url += `&exam_type=${selectedExamType}`
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      
      if (res.ok) {
        const blob = await res.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `Analytics_${className}_${selectedTerm}_${selectedYear}.xlsx`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        console.error('Failed to export analytics:', res.status, res.statusText)
        alert('Failed to export analytics. Please try again.')
      }
    } catch (error) {
      console.error('Failed to export analytics:', error)
      alert('Failed to export analytics. Please try again.')
    }
  }



  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Very Difficult': return 'bg-red-100 text-red-800 border-red-200'
      case 'Difficult': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Performance Analytics</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive class, subject, and student performance insights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {gradeAnalytics && (
              <button
                onClick={exportToExcel}
                className="px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            <a
              href="/analytics/class-rankings"
              className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Student Rankings</span>
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                disabled={!selectedClass || examTypes.length === 0}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">All Exam Types</option>
                {examTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <button
                onClick={fetchGradeAnalytics}
                disabled={!selectedClass || loading}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load Analytics'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px min-w-max">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('classes')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'classes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span className="hidden sm:inline">Class Performance</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'subjects'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Subject Analysis</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('grades')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'grades'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Grade Distribution</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Overview Tab */}
            {!loading && activeTab === 'overview' && gradeAnalytics && (
              <div className="space-y-6">
                {/* Class Context */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Class Overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Class</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{gradeAnalytics.grade_context.class_name}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Level</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{gradeAnalytics.grade_context.level}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Total Students</p>
                      <p className="text-base sm:text-lg font-bold text-blue-600">{gradeAnalytics.grade_context.total_students}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Term</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{gradeAnalytics.grade_context.term} {gradeAnalytics.grade_context.year}</p>
                    </div>
                  </div>
                </div>

                {/* Grade Summary */}
                {gradeAnalytics.grade_context.grade_summary && Object.keys(gradeAnalytics.grade_context.grade_summary).length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Grade Summary Across All Subjects</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-3">
                      {['S5', 'S6'].includes(gradeAnalytics.grade_context.level) ? (
                        // Advanced Level: A, B, C, D, E, O, F
                        ['A', 'B', 'C', 'D', 'E', 'O', 'F'].map((grade) => {
                          const count = gradeAnalytics.grade_context.grade_summary[grade] || 0
                          return (
                            <div key={grade} className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                              grade === 'A' ? 'bg-green-50 border-green-300' :
                              grade === 'B' ? 'bg-blue-50 border-blue-300' :
                              grade === 'C' ? 'bg-cyan-50 border-cyan-300' :
                              grade === 'D' ? 'bg-yellow-50 border-yellow-300' :
                              grade === 'E' ? 'bg-orange-50 border-orange-300' :
                              grade === 'O' ? 'bg-purple-50 border-purple-300' :
                              'bg-red-50 border-red-300'
                            }`}>
                              <p className="text-xs text-gray-600 mb-1">Grade {grade}</p>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                grade === 'A' ? 'text-green-700' :
                                grade === 'B' ? 'text-blue-700' :
                                grade === 'C' ? 'text-cyan-700' :
                                grade === 'D' ? 'text-yellow-700' :
                                grade === 'E' ? 'text-orange-700' :
                                grade === 'O' ? 'text-purple-700' :
                                'text-red-700'
                              }`}>{count}</p>
                            </div>
                          )
                        })
                      ) : ['S1', 'S2', 'S3', 'S4'].includes(gradeAnalytics.grade_context.level) ? (
                        // O-Level: A, B, C, D, E
                        ['A', 'B', 'C', 'D', 'E'].map((grade) => {
                          const count = gradeAnalytics.grade_context.grade_summary[grade] || 0
                          return (
                            <div key={grade} className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                              grade === 'A' ? 'bg-green-50 border-green-300' :
                              grade === 'B' ? 'bg-blue-50 border-blue-300' :
                              grade === 'C' ? 'bg-yellow-50 border-yellow-300' :
                              grade === 'D' ? 'bg-orange-50 border-orange-300' :
                              'bg-red-50 border-red-300'
                            }`}>
                              <p className="text-xs text-gray-600 mb-1">Grade {grade}</p>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                grade === 'A' ? 'text-green-700' :
                                grade === 'B' ? 'text-blue-700' :
                                grade === 'C' ? 'text-yellow-700' :
                                grade === 'D' ? 'text-orange-700' :
                                'text-red-700'
                              }`}>{count}</p>
                            </div>
                          )
                        })
                      ) : ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(gradeAnalytics.grade_context.level) ? (
                        // Primary: D1, D2, C3, C4, C5, C6, P7, P8, F9
                        ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'].map((grade) => {
                          const count = gradeAnalytics.grade_context.grade_summary[grade] || 0
                          return (
                            <div key={grade} className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                              grade === 'D1' || grade === 'D2' ? 'bg-green-50 border-green-300' :
                              grade === 'C3' || grade === 'C4' || grade === 'C5' || grade === 'C6' ? 'bg-blue-50 border-blue-300' :
                              grade === 'P7' || grade === 'P8' ? 'bg-orange-50 border-orange-300' :
                              'bg-red-50 border-red-300'
                            }`}>
                              <p className="text-xs text-gray-600 mb-1">{grade}</p>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                grade === 'D1' || grade === 'D2' ? 'text-green-700' :
                                grade === 'C3' || grade === 'C4' || grade === 'C5' || grade === 'C6' ? 'text-blue-700' :
                                grade === 'P7' || grade === 'P8' ? 'text-orange-700' :
                                'text-red-700'
                              }`}>{count}</p>
                            </div>
                          )
                        })
                      ) : ['Baby', 'Middle', 'Top'].includes(gradeAnalytics.grade_context.level) ? (
                        // Nursery: Mastering, Secure, Developing, Emerging, Not Yet
                        [{key: 'Mastering', label: 'Mastering'}, {key: 'Secure', label: 'Secure'}, {key: 'Developing', label: 'Developing'}, {key: 'Emerging', label: 'Emerging'}, {key: 'Not Yet', label: 'Not Yet'}].map((grade) => {
                          const count = gradeAnalytics.grade_context.grade_summary[grade.key] || 0
                          return (
                            <div key={grade.key} className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                              grade.key === 'Mastering' ? 'bg-purple-50 border-purple-300' :
                              grade.key === 'Secure' ? 'bg-green-50 border-green-300' :
                              grade.key === 'Developing' ? 'bg-blue-50 border-blue-300' :
                              grade.key === 'Emerging' ? 'bg-yellow-50 border-yellow-300' :
                              'bg-red-50 border-red-300'
                            }`}>
                              <p className="text-xs text-gray-600 mb-1">{grade.label}</p>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                grade.key === 'Mastering' ? 'text-purple-700' :
                                grade.key === 'Secure' ? 'text-green-700' :
                                grade.key === 'Developing' ? 'text-blue-700' :
                                grade.key === 'Emerging' ? 'text-yellow-700' :
                                'text-red-700'
                              }`}>{count}</p>
                            </div>
                          )
                        })
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Advanced Level Student Details - Show FIRST for S5/S6 */}
                {['S5', 'S6'].includes(gradeAnalytics.grade_context.level) && gradeAnalytics.student_details && gradeAnalytics.student_details.length > 0 ? (
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Advanced Level Student Performance Breakdown</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-blue-900 font-medium text-sm sm:text-base">UACE Grading System</p>
                          <p className="text-blue-800 text-xs sm:text-sm mt-1">Each subject has 2-3 papers. Points: A=6, B=5, C=4, D=3, E=2, O=1, F=0</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {gradeAnalytics.student_details.map((student) => (
                        <div key={student.student_id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          {/* Student Header */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-base sm:text-lg font-bold flex-shrink-0 ${
                                  student.rank === 1 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                                  student.rank === 2 ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' :
                                  student.rank === 3 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                                  'bg-blue-50 text-blue-800 border-2 border-blue-200'
                                }`}>
                                  {student.rank}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="text-base sm:text-lg font-bold text-gray-900 truncate">{student.student_name}</h4>
                                  <p className="text-xs sm:text-sm text-gray-600 truncate">Admission No: {student.admission_no} | {student.gender}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div>
                                  <p className="text-xs text-gray-600">Total Points</p>
                                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{student.total_points}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Average</p>
                                  <p className="text-lg sm:text-2xl font-bold text-green-600">{student.average_marks.toFixed(1)}%</p>
                                </div>
                                {student.overall_grade && (
                                  <div>
                                    <p className="text-xs text-gray-600">Grade</p>
                                    <span className="inline-block px-2 sm:px-4 py-1 sm:py-2 bg-green-100 text-green-800 text-base sm:text-xl font-bold rounded-lg">
                                      {student.overall_grade}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Subject Details Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase">Subject</th>
                                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase">Paper 1</th>
                                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase">Paper 2</th>
                                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase">Paper 3</th>
                                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase">Average</th>
                                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase">Grade</th>
                                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase">Points</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {student.subjects.map((subject, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{subject.subject_name}</td>
                                    {subject.papers && subject.papers.length > 0 ? (
                                      <>
                                        <td className="py-3 px-4 text-center text-gray-700">{subject.papers[0]?.toFixed(0) || '-'}</td>
                                        <td className="py-3 px-4 text-center text-gray-700">{subject.papers[1]?.toFixed(0) || '-'}</td>
                                        <td className="py-3 px-4 text-center text-gray-700">{subject.papers[2]?.toFixed(0) || '-'}</td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="py-3 px-4 text-center text-gray-400">-</td>
                                        <td className="py-3 px-4 text-center text-gray-400">-</td>
                                        <td className="py-3 px-4 text-center text-gray-400">-</td>
                                      </>
                                    )}
                                    <td className="py-3 px-4 text-center font-bold text-blue-600">{subject.total.toFixed(1)}%</td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        subject.grade === 'A' ? 'bg-green-100 text-green-800' :
                                        subject.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                        subject.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                        subject.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {subject.grade}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-purple-600">{subject.points || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                <tr>
                                  <td colSpan={4} className="py-3 px-4 text-right font-bold text-gray-900">TOTALS:</td>
                                  <td className="py-3 px-4 text-center font-bold text-blue-700 text-lg">{student.average_marks.toFixed(1)}%</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                                      {student.overall_grade || '-'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-purple-700 text-lg">{student.total_points}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Show Subject Overview Cards for non-Advanced Level OR if no student details */
                  <>
                    {/* Subject Overview Cards */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Subject Performance Summary</h3>
                      {gradeAnalytics.subject_overview && gradeAnalytics.subject_overview.length > 0 ? (
                        <>
                          {!gradeAnalytics.subject_overview.some(s => s.average_change !== null && s.average_change !== undefined) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                              <p className="text-xs sm:text-sm text-blue-800">
                                <span className="font-semibold">Note:</span> No previous exam data available for comparison. Performance trends will appear once there are results from multiple exam periods.
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {gradeAnalytics.subject_overview.map((subject, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-3 truncate" title={subject.subject_name}>{subject.subject_name}</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm text-gray-600">Average</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm sm:text-base text-blue-600">{subject.average_score.toFixed(1)}%</span>
                                    {subject.average_change !== null && subject.average_change !== undefined && (
                                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                                        subject.average_change > 0 ? 'text-green-600' : subject.average_change < 0 ? 'text-red-600' : 'text-gray-600'
                                      }`}>
                                        {subject.average_change > 0 ? (
                                          <><TrendingUp className="w-3 h-3" /> +{subject.average_change.toFixed(1)}%</>
                                        ) : subject.average_change < 0 ? (
                                          <><TrendingDown className="w-3 h-3" /> {subject.average_change.toFixed(1)}%</>
                                        ) : (
                                          <span className="text-gray-500">→</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs sm:text-sm text-gray-600">Pass Rate</span>
                                  <span className="font-bold text-sm sm:text-base text-green-600">{subject.pass_rate.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs sm:text-sm text-gray-600">Range</span>
                                  <span className="text-xs sm:text-sm text-gray-900">{subject.lowest_score.toFixed(0)}-{subject.highest_score.toFixed(0)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        </>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                          <p className="text-yellow-900 font-medium">No subject data available</p>
                          <p className="text-yellow-700 text-sm mt-1">There are no marks recorded for this class in the selected term.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Insights */}
                {gradeAnalytics.grade_insights && gradeAnalytics.grade_insights.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Key Insights</h3>
                    <div className="space-y-3">
                      {gradeAnalytics.grade_insights.map((insight, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs sm:text-sm text-blue-900">{insight}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Class Performance Tab */}
            {!loading && activeTab === 'classes' && gradeAnalytics && (
              <div className="space-y-6">
                {/* Subject Ranking */}
                {gradeAnalytics.subject_ranking && gradeAnalytics.subject_ranking.length > 0 ? (
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Subject Rankings by Performance</h3>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Rank</th>
                              <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Subject</th>
                              <th className="text-center py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Average Score</th>
                              <th className="text-center py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Pass Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                          {gradeAnalytics.subject_ranking.map((subject, idx) => (
                            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-3 sm:px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold ${
                                    idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                                    idx === 1 ? 'bg-gray-100 text-gray-800' :
                                    idx === 2 ? 'bg-orange-100 text-orange-800' :
                                    'bg-blue-50 text-blue-800'
                                  }`}>
                                    {subject.rank}
                                  </span>
                                  {subject.rank_change !== null && subject.rank_change !== undefined && subject.rank_change !== 0 && (
                                    <span className={`text-xs font-semibold flex items-center gap-1 ${
                                      subject.rank_change > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {subject.rank_change > 0 ? (
                                        <><TrendingUp className="w-3 h-3" /> +{subject.rank_change}</>
                                      ) : (
                                        <><TrendingDown className="w-3 h-3" /> {subject.rank_change}</>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">{subject.subject_name}</td>
                              <td className="py-3 px-3 sm:px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-base sm:text-lg font-bold text-blue-600">{subject.average_score.toFixed(1)}%</span>
                                  {subject.average_change !== null && subject.average_change !== undefined && (
                                    <span className={`text-xs font-semibold ${
                                      subject.average_change > 0 ? 'text-green-600' : subject.average_change < 0 ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {subject.average_change > 0 ? `+${subject.average_change.toFixed(1)}%` : 
                                       subject.average_change < 0 ? `${subject.average_change.toFixed(1)}%` : '0%'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center">
                                <span className="text-base sm:text-lg font-bold text-green-600">{subject.pass_rate.toFixed(1)}%</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-yellow-900 font-medium">No ranking data available</p>
                    <p className="text-yellow-700 text-sm mt-1">There are no marks recorded for this class.</p>
                  </div>
                )}

                {/* Difficulty Index */}
                {gradeAnalytics.difficulty_index && gradeAnalytics.difficulty_index.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Subject Difficulty Analysis</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {gradeAnalytics.difficulty_index.map((subject, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate" title={subject.subject_name}>{subject.subject_name}</h4>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border self-start ${getDifficultyColor(subject.difficulty)}`}>
                              {subject.difficulty}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-gray-600">Fail Rate</span>
                              <span className="font-bold text-red-600">{subject.fail_rate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-gray-600">Average Score</span>
                              <span className="font-bold text-blue-600">{subject.avg_score.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subject Analysis Tab */}
            {!loading && activeTab === 'subjects' && gradeAnalytics && (
              <div className="space-y-6">
                {/* Advanced Level Subject Analysis */}
                {['S5', 'S6'].includes(gradeAnalytics.grade_context.level) && gradeAnalytics.advanced_subject_analysis && gradeAnalytics.advanced_subject_analysis.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-blue-900 font-medium text-sm sm:text-base">UACE Subject Analysis</p>
                          <p className="text-blue-800 text-xs sm:text-sm mt-1">
                            <strong>Principal subjects:</strong> Ranked by average marks. Pass grades: A-E | Fail grades: O, F<br />
                            <strong>Subsidiary subjects:</strong> Ranked by pass rate. Pass grade: O | Fail grade: F
                          </p>
                        </div>
                      </div>
                    </div>

                    {gradeAnalytics.advanced_subject_analysis.map((subject, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Subject Header */}
                        <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 ${
                          subject.is_subsidiary ? 'bg-purple-50' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-base sm:text-lg font-bold flex-shrink-0 ${
                                subject.rank === 1 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                                subject.rank === 2 ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' :
                                subject.rank === 3 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                                'bg-blue-50 text-blue-800 border-2 border-blue-200'
                              }`}>
                                {subject.rank}
                              </span>
                              <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{subject.subject_name}</h3>
                                <p className="text-xs sm:text-sm text-gray-600">
                                  {subject.is_subsidiary ? 'Subsidiary Subject' : 'Principal Subject'} • {subject.total_students} students
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-xs sm:text-sm text-gray-600">Overall Average</p>
                              <p className="text-xl sm:text-2xl font-bold text-blue-600">{subject.overall_average.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                          {/* Paper Averages */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Average Marks per Paper</h4>
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                              {subject.paper_averages.map((avg, pIdx) => (
                                <div key={pIdx} className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
                                  <p className="text-xs text-gray-600 mb-1">Paper {pIdx + 1}</p>
                                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{avg.toFixed(1)}%</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Grade Distribution */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Grade Distribution</h4>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                              {['A', 'B', 'C', 'D', 'E', 'O', 'F'].map((grade) => {
                                const count = subject.grade_distribution[grade] || 0
                                const percentage = subject.total_students > 0 ? (count / subject.total_students * 100) : 0
                                return (
                                  <div key={grade} className="text-center">
                                    <div className={`rounded-lg p-2 sm:p-3 border-2 ${
                                      grade === 'A' ? 'bg-green-50 border-green-300' :
                                      grade === 'B' ? 'bg-blue-50 border-blue-300' :
                                      grade === 'C' ? 'bg-cyan-50 border-cyan-300' :
                                      grade === 'D' ? 'bg-yellow-50 border-yellow-300' :
                                      grade === 'E' ? 'bg-orange-50 border-orange-300' :
                                      grade === 'O' ? 'bg-purple-50 border-purple-300' :
                                      'bg-red-50 border-red-300'
                                    }`}>
                                      <p className={`text-xl sm:text-2xl font-bold ${
                                        grade === 'A' ? 'text-green-700' :
                                        grade === 'B' ? 'text-blue-700' :
                                        grade === 'C' ? 'text-cyan-700' :
                                        grade === 'D' ? 'text-yellow-700' :
                                        grade === 'E' ? 'text-orange-700' :
                                        grade === 'O' ? 'text-purple-700' :
                                        'text-red-700'
                                      }`}>{count}</p>
                                      <p className="text-xs text-gray-600 mt-1">Grade {grade}</p>
                                      <p className="text-xs text-gray-500">{percentage.toFixed(0)}%</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Visual Grade Bar */}
                          <div>
                            <div className="h-8 flex rounded-lg overflow-hidden">
                              {['A', 'B', 'C', 'D', 'E', 'O', 'F'].map((grade) => {
                                const count = subject.grade_distribution[grade] || 0
                                const percentage = subject.total_students > 0 ? (count / subject.total_students * 100) : 0
                                if (count === 0) return null
                                return (
                                  <div
                                    key={grade}
                                    className={`flex items-center justify-center text-xs font-bold text-white ${
                                      grade === 'A' ? 'bg-green-500' :
                                      grade === 'B' ? 'bg-blue-500' :
                                      grade === 'C' ? 'bg-cyan-500' :
                                      grade === 'D' ? 'bg-yellow-500' :
                                      grade === 'E' ? 'bg-orange-500' :
                                      grade === 'O' ? 'bg-purple-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  >
                                    {percentage >= 5 && grade}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Pass/Fail Statistics */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                              <p className="text-xs sm:text-sm text-green-700 font-medium mb-1">
                                {subject.is_subsidiary ? 'Pass Rate (O)' : 'Pass Rate (A-E)'}
                              </p>
                              <p className="text-2xl sm:text-3xl font-bold text-green-700">{subject.pass_rate.toFixed(1)}%</p>
                              <p className="text-xs text-green-600 mt-1">
                                {Math.round(subject.total_students * subject.pass_rate / 100)} students
                              </p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                              <p className="text-xs sm:text-sm text-red-700 font-medium mb-1">
                                {subject.is_subsidiary ? 'Fail Rate (F)' : 'Fail Rate (O + F)'}
                              </p>
                              <p className="text-2xl sm:text-3xl font-bold text-red-700">{subject.fail_rate.toFixed(1)}%</p>
                              <p className="text-xs text-red-600 mt-1">
                                {Math.round(subject.total_students * subject.fail_rate / 100)} students
                              </p>
                            </div>
                          </div>

                          {/* Ranking Info */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs sm:text-sm text-blue-900">
                              <span className="font-semibold">Ranking:</span> #{subject.rank} based on {subject.ranking_criteria === 'average' ? 'overall average marks' : 'pass rate (O)'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Top Performers for other levels */
                  gradeAnalytics.top_performers && Object.keys(gradeAnalytics.top_performers).length > 0 ? (
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Top Performers by Subject</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {Object.entries(gradeAnalytics.top_performers).map(([subjectName, performers]) => (
                          <div key={subjectName} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                              <span className="truncate" title={subjectName}>{subjectName}</span>
                            </h4>
                            <div className="space-y-2">
                              {performers.map((student, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                      idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                                      idx === 1 ? 'bg-gray-100 text-gray-800' :
                                      'bg-orange-100 text-orange-800'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{student.student_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <span className="text-xs sm:text-sm font-bold text-blue-600">{student.score.toFixed(1)}%</span>
                                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">{student.grade}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                      <p className="text-yellow-900 font-medium">No subject analysis data available</p>
                      <p className="text-yellow-700 text-sm mt-1">There are no marks recorded for this class.</p>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Grade Distribution Tab */}
            {!loading && activeTab === 'grades' && gradeAnalytics && (
              <div className="space-y-6">
                {gradeAnalytics.grade_distribution && Object.keys(gradeAnalytics.grade_distribution).length > 0 ? (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Grade Distribution by Subject</h3>
                    <div className="grid grid-cols-1 gap-6">
                      {Object.entries(gradeAnalytics.grade_distribution).map(([subjectName, distribution]) => {
                        // Check level
                        const isAdvancedLevel = ['S5', 'S6'].includes(gradeAnalytics.grade_context.level)
                        const isOLevel = ['S1', 'S2', 'S3', 'S4'].includes(gradeAnalytics.grade_context.level)
                        const isPrimary = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(gradeAnalytics.grade_context.level)
                        const isNursery = ['Baby', 'Middle', 'Top'].includes(gradeAnalytics.grade_context.level)
                        
                        return (
                          <div key={subjectName} className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="font-semibold text-gray-900 mb-4">{subjectName}</h4>
                            {isAdvancedLevel ? (
                              /* Advanced Level: A, B, C, D, E, O, F */
                              <>
                                <div className="grid grid-cols-7 gap-4">
                                  <div className="text-center">
                                    <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-green-700">{distribution.a}</p>
                                      <p className="text-sm text-green-600 mt-1">Grade A</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-blue-700">{distribution.b}</p>
                                      <p className="text-sm text-blue-600 mt-1">Grade B</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-cyan-100 border border-cyan-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-cyan-700">{distribution.c}</p>
                                      <p className="text-sm text-cyan-600 mt-1">Grade C</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-yellow-700">{distribution.d}</p>
                                      <p className="text-sm text-yellow-600 mt-1">Grade D</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-orange-700">{distribution.e || 0}</p>
                                      <p className="text-sm text-orange-600 mt-1">Grade E</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-purple-700">{distribution.o || 0}</p>
                                      <p className="text-sm text-purple-600 mt-1">Grade O</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-red-700">{distribution.f}</p>
                                      <p className="text-sm text-red-600 mt-1">Grade F</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 h-8 flex rounded-lg overflow-hidden">
                                  {distribution.a > 0 && <div className="bg-green-500" style={{ width: `${(distribution.a / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                  {distribution.b > 0 && <div className="bg-blue-500" style={{ width: `${(distribution.b / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                  {distribution.c > 0 && <div className="bg-cyan-500" style={{ width: `${(distribution.c / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                  {distribution.d > 0 && <div className="bg-yellow-500" style={{ width: `${(distribution.d / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                  {(distribution.e||0) > 0 && <div className="bg-orange-500" style={{ width: `${((distribution.e||0) / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                  {(distribution.o||0) > 0 && <div className="bg-purple-500" style={{ width: `${((distribution.o||0) / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                  {distribution.f > 0 && <div className="bg-red-500" style={{ width: `${(distribution.f / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0) + (distribution.o||0) + distribution.f)) * 100}%` }} />}
                                </div>
                              </>
                            ) : isPrimary ? (
                              /* Primary Level: D1, D2, C3, C4, C5, C6, P7, P8, F9 */
                              <>
                                <div className="grid grid-cols-9 gap-2">
                                  <div className="text-center">
                                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-green-700">{distribution.d1 || 0}</p>
                                      <p className="text-xs text-green-600 mt-1">D1</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-green-600">{distribution.d2 || 0}</p>
                                      <p className="text-xs text-green-500 mt-1">D2</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-blue-700">{distribution.c3 || 0}</p>
                                      <p className="text-xs text-blue-600 mt-1">C3</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-blue-600">{distribution.c4 || 0}</p>
                                      <p className="text-xs text-blue-500 mt-1">C4</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-cyan-100 border border-cyan-300 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-cyan-700">{distribution.c5 || 0}</p>
                                      <p className="text-xs text-cyan-600 mt-1">C5</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-cyan-600">{distribution.c6 || 0}</p>
                                      <p className="text-xs text-cyan-500 mt-1">C6</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-yellow-700">{distribution.p7 || 0}</p>
                                      <p className="text-xs text-yellow-600 mt-1">P7</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-orange-700">{distribution.p8 || 0}</p>
                                      <p className="text-xs text-orange-600 mt-1">P8</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                                      <p className="text-2xl font-bold text-red-700">{distribution.f9 || 0}</p>
                                      <p className="text-xs text-red-600 mt-1">F9</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 h-8 flex rounded-lg overflow-hidden">
                                  {(distribution.d1||0) > 0 && <div className="bg-green-600" style={{ width: `${((distribution.d1||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.d2||0) > 0 && <div className="bg-green-500" style={{ width: `${((distribution.d2||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.c3||0) > 0 && <div className="bg-blue-600" style={{ width: `${((distribution.c3||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.c4||0) > 0 && <div className="bg-blue-500" style={{ width: `${((distribution.c4||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.c5||0) > 0 && <div className="bg-cyan-600" style={{ width: `${((distribution.c5||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.c6||0) > 0 && <div className="bg-cyan-500" style={{ width: `${((distribution.c6||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.p7||0) > 0 && <div className="bg-yellow-500" style={{ width: `${((distribution.p7||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.p8||0) > 0 && <div className="bg-orange-500" style={{ width: `${((distribution.p8||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                  {(distribution.f9||0) > 0 && <div className="bg-red-500" style={{ width: `${((distribution.f9||0) / ((distribution.d1||0) + (distribution.d2||0) + (distribution.c3||0) + (distribution.c4||0) + (distribution.c5||0) + (distribution.c6||0) + (distribution.p7||0) + (distribution.p8||0) + (distribution.f9||0))) * 100}%` }} />}
                                </div>
                              </>
                            ) : isNursery ? (
                              /* Nursery Level: Mastering, Secure, Developing, Emerging, Not Yet */
                              <>
                                <div className="grid grid-cols-5 gap-3">
                                  <div className="text-center">
                                    <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                                      <p className="text-2xl font-bold text-purple-700">{distribution.mastering || 0}</p>
                                      <p className="text-xs text-purple-600 mt-1">Mastering</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                                      <p className="text-2xl font-bold text-green-700">{distribution.secure || 0}</p>
                                      <p className="text-xs text-green-600 mt-1">Secure</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                                      <p className="text-2xl font-bold text-blue-700">{distribution.developing || 0}</p>
                                      <p className="text-xs text-blue-600 mt-1">Developing</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                                      <p className="text-2xl font-bold text-yellow-700">{distribution.emerging || 0}</p>
                                      <p className="text-xs text-yellow-600 mt-1">Emerging</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                                      <p className="text-2xl font-bold text-red-700">{distribution.not_yet || 0}</p>
                                      <p className="text-xs text-red-600 mt-1">Not Yet</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 h-8 flex rounded-lg overflow-hidden">
                                  {(distribution.mastering||0) > 0 && <div className="bg-purple-500" style={{ width: `${((distribution.mastering||0) / ((distribution.mastering||0) + (distribution.secure||0) + (distribution.developing||0) + (distribution.emerging||0) + (distribution.not_yet||0))) * 100}%` }} />}
                                  {(distribution.secure||0) > 0 && <div className="bg-green-500" style={{ width: `${((distribution.secure||0) / ((distribution.mastering||0) + (distribution.secure||0) + (distribution.developing||0) + (distribution.emerging||0) + (distribution.not_yet||0))) * 100}%` }} />}
                                  {(distribution.developing||0) > 0 && <div className="bg-blue-500" style={{ width: `${((distribution.developing||0) / ((distribution.mastering||0) + (distribution.secure||0) + (distribution.developing||0) + (distribution.emerging||0) + (distribution.not_yet||0))) * 100}%` }} />}
                                  {(distribution.emerging||0) > 0 && <div className="bg-yellow-500" style={{ width: `${((distribution.emerging||0) / ((distribution.mastering||0) + (distribution.secure||0) + (distribution.developing||0) + (distribution.emerging||0) + (distribution.not_yet||0))) * 100}%` }} />}
                                  {(distribution.not_yet||0) > 0 && <div className="bg-red-500" style={{ width: `${((distribution.not_yet||0) / ((distribution.mastering||0) + (distribution.secure||0) + (distribution.developing||0) + (distribution.emerging||0) + (distribution.not_yet||0))) * 100}%` }} />}
                                </div>
                              </>
                            ) : (
                              /* O-Level: A, B, C, D, E */
                              <>
                                <div className="grid grid-cols-5 gap-4">
                                  <div className="text-center">
                                    <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-green-700">{distribution.a}</p>
                                      <p className="text-sm text-green-600 mt-1">Grade A</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-blue-700">{distribution.b}</p>
                                      <p className="text-sm text-blue-600 mt-1">Grade B</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-yellow-700">{distribution.c}</p>
                                      <p className="text-sm text-yellow-600 mt-1">Grade C</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-orange-700">{distribution.d}</p>
                                      <p className="text-sm text-orange-600 mt-1">Grade D</p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                                      <p className="text-3xl font-bold text-red-700">{distribution.e || 0}</p>
                                      <p className="text-sm text-red-600 mt-1">Grade E</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 h-8 flex rounded-lg overflow-hidden">
                                  {distribution.a > 0 && <div className="bg-green-500" style={{ width: `${(distribution.a / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0))) * 100}%` }} />}
                                  {distribution.b > 0 && <div className="bg-blue-500" style={{ width: `${(distribution.b / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0))) * 100}%` }} />}
                                  {distribution.c > 0 && <div className="bg-yellow-500" style={{ width: `${(distribution.c / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0))) * 100}%` }} />}
                                  {distribution.d > 0 && <div className="bg-orange-500" style={{ width: `${(distribution.d / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0))) * 100}%` }} />}
                                  {(distribution.e||0) > 0 && <div className="bg-red-500" style={{ width: `${((distribution.e||0) / (distribution.a + distribution.b + distribution.c + distribution.d + (distribution.e||0))) * 100}%` }} />}
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-yellow-900 font-medium">No grade distribution data available</p>
                    <p className="text-yellow-700 text-sm mt-1">There are no marks recorded for this class.</p>
                  </div>
                )}
              </div>
            )}

            {/* No Data State */}
            {!loading && !gradeAnalytics && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-yellow-900 font-medium">No analytics data available</p>
                <p className="text-yellow-700 text-sm mt-1">Please select a class and click "Load Analytics"</p>
              </div>
            )}
          </div>
        </div>


      </div>
    </DashboardLayout>
  )
}
