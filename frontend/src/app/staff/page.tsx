'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Staff {
  id: string
  employee_id: string
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  national_id?: string
  email: string
  phone: string
  alternative_phone?: string
  address?: string
  district?: string
  village?: string
  role: string
  department?: string
  qualifications?: string
  specialization?: string
  experience?: number
  employment_type?: string
  date_joined?: string
  contract_end_date?: string
  salary?: number
  bank_account?: string
  bank_name?: string
  tin?: string
  nssf?: string
  registration_number?: string
  registration_body?: string
  ipps_number?: string
  supplier_number?: string
  emergency_contact?: string
  emergency_phone?: string
  emergency_relation?: string
  status: string
  photo_url?: string
  notes?: string
}

const ROLES = ['Teacher', 'Admin', 'Bursar', 'Librarian', 'Nurse', 'Security', 'Cook', 'Cleaner', 'Driver', 'Accountant', 'IT Support']
const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Part-time', 'Volunteer']

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  useEffect(() => {
    fetchStaff()
  }, [selectedRole]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedRole) params.append('role', selectedRole)
      const response = await api.get(`/staff?${params.toString()}`)
      setStaff(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch staff:', error)
      if (error.response?.status !== 401) {
        toast.error('Failed to load staff')
      }
    } finally {
      setLoading(false)
    }
  }



  const handleUpdate = async (id: string, data: Partial<Staff>) => {
    try {
      // Convert numeric fields
      const payload: any = { ...data }
      if (payload.salary) payload.salary = parseFloat(payload.salary)
      if (payload.experience) payload.experience = parseInt(payload.experience)
      
      await api.put(`/staff/${id}`, payload)
      toast.success('Staff updated successfully')
      setEditingStaff(null)
      fetchStaff()
    } catch (error: any) {
      console.error('Update error:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to update staff')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    try {
      await api.delete(`/staff/${id}`)
      toast.success('Staff deleted successfully')
      fetchStaff()
    } catch (error) {
      toast.error('Failed to delete staff')
    }
  }

  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name} ${s.employee_id} ${s.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.status === 'active').length,
    teachers: staff.filter(s => s.role === 'Teacher').length,
    support: staff.filter(s => s.role !== 'Teacher').length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Staff Management</h1>
          <p className="text-indigo-100">Manage all school staff members</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-blue-100 text-sm font-medium">Total Staff</p>
            <p className="text-4xl font-bold mt-2">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-green-100 text-sm font-medium">Active</p>
            <p className="text-4xl font-bold mt-2">{stats.active}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-purple-100 text-sm font-medium">Teachers</p>
            <p className="text-4xl font-bold mt-2">{stats.teachers}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-yellow-100 text-sm font-medium">Support Staff</p>
            <p className="text-4xl font-bold mt-2">{stats.support}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Roles</option>
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
            <button
              onClick={() => router.push('/staff/register')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              + Add Staff
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {s.first_name[0]}{s.last_name[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{s.first_name} {s.middle_name} {s.last_name}</div>
                            <div className="text-sm text-gray-500">{s.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">{s.role}</span>
                        {s.department && <div className="text-xs text-gray-500 mt-1">{s.department}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{s.email}</div>
                        <div className="text-gray-500">{s.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{s.employment_type || 'Permanent'}</div>
                        {s.date_joined && <div className="text-gray-500">Since {new Date(s.date_joined).toLocaleDateString()}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-2">
                        <button onClick={() => setViewingStaff(s)} className="text-blue-600 hover:text-blue-900">View</button>
                        <button onClick={() => setEditingStaff(s)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {viewingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Staff Details</h2>
              <button onClick={() => setViewingStaff(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {viewingStaff.first_name[0]}{viewingStaff.last_name[0]}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{viewingStaff.first_name} {viewingStaff.middle_name} {viewingStaff.last_name}</h3>
                  <p className="text-gray-600">{viewingStaff.employee_id} • {viewingStaff.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Email:</span><p className="font-medium">{viewingStaff.email}</p></div>
                <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Phone:</span><p className="font-medium">{viewingStaff.phone}</p></div>
                {viewingStaff.date_of_birth && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">DOB:</span><p className="font-medium">{new Date(viewingStaff.date_of_birth).toLocaleDateString()}</p></div>}
                {viewingStaff.gender && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Gender:</span><p className="font-medium">{viewingStaff.gender}</p></div>}
                {viewingStaff.nationality && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Nationality:</span><p className="font-medium">{viewingStaff.nationality}</p></div>}
                {viewingStaff.national_id && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">National ID:</span><p className="font-medium">{viewingStaff.national_id}</p></div>}
                {viewingStaff.department && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Department:</span><p className="font-medium">{viewingStaff.department}</p></div>}
                {viewingStaff.employment_type && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Employment:</span><p className="font-medium">{viewingStaff.employment_type}</p></div>}
                {viewingStaff.date_joined && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Joined:</span><p className="font-medium">{new Date(viewingStaff.date_joined).toLocaleDateString()}</p></div>}
                {viewingStaff.salary && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Salary:</span><p className="font-medium">UGX {viewingStaff.salary.toLocaleString()}</p></div>}
                {viewingStaff.bank_name && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Bank:</span><p className="font-medium">{viewingStaff.bank_name}</p></div>}
                {viewingStaff.bank_account && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Bank Account:</span><p className="font-medium">{viewingStaff.bank_account}</p></div>}
                {viewingStaff.tin && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">TIN:</span><p className="font-medium">{viewingStaff.tin}</p></div>}
                {viewingStaff.nssf && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">NSSF:</span><p className="font-medium">{viewingStaff.nssf}</p></div>}
                {viewingStaff.ipps_number && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">IPPS Number:</span><p className="font-medium">{viewingStaff.ipps_number}</p></div>}
                {viewingStaff.supplier_number && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Supplier Number:</span><p className="font-medium">{viewingStaff.supplier_number}</p></div>}
                {viewingStaff.registration_number && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Registration Number:</span><p className="font-medium">{viewingStaff.registration_number}</p></div>}
                {viewingStaff.registration_body && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Registration Body:</span><p className="font-medium">{viewingStaff.registration_body}</p></div>}
                {viewingStaff.emergency_contact && <div className="bg-gray-50 p-3 rounded"><span className="text-gray-600 text-sm">Emergency Contact:</span><p className="font-medium">{viewingStaff.emergency_contact} ({viewingStaff.emergency_phone})</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Staff</h2>
              <button onClick={() => setEditingStaff(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const data: any = {}; fd.forEach((v, k) => { if (v) data[k] = v }); handleUpdate(editingStaff.id, data); }} className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">First Name</label><input name="first_name" defaultValue={editingStaff.first_name} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Middle Name</label><input name="middle_name" defaultValue={editingStaff.middle_name} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Last Name</label><input name="last_name" defaultValue={editingStaff.last_name} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Date of Birth</label><input name="date_of_birth" type="date" defaultValue={editingStaff.date_of_birth?.split('T')[0]} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Gender</label><select name="gender" defaultValue={editingStaff.gender} className="w-full px-3 py-2 border rounded-lg"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                    <div><label className="block text-sm font-medium mb-1">National ID</label><input name="national_id" defaultValue={editingStaff.national_id} className="w-full px-3 py-2 border rounded-lg" /></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Email</label><input name="email" type="email" defaultValue={editingStaff.email} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Phone</label><input name="phone" defaultValue={editingStaff.phone} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Alternative Phone</label><input name="alternative_phone" defaultValue={editingStaff.alternative_phone} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">District</label><input name="district" defaultValue={editingStaff.district} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div className="col-span-2"><label className="block text-sm font-medium mb-1">Address</label><textarea name="address" defaultValue={editingStaff.address} rows={2} className="w-full px-3 py-2 border rounded-lg" /></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Role</label><select name="role" defaultValue={editingStaff.role} className="w-full px-3 py-2 border rounded-lg">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">Department</label><input name="department" defaultValue={editingStaff.department} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Employment Type</label><select name="employment_type" defaultValue={editingStaff.employment_type} className="w-full px-3 py-2 border rounded-lg">{EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">Date Joined</label><input name="date_joined" type="date" defaultValue={editingStaff.date_joined?.split('T')[0]} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Qualifications</label><input name="qualifications" defaultValue={editingStaff.qualifications} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Specialization</label><input name="specialization" defaultValue={editingStaff.specialization} className="w-full px-3 py-2 border rounded-lg" /></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Monthly Salary (UGX)</label><input name="salary" type="number" defaultValue={editingStaff.salary} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Bank Name</label><input name="bank_name" defaultValue={editingStaff.bank_name} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Bank Account</label><input name="bank_account" defaultValue={editingStaff.bank_account} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">TIN</label><input name="tin" defaultValue={editingStaff.tin} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">NSSF</label><input name="nssf" defaultValue={editingStaff.nssf} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">IPPS Number</label><input name="ipps_number" defaultValue={editingStaff.ipps_number} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Supplier Number</label><input name="supplier_number" defaultValue={editingStaff.supplier_number} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Registration Number</label><input name="registration_number" defaultValue={editingStaff.registration_number} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Registration Body</label><input name="registration_body" defaultValue={editingStaff.registration_body} placeholder="e.g., UNEB, Nursing Council" className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Status</label><select name="status" defaultValue={editingStaff.status} className="w-full px-3 py-2 border rounded-lg"><option value="active">Active</option><option value="on_leave">On Leave</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Contact Name</label><input name="emergency_contact" defaultValue={editingStaff.emergency_contact} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Phone</label><input name="emergency_phone" defaultValue={editingStaff.emergency_phone} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Relationship</label><input name="emergency_relation" defaultValue={editingStaff.emergency_relation} className="w-full px-3 py-2 border rounded-lg" /></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setEditingStaff(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
