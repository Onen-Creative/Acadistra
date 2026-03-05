'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import { Card, Badge, Avatar, Tabs, Table, Button, Group, Modal, Select } from '@mantine/core'
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
      const response = await api.get('/classes', { params })
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
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold">
                  {studentData.first_name[0]}{studentData.last_name[0]}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {studentData.first_name} {studentData.middle_name || ''} {studentData.last_name}
                </h1>
                <div className="flex items-center gap-4 text-indigo-100">
                  <span>Admission No: {studentData.admission_no}</span>
                  <span>•</span>
                  <span>{studentData.gender}</span>
                  <span>•</span>
                  <span>{calculateAge(studentData.date_of_birth)} years old</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={openPromote}
                className="bg-green-500/80 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Promote/Demote
              </button>
              <Link href={`/students/${studentId}/edit`}>
                <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Edit Student
                </button>
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-500/80 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => router.back()}
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex gap-3">
          <span className={`px-4 py-2 rounded-lg font-medium ${
            studentData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {studentData.status?.toUpperCase()}
          </span>
          {studentData.residence_type && (
            <span className="px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-800">
              {studentData.residence_type}
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal">
          <Tabs.List>
            <Tabs.Tab value="personal">Personal Information</Tabs.Tab>
            <Tabs.Tab value="guardians">Guardians</Tabs.Tab>
            <Tabs.Tab value="academic">Academic Records</Tabs.Tab>
            <Tabs.Tab value="health">Health & Special Needs</Tabs.Tab>
          </Tabs.List>

          {/* Personal Information */}
          <Tabs.Panel value="personal" pt="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Information</h3>
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

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Contact Information</h3>
                <div className="space-y-3">
                  <InfoRow label="Email" value={studentData.email || 'N/A'} />
                  <InfoRow label="Phone" value={studentData.phone || 'N/A'} />
                  <InfoRow label="Address" value={studentData.address || 'N/A'} />
                  <InfoRow label="District" value={studentData.district || 'N/A'} />
                  <InfoRow label="Village" value={studentData.village || 'N/A'} />
                  <InfoRow label="Residence Type" value={studentData.residence_type || 'N/A'} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Previous Education</h3>
                <div className="space-y-3">
                  <InfoRow label="Previous School" value={studentData.previous_school || 'N/A'} />
                  <InfoRow label="Previous Class" value={studentData.previous_class || 'N/A'} />
                  <InfoRow label="Admission Date" value={studentData.admission_date ? new Date(studentData.admission_date).toLocaleDateString() : 'N/A'} />
                </div>
              </div>
            </div>
          </Tabs.Panel>

          {/* Guardians */}
          <Tabs.Panel value="guardians" pt="lg">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {studentData.guardians && studentData.guardians.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {studentData.guardians.map((guardian: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-bold text-lg">
                            {guardian.full_name[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{guardian.full_name}</h4>
                          <p className="text-sm text-gray-500">{guardian.relationship}</p>
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
                        <div className="flex gap-2 mt-3">
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
          </Tabs.Panel>

          {/* Academic Records */}
          <Tabs.Panel value="academic" pt="lg">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Enrollment History</h3>
              {studentData.enrollments && studentData.enrollments.length > 0 ? (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Class</Table.Th>
                      <Table.Th>Year</Table.Th>
                      <Table.Th>Term</Table.Th>
                      <Table.Th>Enrolled On</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {studentData.enrollments.map((enrollment: any) => (
                      <Table.Tr key={enrollment.id}>
                        <Table.Td>{enrollment.class?.name || 'N/A'}</Table.Td>
                        <Table.Td>{enrollment.year}</Table.Td>
                        <Table.Td>Term {enrollment.term}</Table.Td>
                        <Table.Td>{new Date(enrollment.enrolled_on).toLocaleDateString()}</Table.Td>
                        <Table.Td>
                          <Badge color={enrollment.status === 'active' ? 'green' : 'gray'}>
                            {enrollment.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">No enrollment records found</p>
              )}
            </div>
          </Tabs.Panel>

          {/* Health & Special Needs */}
          <Tabs.Panel value="health" pt="lg">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Health & Special Needs</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Needs</label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">
                    {studentData.special_needs || 'None reported'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Disability Status</label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">
                    {studentData.disability_status || 'None reported'}
                  </p>
                </div>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs>

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
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}
