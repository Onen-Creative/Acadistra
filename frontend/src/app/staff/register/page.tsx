'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import toast from 'react-hot-toast'

const ROLES = ['Teacher', 'Admin', 'Bursar', 'Librarian', 'Nurse', 'Security', 'Cook', 'Cleaner', 'Driver', 'Accountant', 'IT Support']
const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Part-time', 'Volunteer']

export default function StaffRegisterPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '', date_of_birth: '', gender: '', nationality: 'Ugandan',
    national_id: '', email: '', phone: '', alternative_phone: '', address: '', district: '', village: '',
    role: 'Teacher', department: '', qualifications: '', specialization: '', experience: '',
    employment_type: 'Permanent', date_joined: new Date().toISOString().split('T')[0], contract_end_date: '',
    salary: '', bank_account: '', bank_name: '', tin: '', nssf: '', registration_number: '', registration_body: '',
    ipps_number: '', supplier_number: '', emergency_contact: '', emergency_phone: '', emergency_relation: '', notes: ''
  })

  const steps = [
    { num: 1, title: 'Personal', desc: 'Basic details' },
    { num: 2, title: 'Contact', desc: 'Contact info' },
    { num: 3, title: 'Employment', desc: 'Job details' },
    { num: 4, title: 'Financial', desc: 'Banking' },
    { num: 5, title: 'Emergency', desc: 'Emergency contact' },
    { num: 6, title: 'Review', desc: 'Confirm' }
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateStep = () => {
    if (currentStep === 1 && (!formData.first_name || !formData.last_name)) {
      toast.error('First name and last name are required')
      return false
    }
    if (currentStep === 2 && (!formData.email || !formData.phone)) {
      toast.error('Email and phone are required')
      return false
    }
    if (currentStep === 3 && !formData.role) {
      toast.error('Role is required')
      return false
    }
    return true
  }

  const nextStep = () => validateStep() && setCurrentStep(currentStep + 1)
  const prevStep = () => setCurrentStep(currentStep - 1)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload: any = { ...formData }
      if (payload.salary) payload.salary = parseFloat(payload.salary)
      if (payload.experience) payload.experience = parseInt(payload.experience)
      await api.post('/api/v1/staff', payload)
      toast.success('Staff registered successfully!')
      router.push('/staff')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to register staff')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Register New Staff</h1>
          <p className="text-indigo-100">Complete the registration process step by step</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= step.num ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {currentStep > step.num ? '✓' : step.num}
                  </div>
                  <div className="text-center mt-2">
                    <div className={`text-sm font-medium ${currentStep >= step.num ? 'text-indigo-600' : 'text-gray-500'}`}>{step.title}</div>
                    <div className="text-xs text-gray-400 hidden sm:block">{step.desc}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && <div className={`h-1 flex-1 mx-2 ${currentStep > step.num ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">First Name *</label><input name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Middle Name</label><input name="middle_name" value={formData.middle_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Last Name *</label><input name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Date of Birth</label><input name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Gender</label><select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Nationality</label><input name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">National ID</label><input name="national_id" value={formData.national_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Contact & Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Email *</label><input name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Phone *</label><input name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Alternative Phone</label><input name="alternative_phone" value={formData.alternative_phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">District</label><input name="district" value={formData.district} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Village</label><input name="village" value={formData.village} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Employment Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Role *</label><select name="role" value={formData.role} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Department</label><input name="department" value={formData.department} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Employment Type</label><select name="employment_type" value={formData.employment_type} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">{EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Date Joined</label><input name="date_joined" type="date" value={formData.date_joined} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Experience (Years)</label><input name="experience" type="number" value={formData.experience} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Specialization</label><input name="specialization" value={formData.specialization} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Qualifications</label><textarea name="qualifications" value={formData.qualifications} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Financial Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Monthly Salary (UGX)</label><input name="salary" type="number" value={formData.salary} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Bank Name</label><input name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Bank Account</label><input name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">TIN</label><input name="tin" value={formData.tin} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">NSSF</label><input name="nssf" value={formData.nssf} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">IPPS Number</label><input name="ipps_number" value={formData.ipps_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Supplier Number</label><input name="supplier_number" value={formData.supplier_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Registration Number</label><input name="registration_number" value={formData.registration_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Registration Body</label><input name="registration_body" value={formData.registration_body} onChange={handleChange} placeholder="e.g., UNEB, Nursing Council" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Contact Name</label><input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Phone</label><input name="emergency_phone" value={formData.emergency_phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Relationship</label><input name="emergency_relation" value={formData.emergency_relation} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Review & Confirm</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-indigo-600">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-gray-600">First Name:</span> <span className="font-medium">{formData.first_name}</span></div>
                    {formData.middle_name && <div><span className="text-gray-600">Middle Name:</span> <span className="font-medium">{formData.middle_name}</span></div>}
                    <div><span className="text-gray-600">Last Name:</span> <span className="font-medium">{formData.last_name}</span></div>
                    {formData.date_of_birth && <div><span className="text-gray-600">Date of Birth:</span> <span className="font-medium">{formData.date_of_birth}</span></div>}
                    {formData.gender && <div><span className="text-gray-600">Gender:</span> <span className="font-medium">{formData.gender}</span></div>}
                    {formData.nationality && <div><span className="text-gray-600">Nationality:</span> <span className="font-medium">{formData.nationality}</span></div>}
                    {formData.national_id && <div><span className="text-gray-600">National ID:</span> <span className="font-medium">{formData.national_id}</span></div>}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-indigo-600">Contact & Address</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{formData.email}</span></div>
                    <div><span className="text-gray-600">Phone:</span> <span className="font-medium">{formData.phone}</span></div>
                    {formData.alternative_phone && <div><span className="text-gray-600">Alt Phone:</span> <span className="font-medium">{formData.alternative_phone}</span></div>}
                    {formData.address && <div className="col-span-2"><span className="text-gray-600">Address:</span> <span className="font-medium">{formData.address}</span></div>}
                    {formData.district && <div><span className="text-gray-600">District:</span> <span className="font-medium">{formData.district}</span></div>}
                    {formData.village && <div><span className="text-gray-600">Village:</span> <span className="font-medium">{formData.village}</span></div>}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-indigo-600">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-gray-600">Role:</span> <span className="font-medium">{formData.role}</span></div>
                    {formData.department && <div><span className="text-gray-600">Department:</span> <span className="font-medium">{formData.department}</span></div>}
                    <div><span className="text-gray-600">Employment Type:</span> <span className="font-medium">{formData.employment_type}</span></div>
                    <div><span className="text-gray-600">Date Joined:</span> <span className="font-medium">{formData.date_joined}</span></div>
                    {formData.experience && Number(formData.experience) > 0 && <div><span className="text-gray-600">Experience:</span> <span className="font-medium">{formData.experience} years</span></div>}
                    {formData.specialization && <div><span className="text-gray-600">Specialization:</span> <span className="font-medium">{formData.specialization}</span></div>}
                    {formData.qualifications && <div className="col-span-2"><span className="text-gray-600">Qualifications:</span> <span className="font-medium">{formData.qualifications}</span></div>}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-indigo-600">Financial Information</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {formData.salary && <div><span className="text-gray-600">Monthly Salary:</span> <span className="font-medium">UGX {Number(formData.salary).toLocaleString()}</span></div>}
                    {formData.bank_name && <div><span className="text-gray-600">Bank:</span> <span className="font-medium">{formData.bank_name}</span></div>}
                    {formData.bank_account && <div className="col-span-2"><span className="text-gray-600">Account:</span> <span className="font-medium">{formData.bank_account}</span></div>}
                    {formData.tin && <div><span className="text-gray-600">TIN:</span> <span className="font-medium">{formData.tin}</span></div>}
                    {formData.nssf && <div><span className="text-gray-600">NSSF:</span> <span className="font-medium">{formData.nssf}</span></div>}
                    {formData.ipps_number && <div><span className="text-gray-600">IPPS Number:</span> <span className="font-medium">{formData.ipps_number}</span></div>}
                    {formData.supplier_number && <div><span className="text-gray-600">Supplier Number:</span> <span className="font-medium">{formData.supplier_number}</span></div>}
                    {formData.registration_number && <div><span className="text-gray-600">Registration Number:</span> <span className="font-medium">{formData.registration_number}</span></div>}
                    {formData.registration_body && <div><span className="text-gray-600">Registration Body:</span> <span className="font-medium">{formData.registration_body}</span></div>}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-indigo-600">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {formData.emergency_contact && <div><span className="text-gray-600">Name:</span> <span className="font-medium">{formData.emergency_contact}</span></div>}
                    {formData.emergency_phone && <div><span className="text-gray-600">Phone:</span> <span className="font-medium">{formData.emergency_phone}</span></div>}
                    {formData.emergency_relation && <div><span className="text-gray-600">Relationship:</span> <span className="font-medium">{formData.emergency_relation}</span></div>}
                    {formData.notes && <div className="col-span-2"><span className="text-gray-600">Notes:</span> <span className="font-medium">{formData.notes}</span></div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <button onClick={prevStep} disabled={currentStep === 1} className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
            {currentStep < 6 ? (
              <button onClick={nextStep} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Next</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Complete Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
