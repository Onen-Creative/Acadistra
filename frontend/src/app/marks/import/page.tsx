'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { FormSelect } from '@/components/ui/FormComponents'
import api from '@/services/api'
import { classesApi, subjectsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { Download, Upload, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function BulkMarksImportPage() {
  const [userRole, setUserRole] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState('2026')
  const [examType, setExamType] = useState('BOT')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imports, setImports] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)

  useEffect(() => {
    const role = localStorage.getItem('user_role') || ''
    setUserRole(role)
    fetchClasses()
    fetchImports()
  }, [])

  useEffect(() => {
    if (classId) {
      const cls = classes.find(c => c.id === classId)
      setSelectedClass(cls)
      if (cls?.level) {
        fetchSubjects(cls.level)
      }
    }
  }, [classId, classes])

  const fetchClasses = async () => {
    try {
      const res = await classesApi.list()
      setClasses(Array.isArray(res) ? res : res.classes || [])
    } catch (error) {
      console.error('Failed to fetch classes', error)
    }
  }

  const fetchSubjects = async (level: string) => {
    try {
      const res = await subjectsApi.list({ level })
      setSubjects(Array.isArray(res) ? res : res.subjects || [])
    } catch (error) {
      console.error('Failed to fetch subjects', error)
    }
  }

  const fetchImports = async () => {
    try {
      const res = await api.get('/api/v1/marks/imports')
      setImports(res.data.imports || [])
    } catch (error) {
      console.error('Failed to fetch imports', error)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const url = classId 
        ? `http://localhost:8080/api/v1/marks/import-template?class_id=${classId}`
        : 'http://localhost:8080/api/v1/marks/import-template'
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'marks_template.xlsx'
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
    }
  }

  const handleUpload = async () => {
    if (!file || !classId || !subjectId) {
      toast.error('Please select class, subject, and file')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_id', classId)
    formData.append('subject_id', subjectId)
    formData.append('term', term)
    formData.append('year', year)
    formData.append('exam_type', examType)

    try {
      const res = await api.post('/api/v1/marks/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success(res.data.message)
      setFile(null)
      fetchImports()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  const handleApprove = async (importId: string) => {
    try {
      await api.post(`/marks/imports/${importId}/approve`)
      toast.success('Import approved and processed')
      fetchImports()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (importId: string) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      await api.post(`/marks/imports/${importId}/reject`, { reason })
      toast.success('Import rejected')
      fetchImports()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject')
    }
  }

  const isAdmin = userRole === 'school_admin'

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="📤 Bulk Marks Import" 
          subtitle="Upload marks from Excel with approval workflow"
        />

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Step 1: Select Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
                onChange={(e) => setClassId(e.target.value)}
                label="Class"
                options={[
                  { value: '', label: 'Select Class' },
                  ...classes.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
              <FormSelect
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                label="Exam Type"
                options={[
                  { value: 'BOT', label: 'BOT' },
                  { value: 'MOT', label: 'MOT' },
                  { value: 'EOT', label: 'EOT' },
                  { value: 'Mock', label: 'Mock' }
                ]}
              />
              <FormSelect
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                label="Subject"
                disabled={!classId}
                options={[
                  { value: '', label: 'Select Subject' },
                  ...subjects.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600"
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📤 Step 2: Upload File</h3>
            
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
                className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600"
              >
                <Upload className="w-5 h-5" />
                Select Excel File
              </label>
              {file && (
                <p className="mt-4 text-sm text-gray-600">
                  Selected: <span className="font-semibold">{file.name}</span>
                </p>
              )}
            </div>

            {file && classId && subjectId && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-4 w-full px-6 py-3 rounded-xl font-semibold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : '🚀 Upload Marks'}
              </button>
            )}
          </div>

          {/* Imports List */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Import History</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4">Class</th>
                    <th className="text-left py-3 px-4">Subject</th>
                    <th className="text-left py-3 px-4">Term/Year</th>
                    <th className="text-left py-3 px-4">Exam</th>
                    <th className="text-center py-3 px-4">Valid</th>
                    <th className="text-center py-3 px-4">Invalid</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{imp.class?.name}</td>
                      <td className="py-3 px-4">{imp.subject?.name}</td>
                      <td className="py-3 px-4">{imp.term} {imp.year}</td>
                      <td className="py-3 px-4">{imp.exam_type}</td>
                      <td className="py-3 px-4 text-center text-green-600">{imp.valid_rows}</td>
                      <td className="py-3 px-4 text-center text-red-600">{imp.invalid_rows}</td>
                      <td className="py-3 px-4 text-center">
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
                      <td className="py-3 px-4 text-center">
                        {imp.status === 'pending' && isAdmin && (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleApprove(imp.id)}
                              className="px-3 py-1 rounded bg-green-500 text-white text-sm hover:bg-green-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(imp.id)}
                              className="px-3 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
