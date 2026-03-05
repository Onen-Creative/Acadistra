'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

export default function BudgetPage() {
  const { user } = useRequireAuth(['bursar', 'school_admin']);
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any>(null);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState('Term 1');
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    term: 'Term 1',
    department: '',
    category: '',
    allocated_amount: '',
    notes: ''
  });

  const departments = ['Administration', 'Academic', 'Sports', 'Maintenance', 'Transport', 'ICT', 'Library', 'Clinic'];
  const categories = ['Salaries', 'Supplies', 'Utilities', 'Maintenance', 'Transport', 'Events', 'Other'];

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchSummary();
    }
  }, [user, year, term]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/budgets?year=${year}&term=${term}`);
      setBudgets(response.data.budgets || []);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/budgets/summary?year=${year}&term=${term}`);
      setSummary(response.data.summary || []);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(editingBudget ? 'Updating budget...' : 'Creating budget...');
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, {
          allocated_amount: parseFloat(formData.allocated_amount),
          notes: formData.notes
        });
        toast.success('✅ Budget updated successfully!', { id: loadingToast });
      } else {
        await api.post('/budgets', {
          ...formData,
          allocated_amount: parseFloat(formData.allocated_amount)
        });
        toast.success('✅ Budget created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      setEditingBudget(null);
      setFormData({ year: new Date().getFullYear(), term: 'Term 1', department: '', category: '', allocated_amount: '', notes: '' });
      fetchBudgets();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save budget', { id: loadingToast });
    }
  };

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
    setFormData({
      year: budget.year,
      term: budget.term,
      department: budget.department,
      category: budget.category,
      allocated_amount: budget.allocated_amount.toString(),
      notes: budget.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const loadingToast = toast.loading('Deleting budget...');
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('✅ Budget deleted successfully!', { id: loadingToast });
      setShowDeleteDialog(false);
      setBudgetToDelete(null);
      fetchBudgets();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete budget', { id: loadingToast });
    }
  };

  const exportBudget = () => {
    const data = budgets.map((b, i) => ({
      '#': i + 1,
      'Department': b.department,
      'Category': b.category,
      'Allocated': b.allocated_amount,
      'Spent': b.spent_amount,
      'Committed': b.committed_amount,
      'Available': b.available_amount,
      'Utilization %': ((b.spent_amount / b.allocated_amount) * 100).toFixed(1)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budget');
    XLSX.writeFile(wb, `budget_${year}_${term}.xlsx`);
    toast.success('📊 Budget exported!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-xl shadow-lg p-4 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold mb-2">Budget Management</h1>
              <p className="text-sm md:text-base text-green-100">Plan and track school budgets</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-white text-green-600 hover:bg-green-50 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg">
                + Add Budget
              </button>
              <button onClick={exportBudget} disabled={!budgets.length} className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium shadow-lg disabled:opacity-50">
                📊 Export
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm md:text-base">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm md:text-base">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {summary.map((dept, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <h3 className="text-sm md:text-base font-semibold text-gray-700 mb-2">{dept.department}</h3>
                <div className="space-y-1 text-xs md:text-sm">
                  <div className="flex justify-between"><span>Allocated:</span><span className="font-semibold">UGX {dept.allocated_total?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Spent:</span><span className="font-semibold text-red-600">UGX {dept.spent_total?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Available:</span><span className="font-semibold text-green-600">UGX {dept.available_total?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Utilization:</span><span className="font-semibold">{dept.utilization_rate?.toFixed(1)}%</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Budget Table */}
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated</th>
                    <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Spent</th>
                    <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budgets.length > 0 ? budgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-900">{budget.department}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600">{budget.category}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-right font-semibold">UGX {budget.allocated_amount?.toLocaleString()}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-right text-red-600 hidden md:table-cell">UGX {budget.spent_amount?.toLocaleString()}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-right text-green-600 font-semibold">UGX {budget.available_amount?.toLocaleString()}</td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <button onClick={() => router.push(`/finance/budget/${budget.id}`)} className="text-blue-600 hover:text-blue-800 mr-2" title="View">👁️</button>
                        <button onClick={() => handleEdit(budget)} className="text-blue-600 hover:text-blue-800 mr-2" title="Edit">✏️</button>
                        <button onClick={() => { setBudgetToDelete(budget); setShowDeleteDialog(true); }} className="text-red-600 hover:text-red-800" title="Delete">🗑️</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-3 md:px-6 py-8 text-center text-gray-500 text-sm">No budgets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Budget Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg md:text-xl font-bold mb-4">{editingBudget ? 'Edit Budget' : 'Add Budget Allocation'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Year *</label>
                    <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Term</label>
                    <select value={formData.term} onChange={(e) => setFormData({...formData, term: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department *</label>
                  <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required disabled={!!editingBudget} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required disabled={!!editingBudget} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Allocated Amount (UGX) *</label>
                  <input type="number" value={formData.allocated_amount} onChange={(e) => setFormData({...formData, allocated_amount: e.target.value})} required min="0" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 text-sm md:text-base">{editingBudget ? 'Update' : 'Create'} Budget</button>
                  <button type="button" onClick={() => { setShowModal(false); setEditingBudget(null); }} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 text-sm md:text-base">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && budgetToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Budget?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2"><strong>Department:</strong> {budgetToDelete.department}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Category:</strong> {budgetToDelete.category}</p>
                <p className="text-sm text-gray-700"><strong>Amount:</strong> UGX {budgetToDelete.allocated_amount?.toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(budgetToDelete.id)} className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 font-medium">Delete</button>
                <button onClick={() => { setShowDeleteDialog(false); setBudgetToDelete(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
