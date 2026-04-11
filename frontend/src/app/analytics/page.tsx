'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { TrendingUp, BarChart3, Users, BookOpen } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'

export default function PerformanceAnalytics() {
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedExamType, setSelectedExamType] = useState('BOT')
  
  const [subjectTrend, setSubjectTrend] = useState<any[]>([])
  const [classComparison, setClassComparison] = useState<any[]>([])
  const [subjectComparison, setSubjectComparison] = useState<any[]>([])
  const [termComparison, setTermComparison] = useState<any[]>([])

  useEffect(() => {
    fetchSubjects()
    fetchClasses()
    fetchAllData()
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [selectedSubject, selectedClass, selectedYear, selectedTerm, selectedExamType])

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

  const fetchAllData = async () => {
    if (!selectedClass || !selectedSubject) return
    setLoading(true)
    await Promise.all([
      fetchSubjectTrend(),
      fetchClassComparison(),
      fetchSubjectComparison(),
      fetchTermComparison()
    ])
    setLoading(false)
  }

  const fetchSubjectTrend = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedSubject) params.append('subject_id', selectedSubject)

      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/subject-trend?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      const data = await res.json()
      setSubjectTrend(data.trends || [])
    } catch (error) {
      console.error('Failed to fetch subject trend:', error)
    }
  }

  const fetchClassComparison = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/class-comparison?term=${selectedTerm}&year=${selectedYear}&exam_type=${selectedExamType}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      const data = await res.json()
      setClassComparison(data.classes || [])
    } catch (error) {
      console.error('Failed to fetch class comparison:', error)
    }
  }

  const fetchSubjectComparison = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/subject-comparison?class_id=${selectedClass}&term=${selectedTerm}&year=${selectedYear}&exam_type=${selectedExamType}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      const data = await res.json()
      setSubjectComparison(data.subjects || [])
    } catch (error) {
      console.error('Failed to fetch subject comparison:', error)
    }
  }

  const fetchTermComparison = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/term-comparison?class_id=${selectedClass}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      const data = await res.json()
      setTermComparison(data.terms || [])
    } catch (error) {
      console.error('Failed to fetch term comparison:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="text-gray-600 mt-1">Track and analyze student performance across subjects, classes, and terms</p>
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Class Rankings</h3>
              <p className="text-xs text-gray-600">View student rankings by class with export to Excel</p>
            </div>
            <a
              href="/analytics/class-rankings"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Rankings
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BOT">BOT</option>
                <option value="MOT">MOT</option>
                <option value="EOT">EOT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Subject Performance Trend</h3>
            </div>
            {subjectTrend.length > 0 ? (
              <div className="space-y-3">
                {subjectTrend.map((trend: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{trend.term} {trend.year} - {trend.exam_type}</p>
                      <p className="text-sm text-gray-500">{trend.total_students} students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-blue-600">{trend.average.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Pass: {trend.pass_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No trend data available</div>
            )}
          </div>

          {/* Class Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Class Comparison</h3>
            </div>
            {classComparison.length > 0 ? (
              <div className="space-y-3">
                {classComparison.map((cls: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{cls.class_name}</p>
                      <p className="text-sm text-gray-500">{cls.total_students} students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">{cls.average.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Pass: {cls.pass_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No class comparison data</div>
            )}
          </div>

          {/* Subject Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Subject Comparison</h3>
            </div>
            {subjectComparison.length > 0 ? (
              <div className="space-y-3">
                {subjectComparison.map((subj: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{subj.subject_name}</p>
                      <p className="text-sm text-gray-500">{subj.total_students} students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-purple-600">{subj.average.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Pass: {subj.pass_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No subject comparison data</div>
            )}
          </div>

          {/* Term Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Term Comparison</h3>
            </div>
            {termComparison.length > 0 ? (
              <div className="space-y-3">
                {termComparison.map((term: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{term.term} ({term.exam_type})</p>
                      <p className="text-sm text-gray-500">{term.total_students} students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-orange-600">{term.average.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Pass: {term.pass_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No term comparison data</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
