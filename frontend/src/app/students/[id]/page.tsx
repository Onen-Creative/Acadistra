'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import { Modal, Select, Button, Group } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import Link from 'next/link'
import { useState } from 'react'

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const studentId = params.id as string
  const [promoteModalOpened, { open: openPromote, close: closePromote }] = useDisclosure()
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedTerm, setSelectedTerm] = useState('1')

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}`)
      return res.data.student
    },
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes', selectedYear, selectedTerm],
    queryFn: async () => {
      const params: any = {}
      if (selectedYear) params.year = selectedYear
      if (selectedTerm) params.term = selectedTerm
      const response = await api.get('/api/v1/classes', { params })
      return Array.isArray(response.data) ? { classes: response.data } : response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/students/${studentId}`),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Student deleted successfully', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push('/students')
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to delete student', color: 'red' })
    }
  })

  const promoteMutation = useMutation({
    mutationFn: (data: any) => api.post(`/students/${studentId}/promote`, data),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Student promoted/demoted successfully', color: 'green' })
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      closePromote()
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to promote student', color: 'red' })
    }
  })

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${studentData.first_name} ${studentData.last_name}? This action cannot be undone.`)) {
      deleteMutation.mutate()
    }
  }

  const handlePromote = () => {
    if (!selectedClass) {
      notifications.show({ title: 'Error', message: 'Please select a class', color: 'red' })
      return
    }
    promoteMutation.mutate({
      new_class_id: selectedClass,
      year: parseInt(selectedYear),
      term: selectedTerm
    })
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!studentData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Student not found</p>
        </div>
      </DashboardLayout>
    )
  }

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A'
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Photo */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 text-white">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
              {studentData.photo_url ? (
                <img 
                  src={studentData.photo_url.startsWith('http') ? studentData.photo_url : `http://localhost:8080${studentData.photo_url}`}
                  alt={`${studentData.first_name} ${studentData.last_name}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl object-cover border-4 border-white/30 shadow-xl mx-auto sm:mx-0"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white/20 rounded-xl flex items-center justify-center border-4 border-white/30 shadow-xl mx-auto sm:mx-0">
                  <span className="text-4xl sm:text-5xl font-bold">
                    {studentData.first_name[0]}{studentData.last_name[0]}
                  </span>
                </div>
              )}
              <div className="text-center sm:text-left w-full sm:w-auto">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {studentData.first_name} {studentData.middle_name || ''} {studentData.last_name}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-sm sm:text-base text-indigo-100">
                  <span>Admission No: {studentData.admission_no}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{studentData.gender}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{calculateAge(studentData.date_of_birth)} years old</span>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 justify-center sm:justify-start">
                  <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm ${
                    studentData.status === 'active' ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'
                  }`}>
                    {studentData.status?.toUpperCase()}
                  </span>
                  {studentData.residence_type && (
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm bg-blue-500/80 text-white">
                      {studentData.residence_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto justify-center lg:justify-end">
              <button
                onClick={openPromote}
                className="bg-green-500/80 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none"
              >
                Promote/Demote
              </button>
              <Link href={`/students/${studentId}/edit`} className="flex-1 sm:flex-none">
                <button className="bg-white/20 hover:bg-white/30 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base w-full">
                  Edit Student
                </button>
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-500/80 hover:bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base flex-1 sm:flex-none"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => router.back()}
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Single Page Layout - All Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 border-b pb-2">📋 Basic Information</h3>
            <div className="space-y-3">
              <InfoRow label="First Name" value={studentData.first_name} />
              <InfoRow label="Middle Name" value={studentData.middle_name || 'N/A'} />
              <InfoRow label="Last Name" value={studentData.last_name} />
              <InfoRow label="Date of Birth" value={studentData.date_of_birth ? new Date(studentData.date_of_birth).toLocaleDateString() : 'N/A'} />
              <InfoRow label="Age" value={`${calculateAge(studentData.date_of_birth)} years`} />
              <InfoRow label="Gender" value={studentData.gender} />
              <InfoRow label="Nationality" value={studentData.nationality || 'N/A'} />
              <InfoRow label="Religion" value={studentData.religion || 'N/A'} />
              <InfoRow label="LIN" value={studentData.lin || 'N/A'} />
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 border-b pb-2">📞 Contact Information</h3>
            <div className="space-y-3">
              <InfoRow label="Email" value={studentData.email || 'N/A'} />
              <InfoRow label="Phone" value={studentData.phone || 'N/A'} />
              <InfoRow label="Address" value={studentData.address || 'N/A'} />
              <InfoRow label="District" value={studentData.district || 'N/A'} />
              <InfoRow label="Village" value={studentData.village || 'N/A'} />
              <InfoRow label="Residence Type" value={studentData.residence_type || 'N/A'} />
            </div>
          </div>

          {/* Previous Education */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 border-b pb-2">🎒 Previous Education</h3>
            <div className="space-y-3">
              <InfoRow label="Previous School" value={studentData.previous_school || 'N/A'} />
              <InfoRow label="Previous Class" value={studentData.previous_class || 'N/A'} />
              <InfoRow label="Admission Date" value={studentData.admission_date ? new Date(studentData.admission_date).toLocaleDateString() : 'N/A'} />
            </div>
          </div>

          {/* Health & Special Needs */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 border-b pb-2">🏥 Health & Special Needs</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Special Needs</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-xs sm:text-sm">
                  {studentData.special_needs || 'None reported'}
                </p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Disability Status</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-xs sm:text-sm">
                  {studentData.disability_status || 'None reported'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guardians Section - Full Width */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 border-b pb-2">👨👩👧 Guardians</h3>
          {studentData.guardians && studentData.guardians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {studentData.guardians.map((guardian: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold text-base sm:text-lg">
                        {guardian.full_name[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{guardian.full_name}</h4>
                      <p className="text-xs sm:text-sm text-gray-500">{guardian.relationship}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <InfoRow label="Phone" value={guardian.phone} />
                    {guardian.alternative_phone && (
                      <InfoRow label="Alt Phone" value={guardian.alternative_phone} />
                    )}
                    <InfoRow label="Email" value={guardian.email || 'N/A'} />
                    <InfoRow label="Occupation" value={guardian.occupation || 'N/A'} />
                    <InfoRow label="Address" value={guardian.address || 'N/A'} />
                    {guardian.workplace && (
                      <InfoRow label="Workplace" value={guardian.workplace} />
                    )}
                    {guardian.national_id && (
                      <InfoRow label="National ID" value={guardian.national_id} />
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {guardian.is_primary_contact && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Primary Contact</span>
                      )}
                      {guardian.is_emergency && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Emergency</span>
                      )}
                      {guardian.is_fee_payer && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Fee Payer</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No guardian information available
            </div>
          )}
        </div>

        {/* Enrollment History - Full Width */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 border-b pb-2">📚 Enrollment History</h3>
          {studentData.enrollments && studentData.enrollments.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Term</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Enrolled On</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentData.enrollments.map((enrollment: any) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{enrollment.class?.name || 'N/A'}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{enrollment.year}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">Term {enrollment.term}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden md:table-cell">{new Date(enrollment.enrolled_on).toLocaleDateString()}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          enrollment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No enrollment records found</p>
          )}
        </div>

        {/* Promote/Demote Modal */}
        <Modal opened={promoteModalOpened} onClose={closePromote} title="Promote/Demote Student" size="md">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Move student to a new class for a different academic year or term.</p>
            <Select
              label="Academic Year"
              placeholder="Select year"
              value={selectedYear}
              onChange={(value) => setSelectedYear(value || '2026')}
              data={['2024', '2025', '2026', '2027'].map(y => ({ value: y, label: y }))}
              required
            />
            <Select
              label="Term"
              placeholder="Select term"
              value={selectedTerm}
              onChange={(value) => setSelectedTerm(value || '1')}
              data={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]}
              required
            />
            <Select
              label="New Class"
              placeholder="Select class"
              value={selectedClass}
              onChange={(value) => setSelectedClass(value || '')}
              data={classesData?.classes?.map((c: any) => ({ value: c.id, label: c.name })) || []}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={closePromote}>Cancel</Button>
              <Button 
                onClick={handlePromote} 
                loading={promoteMutation.isPending}
                disabled={!selectedClass}
              >
                Promote/Demote
              </Button>
            </Group>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 gap-2">
      <span className="text-xs sm:text-sm font-medium text-gray-600 flex-shrink-0">{label}</span>
      <span className="text-xs sm:text-sm text-gray-900 text-right break-words">{value}</span>
    </div>
  )
}
