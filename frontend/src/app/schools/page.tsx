'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { schoolsApi } from '@/services/api'
import { Button, Modal, TextInput, Table, ActionIcon, Card, Badge } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<any>(null)

  const form = useForm({
    initialValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      levels: [],
    },
  })

  useEffect(() => {
    loadSchools()
  }, [])

  const loadSchools = async () => {
    try {
      const data = await schoolsApi.list()
      setSchools(data.schools || [])
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load schools', color: 'red' })
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingSchool) {
        await schoolsApi.update(editingSchool.id, values)
      } else {
        await schoolsApi.create(values)
      }
      notifications.show({ title: 'Success', message: 'School saved', color: 'green' })
      setShowModal(false)
      setEditingSchool(null)
      form.reset()
      loadSchools()
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to save school', color: 'red' })
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await schoolsApi.toggleActive(id)
      notifications.show({ title: 'Success', message: 'School status updated', color: 'green' })
      loadSchools()
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to update status', color: 'red' })
    }
  }

  const activeSchools = schools.filter(s => s.is_active).length
  const inactiveSchools = schools.length - activeSchools

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Schools Management</h1>
          <p className="text-blue-100">Manage all schools in the system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Schools</p>
                <p className="text-4xl font-bold mt-2">{schools.length}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Schools</p>
                <p className="text-4xl font-bold mt-2">{activeSchools}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Inactive Schools</p>
                <p className="text-4xl font-bold mt-2">{inactiveSchools}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={() => { setEditingSchool(null); form.reset(); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add School
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">{school.name[0]}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{school.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{school.address || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{school.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{school.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        school.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {school.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setEditingSchool(school); form.setValues(school); setShowModal(true); }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(school.id, school.is_active)}
                          className={school.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        >
                          {school.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal opened={showModal} onClose={() => { setShowModal(false); setEditingSchool(null); form.reset(); }} title={`${editingSchool ? 'Edit' : 'Add'} School`} size="lg">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput label="School Name" required {...form.getInputProps('name')} mb="md" />
            <TextInput label="Address" {...form.getInputProps('address')} mb="md" />
            <TextInput label="Phone" {...form.getInputProps('phone')} mb="md" />
            <TextInput label="Email" type="email" {...form.getInputProps('email')} mb="md" />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowModal(false); setEditingSchool(null); form.reset(); }}>Cancel</Button>
              <Button type="submit">{editingSchool ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
