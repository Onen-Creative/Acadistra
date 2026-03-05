'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

export default function BudgetDetailPage() {
  const { user } = useRequireAuth(['bursar', 'school_admin']);
  const params = useParams();
  const router = useRouter();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && params.id) {
      fetchBudget();
    }
  }, [user, params.id]);

  const fetchBudget = async () => {
    try {
      const response = await api.get(`/budgets/${params.id}`);
      setBudget(response.data);
    } catch (error) {
      toast.error('Failed to load budget');
      router.push('/finance/budget');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div></DashboardLayout>;
  if (!budget) return null;

  const utilizationRate = budget.allocated_amount > 0 ? ((budget.spent_amount / budget.allocated_amount) * 100).toFixed(1) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Budget Details</h1>
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">← Back</button>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div><p className="text-sm text-gray-500">Year</p><p className="text-lg font-semibold">{budget.year}</p></div>
            <div><p className="text-sm text-gray-500">Term</p><p className="text-lg font-semibold">{budget.term || 'Annual'}</p></div>
            <div><p className="text-sm text-gray-500">Department</p><p className="text-lg font-semibold">{budget.department}</p></div>
            <div><p className="text-sm text-gray-500">Category</p><p className="text-lg font-semibold">{budget.category}</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Allocated</p><p className="text-2xl font-bold text-blue-600">UGX {budget.allocated_amount?.toLocaleString()}</p></div>
            <div className="bg-red-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Spent</p><p className="text-2xl font-bold text-red-600">UGX {budget.spent_amount?.toLocaleString()}</p></div>
            <div className="bg-yellow-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Committed</p><p className="text-2xl font-bold text-yellow-600">UGX {budget.committed_amount?.toLocaleString()}</p></div>
            <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Available</p><p className="text-2xl font-bold text-green-600">UGX {budget.available_amount?.toLocaleString()}</p></div>
          </div>
          <div className="mb-6">
            <div className="flex justify-between mb-2"><span className="text-sm font-medium">Utilization Rate</span><span className="text-sm font-medium">{utilizationRate}%</span></div>
            <div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min(parseFloat(utilizationRate as string), 100)}%` }}></div></div>
          </div>
          {budget.notes && <div className="border-t pt-4"><p className="text-sm text-gray-500 mb-1">Notes</p><p className="text-gray-700">{budget.notes}</p></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
