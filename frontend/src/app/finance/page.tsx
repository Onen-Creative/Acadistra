'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

export default function FinancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'income' | 'expenditure'>('income')
  const [incomes, setIncomes] = useState<any[]>([])
  const [expenditures, setExpenditures] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [term, setTerm] = useState('1')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadData()
  }, [term, year])

  const loadData = async () => {
    try {
      const params = { term: `Term ${term}`, year }
      const [incomeRes, expRes, summaryRes] = await Promise.all([
        api.get('/api/v1/finance/income', { params }),
        api.get('/api/v1/finance/expenditure', { params }),
        api.get('/api/v1/finance/summary', { params })
      ])
      setIncomes(incomeRes.data.incomes || [])
      setExpenditures(expRes.data.expenditures || [])
      setSummary(summaryRes.data)
    } catch (error) {
      console.error('Load data error:', error)
      toast.error('Failed to load data')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    // Convert numeric fields
    const payload = {
      ...data,
      amount: parseFloat(data.amount as string),
      year: parseInt(data.year as string)
    }
    
    try {
      if (activeTab === 'income') {
        if (editingItem) {
          await api.put(`/finance/income/${editingItem.id}`, payload)
        } else {
          await api.post('/api/v1/finance/income', payload)
        }
      } else {
        if (editingItem) {
          await api.put(`/finance/expenditure/${editingItem.id}`, payload)
        } else {
          await api.post('/api/v1/finance/expenditure', payload)
        }
      }
      toast.success('Saved successfully')
      setShowModal(false)
      setEditingItem(null)
      loadData()
    } catch (error) {
      toast.error('Failed to save')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return
    try {
      if (activeTab === 'income') {
        await api.delete(`/finance/income/${id}`)
      } else {
        await api.delete(`/finance/expenditure/${id}`)
      }
      toast.success('Deleted')
      loadData()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finance Management</h1>
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            💡 Fees payments and inventory purchases are automatically recorded here
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Total Income</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.total_income)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">Total Expenditure</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.total_expenditure)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600">Net Balance</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.net_balance)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4">
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-2 border rounded-lg" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex">
              <button onClick={() => setActiveTab('income')} className={`px-6 py-3 text-sm font-medium ${activeTab === 'income' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Income</button>
              <button onClick={() => setActiveTab('expenditure')} className={`px-6 py-3 text-sm font-medium ${activeTab === 'expenditure' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Expenditure</button>
            </nav>
          </div>

          <div className="p-4">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">{activeTab === 'income' ? 'Income' : 'Expenditure'} Records</h2>
              <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{activeTab === 'income' ? 'Source' : 'Vendor'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(activeTab === 'income' ? incomes : expenditures).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No records found. {activeTab === 'income' ? 'Fees payments will appear here automatically.' : 'Inventory purchases will appear here automatically.'}
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'income' ? incomes : expenditures).map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">{item.category}</td>
                        <td className="px-4 py-3 text-sm">{item.source || item.vendor}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-3 text-sm text-right space-x-2">
                          <button onClick={() => router.push(`/finance/${activeTab}/${item.id}`)} className="text-blue-600 hover:underline">View</button>
                          <button onClick={() => { setEditingItem(item); setShowModal(true) }} className="text-green-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">{editingItem ? 'Edit' : 'Add'} {activeTab === 'income' ? 'Income' : 'Expenditure'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select name="category" defaultValue={editingItem?.category} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select</option>
                    {(activeTab === 'income' ? ['Fees', 'Donations', 'Grants', 'Other'] : ['Salaries', 'Utilities', 'Supplies', 'Other']).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{activeTab === 'income' ? 'Source' : 'Vendor'}</label>
                  <input type="text" name={activeTab === 'income' ? 'source' : 'vendor'} defaultValue={editingItem?.source || editingItem?.vendor} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input type="number" name="amount" defaultValue={editingItem?.amount} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" name="date" defaultValue={editingItem?.date?.split('T')[0] || new Date().toISOString().split('T')[0]} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Term</label>
                    <select name="term" defaultValue={editingItem?.term || `Term ${term}`} className="w-full px-3 py-2 border rounded-lg">
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <input type="number" name="year" defaultValue={editingItem?.year || year} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea name="description" defaultValue={editingItem?.description} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Save</button>
                  <button type="button" onClick={() => { setShowModal(false); setEditingItem(null) }} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
