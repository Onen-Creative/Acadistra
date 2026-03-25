'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Container, Title, Group, Button, TextInput, Select, Card, Table, Avatar, Badge,
  ActionIcon, Menu, Text, Grid, Stack, Modal, Paper, FileInput, Stepper, Tabs
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { studentsApi, classesApi } from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import Link from 'next/link'

interface Student {
  id: string
  admission_no: string
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth: string
  gender: string
  email?: string
  phone?: string
  status: string
  photo_url?: string
  guardians?: Array<{
    full_name: string
    phone: string
    relationship: string
  }>
}

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure()
  const [importModalOpened, { open: openImport, close: closeImport }] = useDisclosure()
  const [photoUploadModalOpened, { open: openPhotoUpload, close: closePhotoUpload }] = useDisclosure()
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const [uploadResults, setUploadResults] = useState<{success: number, failed: number, total: number}>({success: 0, failed: 0, total: 0})
  const [photoUploadClass, setPhotoUploadClass] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [importId, setImportId] = useState('')
  const [importYear, setImportYear] = useState('2026')
  const [importTerm, setImportTerm] = useState('Term 1')
  const [importClass, setImportClass] = useState('')
  const [importDetails, setImportDetails] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
  }, [])

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', searchTerm, selectedClass, selectedGender, selectedLevel, selectedYear, selectedTerm],
    queryFn: async () => {
      const params: any = { limit: 100 }
      if (searchTerm) params.search = searchTerm
      if (selectedClass) params.class_id = selectedClass
      if (selectedGender) params.gender = selectedGender
      if (selectedLevel) params.level = selectedLevel
      
      if (selectedLevel || selectedClass) {
        if (selectedYear) params.year = selectedYear
        if (selectedTerm) params.term = selectedTerm
      }
      
      const response = await studentsApi.list(params)
      return Array.isArray(response) ? { students: response, total: response.length } : response
    },
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes', selectedYear, selectedTerm],
    queryFn: async () => {
      const params: any = {}
      if (selectedYear) params.year = selectedYear
      if (selectedTerm) params.term = selectedTerm
      const response = await classesApi.list(params)
      return Array.isArray(response) ? { classes: response } : response
    },
  })

  const { data: imports } = useQuery({
    queryKey: ['imports'],
    queryFn: async () => {
      const res = await api.get('/api/v1/import/list')
      return res.data
    }
  })

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      notifications.show({ title: 'Success', message: 'Student deleted successfully', color: 'green' })
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to delete student', color: 'red' })
    }
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('class_id', importClass)
      const res = await api.post('/api/v1/import/students/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: async (data) => {
      notifications.show({ title: 'Success', message: 'File uploaded successfully', color: 'green' })
      setImportId(data.import.id)
      // Fetch import details
      const detailsRes = await api.get(`/import/${data.import.id}`)
      setImportDetails(detailsRes.data.import)
      setActiveStep(2)
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || 'Upload failed'
      notifications.show({ title: 'Error', message: errorMsg, color: 'red' })
      console.error('Upload error:', error.response?.data)
    }
  })

  const { data: photoClassStudents } = useQuery({
    queryKey: ['students-for-photos', photoUploadClass, selectedYear, selectedTerm],
    queryFn: async () => {
      if (!photoUploadClass) return []
      const params: any = { class_id: photoUploadClass, year: selectedYear, term: selectedTerm, limit: 500 }
      const response = await studentsApi.list(params)
      return Array.isArray(response) ? response : response.students
    },
    enabled: !!photoUploadClass
  })

  const bulkPhotoUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = { success: 0, failed: 0, total: files.length }
      const students = photoClassStudents || []
      
      for (const file of files) {
        try {
          // Extract full name from filename (e.g., "John Doe.jpg")
          const fileName = file.name.split('.').slice(0, -1).join('.')
          
          // Find matching student by full name
          const student = students.find((s: Student) => {
            const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim().replace(/\s+/g, ' ')
            return fullName.toLowerCase() === fileName.toLowerCase()
          })
          
          if (!student) {
            results.failed++
            setUploadProgress(prev => ({ ...prev, [fileName]: -1 }))
            continue
          }
          
          // Upload photo
          const formData = new FormData()
          formData.append('photo', file)
          
          const token = localStorage.getItem('access_token')
          const uploadRes = await fetch(`http://localhost:8080/api/v1/upload/student-photo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          })
          
          if (!uploadRes.ok) {
            results.failed++
            setUploadProgress(prev => ({ ...prev, [fileName]: -1 }))
            continue
          }
          
          const uploadData = await uploadRes.json()
          
          // Update student with photo URL
          const updateRes = await fetch(`http://localhost:8080/api/v1/students/${student.id}`, {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photo_url: uploadData.photo_url })
          })
          
          if (updateRes.ok) {
            results.success++
            setUploadProgress(prev => ({ ...prev, [fileName]: 100 }))
          } else {
            results.failed++
            setUploadProgress(prev => ({ ...prev, [fileName]: -1 }))
          }
        } catch (error) {
          results.failed++
        }
      }
      
      return results
    },
    onSuccess: (results) => {
      setUploadResults(results)
      queryClient.invalidateQueries({ queryKey: ['students'] })
      notifications.show({ 
        title: 'Upload Complete', 
        message: `${results.success} photos uploaded successfully, ${results.failed} failed`, 
        color: results.failed === 0 ? 'green' : 'yellow' 
      })
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Bulk upload failed', color: 'red' })
    }
  })

  const handleBulkPhotoUpload = () => {
    if (!photoUploadClass) {
      notifications.show({ title: 'Error', message: 'Please select a class', color: 'red' })
      return
    }
    if (photoFiles.length === 0) {
      notifications.show({ title: 'Error', message: 'Please select photos', color: 'red' })
      return
    }
    setUploadProgress({})
    setUploadResults({success: 0, failed: 0, total: photoFiles.length})
    bulkPhotoUploadMutation.mutate(photoFiles)
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => {
      if (user?.role !== 'school_admin') {
        throw new Error('Only school admins can approve imports')
      }
      return api.post(`/import/${id}/approve`)
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Import approved and students created', color: 'green' })
      setActiveStep(3)
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.message || 'Approval failed'
      notifications.show({ title: 'Error', message: errorMsg, color: 'red' })
    }
  })

  const handleEdit = (student: any) => {
    setEditingStudent(student)
    openEdit()
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      deleteStudentMutation.mutate(id)
    }
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const downloadTemplate = async () => {
    if (!importClass) {
      notifications.show({ title: 'Error', message: 'Please select year, term, and class first', color: 'red' })
      return
    }
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/import/templates/students?year=${importYear}&term=${importTerm}&class_id=${importClass}&token=${token}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `student_import_template_${importYear}_T${importTerm}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setActiveStep(1)
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Download failed', color: 'red' })
    }
  }

  const handleUpload = () => {
    if (!file) {
      notifications.show({ title: 'Error', message: 'Please select a file', color: 'red' })
      return
    }
    if (!importClass) {
      notifications.show({ title: 'Error', message: 'Class information missing', color: 'red' })
      return
    }
    uploadMutation.mutate(file)
  }

  const maleCount = studentsData?.students?.filter((s: Student) => s.gender === 'Male').length || 0
  const femaleCount = studentsData?.students?.filter((s: Student) => s.gender === 'Female').length || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Students Management</h1>
              <p className="text-indigo-100">{selectedLevel || selectedClass ? `Academic Year ${selectedYear}, Term ${selectedTerm}` : 'All Students'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={openPhotoUpload}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Bulk Photos
              </button>
              <button
                onClick={openImport}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Students
              </button>
              <Link href="/students/register">
                <button className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Student
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Students</p>
                <p className="text-4xl font-bold mt-2">{studentsData?.total || 0}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm font-medium">Male Students</p>
                <p className="text-4xl font-bold mt-2">{maleCount}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">Female Students</p>
                <p className="text-4xl font-bold mt-2">{femaleCount}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Students</p>
                <p className="text-4xl font-bold mt-2">{studentsData?.students?.filter((s: Student) => s.status === 'active').length || 0}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {['2024', '2025', '2026', '2027'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classesData?.classes?.filter((c: any) => !selectedLevel || c.level === selectedLevel).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adm No</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Gender</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Age</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guardian</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentsData?.students?.map((student: Student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{student.admission_no}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {student.photo_url ? (
                            <img 
                              src={student.photo_url.startsWith('http') ? student.photo_url : `http://localhost:8080${student.photo_url}`}
                              alt={`${student.first_name} ${student.last_name}`}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 ${student.photo_url ? 'hidden' : ''}`}>
                            <span className="text-xs font-medium text-white">
                              {student.first_name[0]}{student.last_name[0]}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{student.email || student.phone || 'No contact'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                          student.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {student.gender[0]}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{calculateAge(student.date_of_birth)}</span>
                      </td>
                      <td className="px-3 py-3">
                        {student.guardians && student.guardians.length > 0 ? (
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">{student.guardians[0].full_name}</div>
                            <div className="text-xs text-gray-500">{student.guardians[0].phone}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                          student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status === 'active' ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <Link href={`/students/${student.id}`} className="text-indigo-600 hover:text-indigo-900 text-sm">
                            View
                          </Link>
                          <Link href={`/students/${student.id}/edit`} className="text-blue-600 hover:text-blue-900 text-sm">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bulk Photo Upload Modal */}
        <Modal 
          opened={photoUploadModalOpened} 
          onClose={() => { 
            closePhotoUpload(); 
            setPhotoFiles([]); 
            setUploadProgress({}); 
            setUploadResults({success: 0, failed: 0, total: 0});
            setPhotoUploadClass(''); 
          }} 
          title="Bulk Photo Upload" 
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Text size="sm" fw={500} c="blue" mb="xs">Instructions:</Text>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Select the class first</li>
                <li>Name each photo file with the student's full name exactly as in the system</li>
                <li>Example: "John Doe.jpg" or "John Peter Doe.jpg" (with middle name)</li>
                <li>Names are case-insensitive but must match exactly</li>
                <li>Supported formats: JPG, JPEG, PNG</li>
                <li>Maximum file size: 10MB per photo</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class *
              </label>
              <select
                value={photoUploadClass}
                onChange={(e) => setPhotoUploadClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Choose a class...</option>
                {classesData?.classes?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {photoUploadClass && photoClassStudents && (
                <Text size="xs" c="dimmed" mt="xs">
                  {photoClassStudents.length} students in this class
                </Text>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Photos
              </label>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setPhotoFiles(files)
                }}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer"
              />
              {photoFiles.length > 0 && (
                <Text size="sm" c="dimmed" mt="xs">
                  {photoFiles.length} photo(s) selected
                </Text>
              )}
            </div>

            {photoFiles.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <Text size="sm" fw={500} mb="xs">Selected Photos:</Text>
                <div className="space-y-2">
                  {photoFiles.map((file, idx) => {
                    const fileName = file.name.split('.').slice(0, -1).join('.')
                    const progress = uploadProgress[fileName]
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <Text size="xs" className="truncate">{file.name}</Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Text size="xs" c="dimmed">{(file.size / 1024).toFixed(1)} KB</Text>
                          {progress === 100 && (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {progress === -1 && (
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {uploadResults.total > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <Text size="sm" fw={500} c="green" mb="xs">Upload Results:</Text>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Text size="xs" c="dimmed">Total</Text>
                    <Text size="lg" fw={600}>{uploadResults.total}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Success</Text>
                    <Text size="lg" fw={600} c="green">{uploadResults.success}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Failed</Text>
                    <Text size="lg" fw={600} c="red">{uploadResults.failed}</Text>
                  </div>
                </div>
              </div>
            )}

            <Group>
              <Button 
                onClick={handleBulkPhotoUpload}
                disabled={photoFiles.length === 0 || !photoUploadClass}
                loading={bulkPhotoUploadMutation.isPending}
                leftSection={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                }
              >
                Upload {photoFiles.length} Photo(s)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { 
                  closePhotoUpload(); 
                  setPhotoFiles([]); 
                  setUploadProgress({}); 
                  setUploadResults({success: 0, failed: 0, total: 0});
                  setPhotoUploadClass(''); 
                }}
              >
                Close
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Import Modal */}
        <Modal opened={importModalOpened} onClose={() => { closeImport(); setActiveStep(0); setFile(null); setImportId(''); setImportYear('2026'); setImportTerm('Term 1'); setImportClass(''); setImportDetails(null); }} title="Import Students" size="xl">
          <Stepper active={activeStep}>
            <Stepper.Step label="Select Context" description="Choose year, term & class">
              <div className="space-y-4 mt-6">
                <Text size="sm" c="dimmed">Select the academic context for the import. The template will be pre-filled with this information.</Text>
                <Select
                  label="Academic Year"
                  placeholder="Select year"
                  value={importYear}
                  onChange={(value) => setImportYear(value || '2026')}
                  data={['2024', '2025', '2026', '2027'].map(y => ({ value: y, label: y }))}
                  required
                />
                <Select
                  label="Term"
                  placeholder="Select term"
                  value={importTerm}
                  onChange={(value) => setImportTerm(value || '1')}
                  data={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]}
                  required
                />
                <Select
                  label="Class"
                  placeholder="Select class"
                  value={importClass}
                  onChange={(value) => setImportClass(value || '')}
                  data={classesData?.classes?.map((c: any) => ({ value: c.id, label: c.name })) || []}
                  required
                />
                <Button 
                  leftSection={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>} 
                  onClick={downloadTemplate}
                  disabled={!importClass}
                  fullWidth
                  mt="md"
                >
                  Download Pre-filled Template
                </Button>
              </div>
            </Stepper.Step>

            <Stepper.Step label="Upload" description="Upload filled Excel file">
              <div className="space-y-4 mt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Text size="sm" fw={500} c="blue">Selected Context:</Text>
                  <Text size="sm" c="dimmed">Year: {importYear} | Term: {importTerm} | Class: {classesData?.classes?.find((c: any) => c.id === importClass)?.name}</Text>
                </div>
                <FileInput
                  label="Upload Filled Template"
                  placeholder="Select Excel file"
                  accept=".xlsx,.xls"
                  value={file}
                  onChange={setFile}
                  required
                />
                <Button 
                  leftSection={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>} 
                  onClick={handleUpload} 
                  disabled={!file} 
                  loading={uploadMutation.isPending} 
                  fullWidth
                >
                  Upload File
                </Button>
              </div>
            </Stepper.Step>

            <Stepper.Step label="Review" description="Review imported data">
              {importDetails && (
                <div className="space-y-4 mt-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Text size="sm" fw={500} c="blue" mb="xs">Import Summary</Text>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Text size="xs" c="dimmed">Total Rows</Text>
                        <Text size="lg" fw={600}>{importDetails.total_rows}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Valid Rows</Text>
                        <Text size="lg" fw={600} c="green">{importDetails.valid_rows}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Invalid Rows</Text>
                        <Text size="lg" fw={600} c="red">{importDetails.invalid_rows}</Text>
                      </div>
                    </div>
                  </div>

                  {importDetails.errors && (() => {
                    try {
                      const errors = JSON.parse(importDetails.errors)
                      return errors && errors.length > 0
                    } catch { return false }
                  })() && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <Text size="sm" fw={500} c="red" mb="xs">Errors Found</Text>
                      <div className="space-y-1">
                        {(() => {
                          try {
                            return JSON.parse(importDetails.errors).map((error: string, idx: number) => (
                              <Text key={idx} size="xs" c="red">{error}</Text>
                            ))
                          } catch { return null }
                        })()}
                      </div>
                    </div>
                  )}

                  {importDetails.data && (() => {
                    try {
                      const data = JSON.parse(importDetails.data)
                      return data && data.length > 0
                    } catch { return false }
                  })() && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <Text size="sm" fw={500} mb="xs">Preview of Valid Students ({(() => {
                        try { return JSON.parse(importDetails.data).length } catch { return 0 }
                      })()} records)</Text>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1 text-left">First Name</th>
                              <th className="px-2 py-1 text-left">Last Name</th>
                              <th className="px-2 py-1 text-left">Gender</th>
                              <th className="px-2 py-1 text-left">DOB</th>
                              <th className="px-2 py-1 text-left">Guardian</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(() => {
                              try {
                                return JSON.parse(importDetails.data).slice(0, 10).map((student: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-2 py-1">{student.first_name}</td>
                                    <td className="px-2 py-1">{student.last_name}</td>
                                    <td className="px-2 py-1">{student.gender}</td>
                                    <td className="px-2 py-1">{student.date_of_birth || 'N/A'}</td>
                                    <td className="px-2 py-1">{student.guardian_name || 'N/A'}</td>
                                  </tr>
                                ))
                              } catch { return null }
                            })()}
                          </tbody>
                        </table>
                        {(() => {
                          try {
                            const data = JSON.parse(importDetails.data)
                            return data.length > 10 && (
                              <Text size="xs" c="dimmed" mt="xs" ta="center">
                                Showing 10 of {data.length} students
                              </Text>
                            )
                          } catch { return null }
                        })()}
                      </div>
                    </div>
                  )}

                  {user?.role === 'school_admin' ? (
                    <Group>
                      <Button 
                        onClick={() => approveMutation.mutate(importId)} 
                        loading={approveMutation.isPending}
                        disabled={!importDetails || importDetails.valid_rows === 0}
                      >
                        Approve & Import {importDetails.valid_rows} Students
                      </Button>
                      <Button variant="outline" color="red" onClick={() => { setActiveStep(0); setImportId(''); setFile(null); setImportDetails(null); }}>
                        Cancel
                      </Button>
                    </Group>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <Text size="sm" c="orange" fw={500}>Only school administrators can approve imports</Text>
                    </div>
                  )}
                </div>
              )}
            </Stepper.Step>

            <Stepper.Completed>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <Title order={3}>Import Completed!</Title>
                <Text size="sm" c="dimmed" mt="xs">Students have been successfully imported to {classesData?.classes?.find((c: any) => c.id === importClass)?.name}</Text>
                <Button mt="md" onClick={() => { setActiveStep(0); setFile(null); setImportId(''); setImportYear('2026'); setImportTerm('Term 1'); setImportClass(''); setImportDetails(null); closeImport(); }}>
                  Close
                </Button>
              </div>
            </Stepper.Completed>
          </Stepper>

          <Paper p="md" mt="xl">
            <Title order={5} mb="md">Recent Imports</Title>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>File</Table.Th>
                  <Table.Th>Records</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {Array.isArray(imports) && imports.slice(0, 5).map((imp: any) => (
                  <Table.Tr key={imp.id}>
                    <Table.Td>{new Date(imp.created_at).toLocaleDateString()}</Table.Td>
                    <Table.Td>{imp.file_name}</Table.Td>
                    <Table.Td>{imp.total_records}</Table.Td>
                    <Table.Td>
                      <Badge color={imp.status === 'completed' ? 'green' : imp.status === 'pending' ? 'yellow' : 'red'}>
                        {imp.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Modal>

        {/* Edit Modal */}
        <Modal opened={editModalOpened} onClose={closeEdit} title="Edit Student" size="lg">
          <Text>Use the Edit button to navigate to the edit page</Text>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
