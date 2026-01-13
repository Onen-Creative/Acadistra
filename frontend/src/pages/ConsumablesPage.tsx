import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from '@/components/Sidebar';
import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';
import RecordUsageModal from '@/components/RecordUsageModal';

export default function ConsumablesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<any>(null);
  const [viewingConsumable, setViewingConsumable] = useState<any>(null);
  const [recordingUsage, setRecordingUsage] = useState<any>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: consumables } = useQuery({
    queryKey: ['consumables', lowStockOnly, term, year, page, search],
    queryFn: () => clinicApi.listConsumables({ page, limit: 20, year, term, search })
  });

  const createMutation = useMutation({
    mutationFn: clinicApi.createConsumable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumables'] });
      setShowForm(false);
      setEditingConsumable(null);
      toast.success('✅ Consumable added successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to add consumable: ${error.response?.data?.error || error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clinicApi.updateConsumable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumables'] });
      setShowForm(false);
      setEditingConsumable(null);
      toast.success('✅ Consumable updated successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to update consumable: ${error.response?.data?.error || error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clinicApi.deleteConsumable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumables'] });
      toast.success('🗑️ Consumable deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to delete consumable: ${error.response?.data?.error || error.message}`);
    }
  });

  const lowStockItems = consumables?.consumables?.filter((c: any) => c.quantity <= c.minimum_stock) || [];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="nurse" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold">🧰 Consumables Inventory</h1>
            </div>
            <div className="flex items-center gap-4">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="border rounded px-3 py-1">
                <option value="Term1">Term 1</option>
                <option value="Term2">Term 2</option>
                <option value="Term3">Term 3</option>
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded px-3 py-1">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
                ← Back
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {lowStockItems.length > 0 && (
            <div className="mb-6 space-y-3">
              {lowStockItems.slice(0, 5).map((item: any) => (
                <Alert
                  key={item.id}
                  type="low_stock"
                  message={`Low Stock: ${item.name} - Only ${item.quantity} ${item.unit} remaining (Min: ${item.minimum_stock})`}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search consumables..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 max-w-md border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              <span className="text-sm">Low Stock Only</span>
            </label>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Consumable
            </button>
          </div>

          {showForm && (
            <ConsumableForm
              consumable={editingConsumable}
              onClose={() => {
                setShowForm(false);
                setEditingConsumable(null);
              }}
              onSubmit={(data) => {
                if (editingConsumable) {
                  updateMutation.mutate({ id: editingConsumable.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
            />
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category/Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch/Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!consumables?.consumables || consumables.consumables.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        No consumables found. Click "Add Consumable" to get started.
                      </td>
                    </tr>
                  ) : (
                    consumables.consumables.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p>{item.category}</p>
                          <p className="text-xs text-gray-500">{item.item_type}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium">{item.initial_quantity || item.quantity} {item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={item.quantity <= item.minimum_stock ? 'text-red-600 font-bold' : 'font-medium'}>
                          {item.quantity} {item.unit}
                        </span>
                        <p className="text-xs text-gray-500">Min: {item.minimum_stock}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-orange-600 font-medium">
                          {(item.initial_quantity || item.quantity) - item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="text-xs">{item.batch_number || '-'}</p>
                          <p className="text-xs text-gray-500">{item.supplier || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.quantity <= item.minimum_stock ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Low Stock</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">In Stock</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRecordingUsage(item)}
                            className="text-green-600 hover:text-green-800 font-medium"
                            title="Record Usage"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => setViewingConsumable(item)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                            title="View Details"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setEditingConsumable(item);
                              setShowForm(true);
                            }}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this item?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 font-medium"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {consumables?.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(consumables.total / 20)}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>

      {viewingConsumable && (
        <ConsumableDetailsModal
          consumable={viewingConsumable}
          onClose={() => setViewingConsumable(null)}
        />
      )}

      {recordingUsage && (
        <RecordUsageModal
          consumable={recordingUsage}
          onClose={() => setRecordingUsage(null)}
        />
      )}
    </div>
  );
}

function ConsumableForm({ consumable, onClose, onSubmit }: { consumable?: any; onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: consumable?.name || '',
    category: consumable?.category || 'test_kit',
    item_type: consumable?.item_type || 'gloves',
    quantity: consumable?.quantity?.toString() || '',
    unit: consumable?.unit || 'pieces',
    expiry_date: consumable?.expiry_date ? new Date(consumable.expiry_date).toISOString().split('T')[0] : '',
    batch_number: consumable?.batch_number || '',
    supplier: consumable?.supplier || '',
    minimum_stock: consumable?.minimum_stock?.toString() || '10',
    term: consumable?.term || 'Term1',
    year: consumable?.year?.toString() || new Date().getFullYear().toString()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...formData,
      year: parseInt(formData.year),
      term: formData.term,
      quantity: parseInt(formData.quantity) || 0,
      minimum_stock: parseInt(formData.minimum_stock) || 10
    };
    if (formData.expiry_date) {
      payload.expiry_date = new Date(formData.expiry_date).toISOString();
    }
    onSubmit(payload);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">{consumable ? 'Edit Consumable' : 'Add New Consumable'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="test_kit">Test Kit</option>
              <option value="first_aid">First Aid</option>
              <option value="ppe">PPE</option>
              <option value="medical_supplies">Medical Supplies</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Item Type *</label>
            <select
              required
              value={formData.item_type}
              onChange={(e) => setFormData({...formData, item_type: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="gloves">Gloves</option>
              <option value="malaria_rdt">Malaria RDT</option>
              <option value="pregnancy_test">Pregnancy Test</option>
              <option value="syringes">Syringes</option>
              <option value="cotton_wool">Cotton Wool</option>
              <option value="bandages">Bandages</option>
              <option value="alcohol_swabs">Alcohol Swabs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity *</label>
            <input
              required
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit *</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="pieces">Pieces</option>
              <option value="boxes">Boxes</option>
              <option value="packs">Packs</option>
              <option value="rolls">Rolls</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expiry Date</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Supplier</label>
            <input
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Batch Number</label>
            <input
              value={formData.batch_number}
              onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Minimum Stock</label>
            <input
              type="number"
              value={formData.minimum_stock}
              onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            {consumable ? 'Update Consumable' : 'Add Consumable'}
          </button>
          <button type="button" onClick={onClose} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ConsumableDetailsModal({ consumable, onClose }: { consumable: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">🧰 Consumable Details</h2>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Item Name</label>
                <p className="text-lg font-bold text-gray-900">{consumable.name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Category</label>
                <p className="text-lg text-gray-900">{consumable.category}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Item Type</label>
                <p className="text-gray-900">{consumable.item_type}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Initial Quantity</label>
                <p className="text-lg font-bold text-blue-600">{consumable.initial_quantity || consumable.quantity} {consumable.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Remaining Quantity</label>
                <p className="text-lg font-bold text-green-600">{consumable.quantity} {consumable.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Quantity Used</label>
                <p className="text-lg font-bold text-orange-600">{(consumable.initial_quantity || consumable.quantity) - consumable.quantity} {consumable.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Minimum Stock</label>
                <p className="text-gray-900">{consumable.minimum_stock} {consumable.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <div>
                  {consumable.quantity <= consumable.minimum_stock ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">Low Stock</span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">In Stock</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Expiry Date</label>
                <p className="text-gray-900">{consumable.expiry_date ? new Date(consumable.expiry_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Batch Number</label>
                <p className="text-gray-900">{consumable.batch_number || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Supplier</label>
                <p className="text-gray-900">{consumable.supplier || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Term</label>
                <p className="text-gray-900">{consumable.term}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Year</label>
                <p className="text-gray-900">{consumable.year}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
