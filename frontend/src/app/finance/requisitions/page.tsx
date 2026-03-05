'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import RequisitionReceipt from '@/components/RequisitionReceipt';

export default function RequisitionsPage() {
  const { user } = useRequireAuth(['bursar', 'school_admin', 'teacher']);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveBudgetId, setApproveBudgetId] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [formData, setFormData] = useState({
    department: '',
    category: '',
    title: '',
    description: '',
    justification: '',
    priority: 'medium',
    budget_id: '',
    items: [{ item_name: '', quantity: 1, unit: 'pieces', unit_price: '', specifications: '' }]
  });

  const departments = ['Administration', 'Academic', 'Sports', 'Maintenance', 'Transport', 'ICT', 'Library', 'Clinic'];
  const categories = ['Salaries', 'Supplies', 'Utilities', 'Maintenance', 'Transport', 'Events', 'Other'];

  useEffect(() => {
    if (user) {
      fetchRequisitions();
      fetchStats();
      // Only fetch budgets for bursar and school_admin
      if (user.role === 'bursar' || user.role === 'school_admin') {
        fetchBudgets();
      }
    }
  }, [user, statusFilter, priorityFilter]);

  const fetchBudgets = async () => {
    try {
      const response = await api.get('/budgets');
      setBudgets(response.data.budgets || []);
    } catch (error) {
      // Silently fail - user doesn't have access to budgets
    }
  };

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      const response = await api.get(`/requisitions?${params}`);
      setRequisitions(response.data.requisitions || []);
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/requisitions/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Creating requisition...');
    try {
      const payload = {
        ...formData,
        budget_id: formData.budget_id || null,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity as any),
          unit_price: parseFloat(item.unit_price)
        }))
      };
      await api.post('/requisitions', payload);
      toast.success('✅ Requisition created successfully!', { id: loadingToast });
      setShowModal(false);
      setFormData({ department: '', category: '', title: '', description: '', justification: '', priority: 'medium', budget_id: '', items: [{ item_name: '', quantity: 1, unit: 'pieces', unit_price: '', specifications: '' }] });
      fetchRequisitions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create requisition', { id: loadingToast });
    }
  };

  const handleApprove = async (id: string) => {
    const loadingToast = toast.loading('Approving...');
    try {
      await api.post(`/requisitions/${id}/approve`, { notes: 'Approved', budget_id: approveBudgetId || null });
      toast.success('✅ Requisition approved!', { id: loadingToast });
      setShowApproveDialog(false);
      setSelectedRequisition(null);
      setApproveBudgetId('');
      fetchRequisitions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve', { id: loadingToast });
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    const loadingToast = toast.loading('Rejecting...');
    try {
      await api.post(`/requisitions/${id}/reject`, { notes: rejectNotes });
      toast.success('❌ Requisition rejected', { id: loadingToast });
      setShowRejectDialog(false);
      setSelectedRequisition(null);
      setRejectNotes('');
      fetchRequisitions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject', { id: loadingToast });
    }
  };

  const handleMarkPaid = async (id: string) => {
    const loadingToast = toast.loading('Processing payment...');
    try {
      const response = await api.post(`/requisitions/${id}/mark-paid`, {});
      toast.success('💵 Requisition marked as paid and expenditure created!', { id: loadingToast });
      setShowPayDialog(false);
      setSelectedRequisition(null);
      
      // Show receipt automatically
      if (response.data.requisition) {
        setReceiptData(response.data.requisition);
        setShowReceipt(true);
      }
      
      fetchRequisitions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark as paid', { id: loadingToast });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: '', quantity: 1, unit: 'pieces', unit_price: '', specifications: '' }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const exportRequisitions = () => {
    const data = requisitions.map((r, i) => ({
      '#': i + 1,
      'Req No': r.requisition_no,
      'Title': r.title,
      'Department': r.department,
      'Amount': r.total_amount,
      'Priority': r.priority,
      'Status': r.status,
      'Requested By': r.requester?.full_name,
      'Date': new Date(r.requested_date).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requisitions');
    XLSX.writeFile(wb, `requisitions_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('📊 Requisitions exported!');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-4 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold mb-2">Requisitions</h1>
              <p className="text-sm md:text-base text-purple-100">Purchase requests and approvals</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-white text-purple-600 hover:bg-purple-50 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg">
                + New Requisition
              </button>
              <button onClick={exportRequisitions} disabled={!requisitions.length} className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg disabled:opacity-50">
                📊 Export
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs md:text-sm text-gray-500">Total</p>
              <p className="text-xl md:text-2xl font-bold">{stats.total_requisitions}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs md:text-sm text-gray-500">Pending</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pending_count}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs md:text-sm text-gray-500">Approved</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{stats.approved_count}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs md:text-sm text-gray-500">Total Amount</p>
              <p className="text-lg md:text-xl font-bold">UGX {stats.total_amount?.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setStatusFilter(''); setPriorityFilter(''); }} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Requisitions Table */}
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Req No</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Priority</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requisitions.length > 0 ? requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-mono">{req.requisition_no}</td>
                      <td className="px-3 md:px-6 py-4">
                        <div className="text-xs md:text-sm font-medium text-gray-900">{req.title}</div>
                        <div className="text-xs text-gray-500">{req.department}</div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-right font-semibold">UGX {req.total_amount?.toLocaleString()}</td>
                      <td className="px-3 md:px-6 py-4 text-center hidden md:table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        {req.status === 'pending' && (user?.role === 'bursar' || user?.role === 'school_admin') && (
                          <div className="flex flex-col md:flex-row justify-center gap-1 md:gap-2">
                            <button onClick={() => { setSelectedRequisition(req); setShowApproveDialog(true); }} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">✓ Approve</button>
                            <button onClick={() => { setSelectedRequisition(req); setShowRejectDialog(true); }} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">✗ Reject</button>
                          </div>
                        )}
                        {req.status === 'approved' && (user?.role === 'bursar' || user?.role === 'school_admin') && (
                          <button onClick={() => { setSelectedRequisition(req); setShowPayDialog(true); }} className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">💵 Mark Paid</button>
                        )}
                        {req.status === 'completed' && (
                          <button onClick={() => { setReceiptData(req); setShowReceipt(true); }} className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600">🧾 Receipt</button>
                        )}
                        {req.status === 'rejected' && <span className="text-xs text-gray-500">-</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-3 md:px-6 py-8 text-center text-gray-500 text-sm">No requisitions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Requisition Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg md:text-xl font-bold mb-4">New Requisition</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Department *</label>
                    <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Select department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category *</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Justification</label>
                  <textarea value={formData.justification} onChange={(e) => setFormData({...formData, justification: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority *</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {(user?.role === 'bursar' || user?.role === 'school_admin') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Link to Budget (Optional)</label>
                    <select value={formData.budget_id} onChange={(e) => setFormData({...formData, budget_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">No budget link</option>
                      {budgets.length > 0 && budgets.map(b => <option key={b.id} value={b.id}>{b.department} - {b.category} (UGX {b.available_amount?.toLocaleString()} available)</option>)}
                    </select>
                    {budgets.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No budgets available. Create a budget first.</p>
                    )}
                  </div>
                )}
                
                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Items *</label>
                    <button type="button" onClick={addItem} className="text-sm text-purple-600 hover:text-purple-700">+ Add Item</button>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        {formData.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-sm">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input type="text" placeholder="Item name *" value={item.item_name} onChange={(e) => updateItem(index, 'item_name', e.target.value)} required className="w-full border rounded px-2 py-1 text-sm" />
                        <input type="number" placeholder="Quantity *" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required min="1" className="w-full border rounded px-2 py-1 text-sm" />
                        <input type="text" placeholder="Unit" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                        <input type="number" placeholder="Unit price *" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} required min="0" className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <input type="text" placeholder="Specifications" value={item.specifications} onChange={(e) => updateItem(index, 'specifications', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 text-sm md:text-base">Submit Requisition</button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 text-sm md:text-base">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Approve Dialog */}
        {showApproveDialog && selectedRequisition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Approve Requisition?</h3>
                  <p className="text-sm text-gray-500">Link to budget and commit amount</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2"><strong>Title:</strong> {selectedRequisition.title}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Amount:</strong> UGX {selectedRequisition.total_amount?.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Department:</strong> {selectedRequisition.department}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Link to Budget (Optional)</label>
                <select value={approveBudgetId} onChange={(e) => setApproveBudgetId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">No budget link</option>
                  {budgets.map(b => <option key={b.id} value={b.id}>{b.department} - {b.category} (UGX {b.available_amount?.toLocaleString()} available)</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">Linking will commit the amount from the budget</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleApprove(selectedRequisition.id)} className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 font-medium">Approve</button>
                <button onClick={() => { setShowApproveDialog(false); setSelectedRequisition(null); setApproveBudgetId(''); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Dialog */}
        {showRejectDialog && selectedRequisition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Reject Requisition?</h3>
                  <p className="text-sm text-gray-500">Please provide a reason</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2"><strong>Title:</strong> {selectedRequisition.title}</p>
                <p className="text-sm text-gray-700"><strong>Amount:</strong> UGX {selectedRequisition.total_amount?.toLocaleString()}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Reason for Rejection *</label>
                <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3} placeholder="Enter reason..." className="w-full border rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleReject(selectedRequisition.id)} className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 font-medium">Reject</button>
                <button onClick={() => { setShowRejectDialog(false); setSelectedRequisition(null); setRejectNotes(''); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Mark as Paid Dialog */}
        {showPayDialog && selectedRequisition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💵</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Mark as Paid?</h3>
                  <p className="text-sm text-gray-500">This will create an expenditure record</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2"><strong>Title:</strong> {selectedRequisition.title}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Amount:</strong> UGX {selectedRequisition.total_amount?.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Department:</strong> {selectedRequisition.department}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">ℹ️ This will move the amount from committed to spent in the budget and create an expenditure record.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleMarkPaid(selectedRequisition.id)} className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-medium">Mark as Paid</button>
                <button onClick={() => { setShowPayDialog(false); setSelectedRequisition(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && receiptData && (
          <RequisitionReceipt
            requisition={receiptData}
            onClose={() => { setShowReceipt(false); setReceiptData(null); }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
