'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { FileText, Upload, Download, Trash2, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

interface StaffDocument {
  id: string
  staff_id: string
  document_type: string
  document_name: string
  file_url: string
  file_size?: number
  uploaded_by: string
  uploaded_at: string
  expiry_date?: string
  notes?: string
}

const DOCUMENT_TYPES = [
  'CV/Resume',
  'Certificate',
  'Degree',
  'Diploma',
  'National ID',
  'Passport',
  'Contract',
  'Reference Letter',
  'Medical Certificate',
  'Police Clearance',
  'Tax Clearance',
  'NSSF Card',
  'Other'
]

export default function StaffDocumentsPage() {
  const [documents, setDocuments] = useState<StaffDocument[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    if (selectedStaff) {
      fetchDocuments()
    }
  }, [selectedStaff])

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff')
      setStaff(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }

  const fetchDocuments = async () => {
    if (!selectedStaff) return
    try {
      setLoading(true)
      const response = await api.get(`/staff/${selectedStaff}/documents`)
      setDocuments(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const data = {
      staff_id: selectedStaff,
      document_type: formData.get('document_type'),
      document_name: formData.get('document_name'),
      file_url: formData.get('file_url'),
      expiry_date: formData.get('expiry_date') || undefined,
      notes: formData.get('notes') || undefined
    }

    try {
      setUploading(true)
      await api.post(`/staff/${selectedStaff}/documents`, data)
      toast.success('Document uploaded')
      setShowUploadModal(false)
      fetchDocuments()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    try {
      await api.delete(`/staff/documents/${id}`)
      toast.success('Document deleted')
      fetchDocuments()
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const selectedStaffData = staff.find(s => s.id === selectedStaff)

  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) acc[doc.document_type] = []
    acc[doc.document_type].push(doc)
    return acc
  }, {} as Record<string, StaffDocument[]>)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/staff" className="text-white/80 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-3xl font-bold">Staff Documents</h1>
              </div>
              <p className="text-purple-100">Manage staff certificates, contracts, and documents</p>
            </div>
            <div className="flex gap-2">
              <Link href="/staff/leave" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Calendar className="w-4 h-4" />
                Leave
              </Link>
              <Link href="/staff/attendance" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Users className="w-4 h-4" />
                Attendance
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium mb-2">Select Staff Member</label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Choose staff...</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.employee_id})
                  </option>
                ))}
              </select>
            </div>
            {selectedStaff && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>
        </div>

        {selectedStaff && selectedStaffData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {selectedStaffData.first_name[0]}{selectedStaffData.last_name[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedStaffData.first_name} {selectedStaffData.last_name}</h2>
                <p className="text-gray-600">{selectedStaffData.employee_id} • {selectedStaffData.role}</p>
              </div>
            </div>
          </div>
        )}

        {selectedStaff && (
          loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No documents uploaded yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDocs).map(([type, docs]) => (
                <div key={type} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      {type} <span className="text-sm font-normal text-gray-500">({docs.length})</span>
                    </h3>
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {docs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FileText className="w-5 h-5 text-purple-600 mr-3" />
                                <div className="text-sm font-medium text-gray-900">{doc.document_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {doc.expiry_date ? (
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  new Date(doc.expiry_date) < new Date() ? 'bg-red-100 text-red-800' :
                                  new Date(doc.expiry_date) < new Date(Date.now() + 30*24*60*60*1000) ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {new Date(doc.expiry_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={doc.notes}>
                              {doc.notes || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex justify-center gap-3">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => handleDelete(doc.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {docs.map((doc) => (
                      <div key={doc.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-8 h-8 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 mb-2">{doc.document_name}</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Uploaded:</span>
                                <span className="text-gray-900">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                              </div>
                              {doc.expiry_date && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Expiry:</span>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    new Date(doc.expiry_date) < new Date() ? 'bg-red-100 text-red-800' :
                                    new Date(doc.expiry_date) < new Date(Date.now() + 30*24*60*60*1000) ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {new Date(doc.expiry_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {doc.notes && (
                                <div>
                                  <span className="text-gray-600">Notes:</span>
                                  <p className="text-gray-800 text-xs mt-1">{doc.notes}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-3 mt-3">
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-purple-600 hover:text-purple-900 text-sm font-medium"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </a>
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-600 to-pink-700 px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Upload Document</h2>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Document Type *</label>
                  <select name="document_type" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all">
                    <option value="">Select Document Type</option>
                    {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Document Name *</label>
                  <input 
                    name="document_name" 
                    required 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" 
                    placeholder="e.g., Bachelor's Degree in Education" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">File URL *</label>
                  <input 
                    name="file_url" 
                    type="url" 
                    required 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" 
                    placeholder="https://..." 
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Upload file to cloud storage and paste URL here
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                  <input 
                    name="expiry_date" 
                    type="date" 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea 
                    name="notes" 
                    rows={3} 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none" 
                    placeholder="Additional notes about this document..."
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploading} 
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
