'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '@/services/api';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function FinanceReportsPage() {
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'summary' | 'income' | 'expenditure'>('summary');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState(2026);
  const [category, setCategory] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: financeSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', term, year, dateRange],
    queryFn: () => financeApi.getSummary({ 
      term, 
      year, 
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined
    }),
  });

  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ['finance-income', term, year, category, dateRange],
    queryFn: () => financeApi.listIncome({ 
      term, 
      year, 
      category: category || undefined,
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined
    }),
  });

  const { data: expenditureData, isLoading: expenditureLoading } = useQuery({
    queryKey: ['finance-expenditure', term, year, category, dateRange],
    queryFn: () => financeApi.listExpenditure({ 
      term, 
      year, 
      category: category || undefined,
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined
    }),
  });

  const exportReport = async (type: 'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly') => {
    try {
      const blob = await financeApi.exportReport({ period: type, term, year });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const incomeCategories = ['Fees', 'Donations', 'Grants', 'Events', 'Other'];
  const expenditureCategories = ['Salaries', 'Supplies', 'Utilities', 'Maintenance', 'Transport', 'Other'];

  const isPayrollExpenditure = (expenditure: any) => {
    return expenditure.category === 'Salaries' && expenditure.description?.includes('Salary payment');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">All Categories</option>
                {incomeCategories.map(cat => (
                  <option key={`income-${cat}`} value={cat}>{cat}</option>
                ))}
                {expenditureCategories.map(cat => (
                  <option key={`expenditure-${cat}`} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
              <p className="text-xs opacity-90 mb-1">💰 Total Income</p>
              <p className="text-2xl font-bold">UGX {((financeSummary?.total_income ?? 0) || 0).toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 text-white">
              <p className="text-xs opacity-90 mb-1">💸 Total Expenditure</p>
              <p className="text-2xl font-bold">UGX {((financeSummary?.total_expenditure ?? 0) || 0).toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
              <p className="text-xs opacity-90 mb-1">📊 Net Balance</p>
              <p className="text-2xl font-bold">UGX {((financeSummary?.net_balance ?? 0) || 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'summary', label: '📊 Summary' },
                { key: 'income', label: '💰 Income' },
                { key: 'expenditure', label: '💸 Expenditure' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Financial Summary</h3>
                  <div className="flex gap-2">
                    <button onClick={() => exportReport('termly')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">📊 Export Termly</button>
                    <button onClick={() => exportReport('yearly')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">📊 Export Yearly</button>
                  </div>
                </div>

                {summaryLoading ? (
                  <div className="text-center py-8">Loading summary...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Income by Category</h4>
                      <div className="space-y-2">
                        {Object.entries(financeSummary?.income_by_category || {}).map(([category, amount]) => (
                          <div key={category} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{category}</span>
                            <span className="font-semibold text-green-600">UGX {(amount as number).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Expenditure by Category</h4>
                      <div className="space-y-2">
                        {Object.entries(financeSummary?.expense_by_category || {}).map(([category, amount]) => (
                          <div key={category} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{category}</span>
                            <span className="font-semibold text-red-600">UGX {(amount as number).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Income Tab */}
            {activeTab === 'income' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Income Records</h3>
                </div>

                {incomeLoading ? (
                  <div className="text-center py-8">Loading income records...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Source</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {incomeData?.incomes?.map((income: any) => (
                          <tr key={income.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{new Date(income.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm">{income.category}</td>
                            <td className="px-4 py-3 text-sm">{income.source}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">UGX {income.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">{income.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Expenditure Tab */}
            {activeTab === 'expenditure' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Expenditure Records</h3>
                </div>

                {expenditureLoading ? (
                  <div className="text-center py-8">Loading expenditure records...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Vendor</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {expenditureData?.expenditures?.map((expenditure: any) => (
                          <tr key={expenditure.id} className={`hover:bg-gray-50 ${isPayrollExpenditure(expenditure) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3 text-sm">{new Date(expenditure.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm">
                              {expenditure.category}
                              {isPayrollExpenditure(expenditure) && <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Payroll</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">{expenditure.vendor}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">UGX {expenditure.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">
                              {expenditure.description}
                              {isPayrollExpenditure(expenditure) && <span className="ml-2 text-xs text-blue-600">(Auto-generated)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}