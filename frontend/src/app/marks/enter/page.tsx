'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormSelect } from '@/components/ui/FormComponents'
import { resultsApi, studentsApi, classesApi, subjectsApi } from '@/services/api'
import api from '@/services/api'
import Link from 'next/link'
import { Download, Upload, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MarksEntryPage() {
  const [year, setYear] = useState('2026')
  const [term, setTerm] = useState('Term 1')
  const [classId, setClassId] = useState('')
  const [examType, setExamType] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [paperNumber, setPaperNumber] = useState('1')
  const [searchTerm, setSearchTerm] = useState('')
  const [marks, setMarks] = useState<Record<string, { ca?: number; exam?: number; mark?: number }>>({})
  const [userRole, setUserRole] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [importType, setImportType] = useState<'ca' | 'exam'>('exam') // 'ca' for AOI, 'exam' for exam marks
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [imports, setImports] = useState<any[]>([])
  const queryClient = useQueryClient()

  useEffect(() => {
    const role = localStorage.getItem('user_role') || ''
    setUserRole(role)
    fetchImports()
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

  const isAdvanced = ['S5', 'S6'].includes(classLevel)
  const selectedSubject = subjectsData?.subjects?.find((s: any) => s.id === subjectId)

  const { data: studentsData } = useQuery({
    queryKey: ['students', classId],
    queryFn: async () => {
      if (!classId) return { students: [] }
      const res = await studentsApi.list({ class_id: classId, limit: -1 })
      return Array.isArray(res) ? { students: res } : res
    },
    enabled: !!classId
  })

  // Fetch existing marks when filters are set
  useEffect(() => {
    if (classId && examType && subjectId && studentsData?.students && (!isAdvanced || paperNumber)) {
      const fetchExistingMarks = async () => {
        try {
          // Use bulk endpoint to fetch all marks in one call
          const params = new URLSearchParams({
            class_id: classId,
            subject_id: subjectId,
            term,
            year,
            exam_type: examType
          })
          
          if (isAdvanced && paperNumber) {
            params.append('paper', paperNumber)
          }
          
          const res = await api.get(`/api/v1/results/bulk-marks?${params.toString()}`)
          const bulkMarks = res.data.marks || {}
          
          const marksData: Record<string, { ca?: number; exam?: number; mark?: number }> = {}
          
          for (const studentId in bulkMarks) {
            const rawMarks = bulkMarks[studentId]
            if (isAdvanced) {
              marksData[studentId] = {
                mark: rawMarks.mark || rawMarks.total || 0
              } as any
            } else {
              marksData[studentId] = {
                ca: rawMarks.ca || 0,
                exam: rawMarks.exam || 0
              }
            }
          }
          
          setMarks(marksData)
        } catch (error) {
          console.error('Failed to fetch existing marks:', error)
        }
      }
      fetchExistingMarks()
    }
  }, [classId, examType, subjectId, year, term, studentsData, isAdvanced, paperNumber])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(marks).map(([studentId, studentMarks]) => {
        let rawMarks: any
        if (isAdvanced) {
          rawMarks = { mark: studentMarks.mark || 0, paper: parseInt(paperNumber) }
        } else {
          rawMarks = { ca: studentMarks.ca || 0, exam: studentMarks.exam || 0 }
        }
        return resultsApi.createOrUpdate({
          student_id: studentId,
          subject_id: subjectId,
          class_id: classId,
          term,
          year: parseInt(year),
          exam_type: examType,
          raw_marks: rawMarks
        })
      })
      return Promise.all(promises)
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: `Saved marks for ${Object.keys(marks).length} students`, color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['results'] })
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to save marks', color: 'red' })
    }
  })

  const getMaxMarks = () => {
    if (isAdvanced) return { mark: 100 } // Advanced level: single mark out of 100
    if (['Baby', 'Middle', 'Top'].includes(classLevel)) return { ca: 100, exam: 100 }
    if (['S1', 'S2', 'S3', 'S4'].includes(classLevel)) return { exam: 80 } // CA from AOI
    return { ca: 40, exam: 60 } // All Primary P1-P7
  }

  const getLabels = () => {
    if (isAdvanced) return { mark: 'Mark (out of 100)' }
    if (['S1', 'S2', 'S3', 'S4'].includes(classLevel)) {
      return { exam: 'Exam (out of 80)' } // CA from AOI
    }
    return { ca: 'CA', exam: 'Exam' }
  }

  const maxMarks = getMaxMarks()
  const labels = getLabels()
  const canSave = classId && examType && subjectId && (!isAdvanced || paperNumber) && Object.keys(marks).length > 0
  const isAdmin = userRole === 'school_admin' || userRole === 'system_admin'

  const fetchImports = async () => {
    try {
      const res = await api.get('/api/v1/marks/imports')
      setImports(res.data.imports || [])
    } catch (error) {
      console.error('Failed to fetch imports', error)
      setImports([]) // Set empty array on error
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const isPrimaryOrNursery = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Baby', 'Middle', 'Top', 'Nursery'].includes(classLevel)
      
      let url = ''
      let filename = 'marks_template.xlsx'
      
      if (importType === 'ca' && isPrimaryOrNursery) {
        // CA template for Primary/Nursery
        const params = new URLSearchParams()
        if (classId) params.append('class_id', classId)
        if (subjectId) {
          const subject = subjectsData?.subjects?.find((s: any) => s.id === subjectId)
          if (subject) params.append('subject_name', subject.name)
        }
        if (classLevel) params.append('level', classLevel)
        if (year) params.append('year', year)
        if (term) params.append('term', term)
        if (examType) params.append('exam_type', examType)
        
        url = `${process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'}/api/v1/marks/ca-template?${params.toString()}`
        filename = 'ca_marks_template.xlsx'
      } else {
        // Exam marks template
        const params = new URLSearchParams()
        if (classId) params.append('class_id', classId)
        if (subjectId) {
          const subject = subjectsData?.subjects?.find((s: any) => s.id === subjectId)
          if (subject) params.append('subject_name', subject.name)
        }
        if (classLevel) params.append('level', classLevel)
        if (year) params.append('year', year)
        if (term) params.append('term', term)
        if (examType) params.append('exam_type', examType)
        if (isAdvanced && paperNumber) params.append('paper', paperNumber)
        
        url = `${process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'}/api/v1/marks/exam-template?${params.toString()}`
        filename = 'exam_marks_template.xlsx'
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      
      toast.success('Template downloaded')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setValidationResult(null)
      setShowValidation(false)
    }
  }

  const handleValidate = async () => {
    if (!file || !classId || !subjectId) {
      toast.error('Please select class, subject, and file')
      return
    }

    const isPrimaryOrNursery = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Baby', 'Middle', 'Top', 'Nursery'].includes(classLevel)

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_id', classId)
    formData.append('subject_id', subjectId)
    formData.append('term', term)
    formData.append('year', year)
    formData.append('exam_type', examType)
    if (isAdvanced && paperNumber) {
      formData.append('paper', paperNumber)
    }

    try {
      let endpoint = ''
      if (importType === 'ca' && isPrimaryOrNursery) {
        endpoint = '/api/v1/marks/ca-validate'
      } else {
        endpoint = '/api/v1/marks/exam-validate'
      }
      
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setValidationResult(res.data)
      setShowValidation(true)
      toast.success('Validation complete')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Validation failed')
    } finally {
      setUploading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!file || !classId || !subjectId) {
      toast.error('Please select class, subject, and file')
      return
    }

    if (!validationResult) {
      toast.error('Please validate the file first')
      return
    }

    if (validationResult.valid_rows === 0) {
      toast.error('No valid marks to import')
      return
    }

    const isPrimaryOrNursery = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Baby', 'Middle', 'Top', 'Nursery'].includes(classLevel)

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_id', classId)
    formData.append('subject_id', subjectId)
    formData.append('term', term)
    formData.append('year', year)
    formData.append('exam_type', examType)
    if (isAdvanced && paperNumber) {
      formData.append('paper', paperNumber)
    }

    try {
      let endpoint = ''
      if (importType === 'ca' && isPrimaryOrNursery) {
        endpoint = '/api/v1/marks/ca-import'
      } else {
        endpoint = '/api/v1/marks/exam-import'
      }
      
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success(res.data.message)
      setFile(null)
      setValidationResult(null)
      setShowValidation(false)
      setShowBulkImport(false)
      fetchImports()
      queryClient.invalidateQueries({ queryKey: ['results'] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  const handleApprove = async (importId: string) => {
    try {
      await api.post(`/api/v1/marks/imports/${importId}/approve`)
      toast.success('Import approved and processed')
      fetchImports()
      queryClient.invalidateQueries({ queryKey: ['results'] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (importId: string) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      await api.post(`/api/v1/marks/imports/${importId}/reject`, { reason })
      toast.success('Import rejected')
      fetchImports()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject')
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="📝 Marks Entry"
          subtitle="Enter marks for students or bulk import from Excel"
          action={
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Link href="/marks/aoi">
                <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-all text-sm sm:text-base">
                  📝 AOI Marks
                </button>
              </Link>
              <button
                onClick={() => setShowBulkImport(!showBulkImport)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all text-sm sm:text-base"
              >
                {showBulkImport ? '✏️ Manual' : '📤 Bulk'}
              </button>
              <Link href="/results">
                <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all text-sm sm:text-base">
                  ← Back
                </button>
              </Link>
            </div>
          }
        />

        {/* Step 1: Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Step 1: Select Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                setMarks({})
              }}
              label="Class"
              options={[
                { value: '', label: 'Select Class' },
                ...(classesData?.classes?.map((c: any) => ({ value: c.id, label: c.name })) || [])
              ]}
            />
            <FormSelect
              value={examType}
              onChange={(e) => {
                setExamType(e.target.value)
                setMarks({})
              }}
              label="Exam Type"
              disabled={!classId}
              options={[
                { value: '', label: 'Select Exam' },
                { value: 'BOT', label: 'BOT' },
                { value: 'MOT', label: 'MOT' },
                { value: 'EOT', label: 'EOT' },
                { value: 'Mock', label: 'Mock' },
              ]}
            />
            <FormSelect
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value)
                setPaperNumber('1')
                setMarks({})
              }}
              label="Subject"
              disabled={!examType}
              options={[
                { value: '', label: 'Select Subject' },
                ...(subjectsData?.subjects?.map((s: any) => ({ value: s.id, label: s.name })) || [])
              ]}
            />
            {isAdvanced && subjectId && selectedSubject && selectedSubject.papers > 1 && (
              <FormSelect
                value={paperNumber}
                onChange={(e) => {
                  setPaperNumber(e.target.value)
                  setMarks({})
                }}
                label="Paper"
                options={[
                  ...Array.from({ length: selectedSubject.papers }, (_, i) => ({
                    value: String(i + 1),
                    label: `Paper ${i + 1}`
                  }))
                ]}
              />
            )}
          </div>
        </div>

        {/* Step 2: Enter Marks */}
        {!showBulkImport && classId && subjectId && examType && (!isAdvanced || paperNumber) && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">✍️ Step 2: Enter Marks</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedClass?.name} • {selectedSubject?.name} {isAdvanced && selectedSubject?.papers > 1 ? `(Paper ${paperNumber})` : ''} • {examType}
                </p>
              </div>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {saveMutation.isPending ? '⏳ Saving...' : `💾 Save ${Object.keys(marks).length}`}
              </button>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-900">
                <strong>Grading:</strong> {isAdvanced ? `${labels.mark}` : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? `${labels.exam} (CA from AOI)` : `${labels.ca} (Max: ${maxMarks.ca}) + ${labels.exam} (Max: ${maxMarks.exam})`)}
              </p>
            </div>

            {/* Search Filter */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Search students by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            {/* Mobile Excel-like View */}
            <div className="block lg:hidden space-y-2">
              {studentsData?.students?.filter((student: any) => {
                if (!searchTerm) return true
                const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase()
                const admissionNo = student.admission_no?.toLowerCase() || ''
                const search = searchTerm.toLowerCase()
                return fullName.includes(search) || admissionNo.includes(search)
              }).map((student: any, index: number) => {
                const studentMarks = marks[student.id] || (isAdvanced ? { mark: 0 } : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? { exam: 0 } : { ca: 0, exam: 0 }))
                const total = isAdvanced ? (studentMarks.mark || 0) : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (studentMarks.exam || 0) : ((studentMarks.ca || 0) + (studentMarks.exam || 0)))
                const hasExisting = marks[student.id] && (isAdvanced ? (marks[student.id].mark || 0) > 0 : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (marks[student.id].exam || 0) > 0 : ((marks[student.id].ca || 0) > 0 || (marks[student.id].exam || 0) > 0)))
                const canEdit = true
                
                return (
                  <div key={student.id} className={`border-2 rounded-lg p-3 ${hasExisting ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{index + 1}</span>
                        <span className="font-semibold text-sm">{student.first_name} {student.last_name}</span>
                      </div>
                      {hasExisting && <span className="text-xs text-amber-600 font-medium">✓ Saved</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {isAdvanced ? (
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">{labels.mark}</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={100}
                            step="0.1"
                            value={studentMarks.mark || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              if (value <= 100) {
                                setMarks(prev => ({ ...prev, [student.id]: { mark: value } }))
                              }
                            }}
                            disabled={!canEdit}
                            className={`w-full px-3 py-2.5 border-2 rounded-lg text-center text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                            placeholder="0"
                          />
                        </div>
                      ) : ['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">{labels.exam}</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={80}
                            step="0.1"
                            value={studentMarks.exam || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              if (value <= 80) {
                                setMarks(prev => ({ ...prev, [student.id]: { exam: value } }))
                              }
                            }}
                            disabled={!canEdit}
                            className={`w-full px-3 py-2.5 border-2 rounded-lg text-center text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">{labels.ca} (/{maxMarks.ca})</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={maxMarks.ca}
                              step="0.1"
                              value={studentMarks.ca || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (value <= maxMarks.ca!) {
                                  setMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], ca: value } }))
                                }
                              }}
                              disabled={!canEdit}
                              className={`w-full px-3 py-2.5 border-2 rounded-lg text-center text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">{labels.exam} (/{maxMarks.exam})</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={maxMarks.exam}
                              step="0.1"
                              value={studentMarks.exam || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (value <= maxMarks.exam!) {
                                  setMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], exam: value } }))
                                }
                              }}
                              disabled={!canEdit}
                              className={`w-full px-3 py-2.5 border-2 rounded-lg text-center text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2 mt-1">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2 text-center">
                              <span className="text-xs text-blue-700 font-medium">Total: </span>
                              <span className="text-xl font-bold text-blue-900">{total.toFixed(1)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 w-12">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th>
                    {isAdvanced ? (
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 w-48">{labels.mark}</th>
                    ) : ['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 w-48">{labels.exam}</th>
                    ) : (
                      <>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 w-32">{labels.ca}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 w-32">{labels.exam}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 w-24">Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {studentsData?.students?.filter((student: any) => {
                    if (!searchTerm) return true
                    const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase()
                    const admissionNo = student.admission_no?.toLowerCase() || ''
                    const search = searchTerm.toLowerCase()
                    return fullName.includes(search) || admissionNo.includes(search)
                  }).map((student: any, index: number) => {
                    const studentMarks = marks[student.id] || (isAdvanced ? { mark: 0 } : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? { exam: 0 } : { ca: 0, exam: 0 }))
                    const total = isAdvanced ? (studentMarks.mark || 0) : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (studentMarks.exam || 0) : ((studentMarks.ca || 0) + (studentMarks.exam || 0)))
                    const hasExisting = marks[student.id] && (isAdvanced ? (marks[student.id].mark || 0) > 0 : (['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (marks[student.id].exam || 0) > 0 : ((marks[student.id].ca || 0) > 0 || (marks[student.id].exam || 0) > 0)))
                    const canEdit = true
                    
                    return (
                      <tr key={student.id} className={`border-b border-gray-100 ${hasExisting ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                        <td className="py-3 px-4 font-medium">
                          {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                          {hasExisting && <span className="ml-2 text-xs text-amber-600">✓</span>}
                        </td>
                        {isAdvanced ? (
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max={100}
                              step="0.1"
                              value={studentMarks.mark || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (value <= 100) {
                                  setMarks(prev => ({ ...prev, [student.id]: { mark: value } }))
                                }
                              }}
                              disabled={!canEdit}
                              className={`w-full px-3 py-2 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                              placeholder="0"
                            />
                          </td>
                        ) : ['S1', 'S2', 'S3', 'S4'].includes(classLevel) ? (
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max={80}
                              step="0.1"
                              value={studentMarks.exam || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (value <= 80) {
                                  setMarks(prev => ({ ...prev, [student.id]: { exam: value } }))
                                }
                              }}
                              disabled={!canEdit}
                              className={`w-full px-3 py-2 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                              placeholder="0"
                            />
                          </td>
                        ) : (
                          <>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks.ca}
                                step="0.1"
                                value={studentMarks.ca || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  if (value <= maxMarks.ca!) {
                                    setMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], ca: value } }))
                                  }
                                }}
                                disabled={!canEdit}
                                className={`w-full px-3 py-2 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks.exam}
                                step="0.1"
                                value={studentMarks.exam || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  if (value <= maxMarks.exam!) {
                                    setMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], exam: value } }))
                                  }
                                }}
                                disabled={!canEdit}
                                className={`w-full px-3 py-2 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center ${canEdit ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-lg">
                              {total.toFixed(1)}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bulk Import Section */}
        {showBulkImport && (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📥 Bulk Import from Excel</h3>
              
              <div className="space-y-4">
                {/* Import Type Selection - Only for Primary/Nursery */}
                {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Baby', 'Middle', 'Top', 'Nursery'].includes(classLevel) && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Select Import Type:</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setImportType('ca')}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                          importType === 'ca'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-purple-100'
                        }`}
                      >
                        📝 CA Marks
                      </button>
                      <button
                        onClick={() => setImportType('exam')}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                          importType === 'exam'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-blue-100'
                        }`}
                      >
                        📄 Exam Marks
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Instructions:</strong>
                  </p>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>Select filters above (Year, Term, Class, Exam Type, Subject)</li>
                    {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Baby', 'Middle', 'Top', 'Nursery'].includes(classLevel) && <li>Choose import type: CA or Exam marks</li>}
                    <li>Download the Excel template</li>
                    <li>Fill in {importType === 'ca' && ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Baby', 'Middle', 'Top', 'Nursery'].includes(classLevel) ? 'CA marks' : 'exam marks'} for each student</li>
                    <li>Upload the completed file</li>
                    {!isAdmin && importType === 'exam' && <li className="text-amber-700">Exam imports may require admin approval</li>}
                    {['S1', 'S2', 'S3', 'S4'].includes(classLevel) && <li className="text-purple-700">For S1-S4 CA marks (AOI), use the <Link href="/marks/aoi" className="underline font-semibold">AOI Marks Entry</Link> page</li>}
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handleDownloadTemplate}
                    disabled={!classId}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Download Template</span>
                    <span className="sm:hidden">Template</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 text-sm sm:text-base"
                  >
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Select Excel File</span>
                    <span className="sm:hidden">Select File</span>
                  </label>
                  {file && (
                    <p className="mt-4 text-sm text-gray-600">
                      Selected: <span className="font-semibold">{file.name}</span>
                    </p>
                  )}
                </div>

                {file && !showValidation && (
                  <button
                    onClick={handleValidate}
                    disabled={uploading}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {uploading ? '⏳ Validating...' : '🔍 Validate File'}
                  </button>
                )}

                {showValidation && validationResult && (
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">📊 Validation Summary</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{validationResult.total_rows}</p>
                          <p className="text-sm text-gray-600">Total Rows</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{validationResult.valid_rows}</p>
                          <p className="text-sm text-gray-600">Valid</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-red-600">{validationResult.invalid_rows}</p>
                          <p className="text-sm text-gray-600">Invalid</p>
                        </div>
                      </div>

                      {validationResult.errors && validationResult.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h5 className="font-semibold text-red-800 mb-2">❌ Errors Found:</h5>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {validationResult.errors.map((error: string, idx: number) => (
                              <p key={idx} className="text-sm text-red-700">• {error}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {validationResult.valid_marks && validationResult.valid_marks.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                          <h5 className="font-semibold text-green-800 mb-2">✅ Valid Marks Preview (First 5):</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-green-300">
                                  <th className="text-left py-2 px-2">Admission No</th>
                                  <th className="text-left py-2 px-2">Student</th>
                                  <th className="text-center py-2 px-2">{importType === 'ca' ? 'CA' : 'Exam'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {validationResult.valid_marks.slice(0, 5).map((mark: any, idx: number) => (
                                  <tr key={idx} className="border-b border-green-200">
                                    <td className="py-2 px-2">{mark.admission_no}</td>
                                    <td className="py-2 px-2">{mark.student_name}</td>
                                    <td className="text-center py-2 px-2">{mark.ca || mark.exam}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {validationResult.valid_marks.length > 5 && (
                              <p className="text-xs text-gray-600 mt-2 text-center">
                                ... and {validationResult.valid_marks.length - 5} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setFile(null)
                          setValidationResult(null)
                          setShowValidation(false)
                        }}
                        className="flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm sm:text-base"
                      >
                        ← Change File
                      </button>
                      <button
                        onClick={handleBulkUpload}
                        disabled={uploading || validationResult.valid_rows === 0}
                        className="flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 text-sm sm:text-base"
                      >
                        {uploading ? '⏳ Uploading...' : `🚀 Import ${validationResult.valid_rows} Marks`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Import History */}
            {imports.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Import History</h3>
                
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm">Class</th>
                        <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm">Subject</th>
                        <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm">Term/Year</th>
                        <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm">Exam</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">Valid</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">Invalid</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">Status</th>
                        {isAdmin && <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {imports.map((imp) => (
                        <tr key={imp.id} className="border-b border-gray-100">
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">{imp.class?.name}</td>
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">{imp.subject?.name}</td>
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">{imp.term} {imp.year}</td>
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">{imp.exam_type}</td>
                          <td className="py-3 px-2 sm:px-4 text-center text-green-600 text-xs sm:text-sm">{imp.valid_rows}</td>
                          <td className="py-3 px-2 sm:px-4 text-center text-red-600 text-xs sm:text-sm">{imp.invalid_rows}</td>
                          <td className="py-3 px-2 sm:px-4 text-center">
                            {imp.status === 'pending' && (
                              <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Pending
                              </span>
                            )}
                            {imp.status === 'approved' && (
                              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Approved
                              </span>
                            )}
                            {imp.status === 'rejected' && (
                              <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                                <XCircle className="w-4 h-4 inline mr-1" />
                                Rejected
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-2 sm:px-4 text-center">
                              {imp.status === 'pending' && (
                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-center">
                                  <button
                                    onClick={() => handleApprove(imp.id)}
                                    className="px-2 sm:px-3 py-1 rounded bg-green-500 text-white text-xs sm:text-sm hover:bg-green-600"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(imp.id)}
                                    className="px-2 sm:px-3 py-1 rounded bg-red-500 text-white text-xs sm:text-sm hover:bg-red-600"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!classId && !showBulkImport && (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-gray-500 text-lg">👆 Select filters above to start entering marks</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
