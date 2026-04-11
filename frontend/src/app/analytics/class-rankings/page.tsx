'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Download, Trophy, AlertCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'

interface StudentRanking {
  student_id: string
  admission_no: string
  student_name: string
  gender: string
  aggregate?: number
  average_marks: number
  total_points?: number
  subjects_count: number
  rank: number
  division?: string
  grade?: string
}

interface ClassRankingData {
  class_id: string
  class_name: string
  level: string
  term: string
  year: string
  exam_type: string
  total_students: number
  rankings: StudentRanking[]
}

interface TermYear {
  term: string
  year: number
}

export default function ClassRankingsPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [termsYears, setTermsYears] = useState<TermYear[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [examType, setExamType] = useState<string>('EOT')
  const [rankingData, setRankingData] = useState<ClassRankingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${API_BASE_URL}/api/v1/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          // Handle both array and object with classes property
          const classList = Array.isArray(data) ? data : (data.classes || [])
          setClasses(classList)
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err)
      }
    }
    fetchClasses()
  }, [])

  // Fetch available terms and years when class is selected
  useEffect(() => {
    const fetchTermsYears = async () => {
      if (!selectedClass) return
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(
          `${API_BASE_URL}/api/v1/analytics/class-ranking/${selectedClass}/terms-years`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (response.ok) {
          const data = await response.json()
          setTermsYears(data.data || [])
          if (data.data && data.data.length > 0) {
            setSelectedTerm(data.data[0].term)
            setSelectedYear(String(data.data[0].year))
          }
        }
      } catch (err) {
        console.error('Failed to fetch terms/years:', err)
      }
    }
    fetchTermsYears()
  }, [selectedClass])

  // Fetch rankings
  const fetchRankings = async () => {
    if (!selectedClass || !selectedTerm || !selectedYear) {
      setError('Please select class, term, and year')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_BASE_URL}/api/v1/analytics/class-ranking/${selectedClass}?term=${selectedTerm}&year=${selectedYear}&exam_type=${examType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setRankingData(data)
      } else {
        setError('Failed to fetch rankings')
      }
    } catch (err) {
      setError('An error occurred while fetching rankings')
    } finally {
      setLoading(false)
    }
  }

  // Export to Excel
  const handleExport = async () => {
    if (!selectedClass || !selectedTerm || !selectedYear) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_BASE_URL}/api/v1/analytics/class-ranking/${selectedClass}/export?term=${selectedTerm}&year=${selectedYear}&exam_type=${examType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Class_Rankings_${rankingData?.class_name}_${selectedTerm}_${selectedYear}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Failed to export:', err)
    }
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  const getLevelCategory = (level: string) => {
    const nurseryLevels = ['Baby', 'Middle', 'Top']
    const primaryLevels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
    const ordinaryLevels = ['S1', 'S2', 'S3', 'S4']
    const advancedLevels = ['S5', 'S6']

    if (nurseryLevels.includes(level)) return 'nursery'
    if (primaryLevels.includes(level)) return 'primary'
    if (ordinaryLevels.includes(level)) return 'ordinary'
    if (advancedLevels.includes(level)) return 'advanced'
    return 'unknown'
  }

  const renderTableHeaders = () => {
    if (!rankingData) return null
    const category = getLevelCategory(rankingData.level)

    return (
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rank</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Admission No</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Student Name</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Gender</th>
        {category === 'primary' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Aggregate</th>}
        {category === 'advanced' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total Points</th>}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Average Marks</th>
        {category === 'primary' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Division</th>}
        {(category === 'ordinary' || category === 'advanced') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Grade</th>}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Subjects</th>
      </tr>
    )
  }

  const renderTableRow = (student: StudentRanking) => {
    if (!rankingData) return null
    const category = getLevelCategory(rankingData.level)

    return (
      <tr key={student.student_id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getRankBadgeColor(student.rank)}`}>
            {student.rank <= 3 && <Trophy className="w-4 h-4" />}
            {student.rank}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.admission_no}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.student_name}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.gender}</td>
        {category === 'primary' && <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{student.aggregate}</td>}
        {category === 'advanced' && <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{student.total_points}</td>}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.average_marks.toFixed(1)}%</td>
        {category === 'primary' && (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{student.division}</span>
          </td>
        )}
        {(category === 'ordinary' || category === 'advanced') && (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{student.grade}</span>
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.subjects_count}</td>
      </tr>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push('/analytics')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analytics
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Class Rankings</h1>
          <p className="text-gray-600 mt-1">View student rankings by class with detailed performance metrics</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select term</option>
                {[...new Set(termsYears.map(t => t.term))].map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select year</option>
                {[...new Set(termsYears.map(t => t.year))].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BOT">Beginning of Term (BOT)</option>
                <option value="MOT">Mid Term (MOT)</option>
                <option value="EOT">End of Term (EOT)</option>
                <option value="Mock">Mock</option>
                <option value="UNEB">UNEB</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchRankings}
              disabled={!selectedClass || !selectedTerm || !selectedYear}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              View Rankings
            </button>
            {rankingData && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Rankings Table */}
        {rankingData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{rankingData.class_name}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {rankingData.term} {rankingData.year} - {rankingData.exam_type}
                  </p>
                </div>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg">
                  {rankingData.total_students} Students
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {renderTableHeaders()}
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rankingData.rankings.map(student => renderTableRow(student))}
                </tbody>
              </table>
            </div>

            {rankingData.rankings.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                No rankings available for the selected criteria
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
