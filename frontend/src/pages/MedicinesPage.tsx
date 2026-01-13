import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from '@/components/Sidebar';
import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';

export default function MedicinesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [viewingMedicine, setViewingMedicine] = useState<any>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: medicines } = useQuery({
    queryKey: ['medicines', lowStockOnly, term, year, page, search],
    queryFn: () => clinicApi.listMedicines({ page, limit: 20, year, term, search })
  });

  const createMutation = useMutation({
    mutationFn: clinicApi.createMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowForm(false);
      setEditingMedicine(null);
      toast.success('✅ Medicine added successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to add medicine: ${error.response?.data?.error || error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clinicApi.updateMedicine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowForm(false);
      setEditingMedicine(null);
      toast.success('✅ Medicine updated successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to update medicine: ${error.response?.data?.error || error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clinicApi.deleteMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      toast.success('🗑️ Medicine deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to delete medicine: ${error.response?.data?.error || error.message}`);
    }
  });

  const lowStockItems = medicines?.medicines?.filter((m: any) => m.quantity <= m.minimum_stock) || [];
  const expiringItems = medicines?.medicines?.filter((m: any) => {
    const daysUntilExpiry = Math.floor((new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }) || [];

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
              <h1 className="text-xl font-bold">💊 Medicine Inventory</h1>
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
          {/* Alerts */}
          {(lowStockItems.length > 0 || expiringItems.length > 0) && (
            <div className="mb-6 space-y-3">
              {lowStockItems.slice(0, 3).map((med: any) => (
                <Alert
                  key={med.id}
                  type="low_stock"
                  message={`Low Stock: ${med.name} - Only ${med.quantity} ${med.unit} remaining (Min: ${med.minimum_stock})`}
                />
              ))}
              {expiringItems.slice(0, 3).map((med: any) => (
                <Alert
                  key={med.id}
                  type="expiry"
                  message={`Expiring Soon: ${med.name} - Expires on ${new Date(med.expiry_date).toLocaleDateString()}`}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search medicines..."
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
              + Add Medicine
            </button>
          </div>

          {showForm && (
            <MedicineForm
              medicine={editingMedicine}
              onClose={() => {
                setShowForm(false);
                setEditingMedicine(null);
              }}
              onSubmit={(data) => {
                if (editingMedicine) {
                  updateMutation.mutate({ id: editingMedicine.id, data });
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosage/Strength</th>
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
                  {!medicines?.medicines || medicines.medicines.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                        No medicines found. Click "Add Medicine" to get started.
                      </td>
                    </tr>
                  ) : (
                    medicines.medicines.map((med: any) => {
                      const daysUntilExpiry = Math.floor((new Date(med.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isExpiring = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                      const isExpired = daysUntilExpiry <= 0;

                      return (
                        <tr key={med.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{med.name}</p>
                            <p className="text-xs text-gray-500">{med.generic_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{med.category}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p>{med.dosage_form}</p>
                            <p className="text-xs text-gray-500">{med.strength}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium">{med.initial_quantity || med.quantity} {med.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={med.quantity <= med.minimum_stock ? 'text-red-600 font-bold' : 'font-medium'}>
                            {med.quantity} {med.unit}
                          </span>
                          <p className="text-xs text-gray-500">Min: {med.minimum_stock}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-orange-600 font-medium">
                            {(med.initial_quantity || med.quantity) - med.quantity} {med.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="text-xs">{med.batch_number || '-'}</p>
                            <p className="text-xs text-gray-500">{med.supplier || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={isExpired ? 'text-red-600' : isExpiring ? 'text-orange-600' : ''}>
                            {new Date(med.expiry_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isExpired ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Expired</span>
                          ) : isExpiring ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">Expiring Soon</span>
                          ) : med.quantity <= med.minimum_stock ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Low Stock</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">In Stock</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewingMedicine(med)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                              title="View Details"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                setEditingMedicine(med);
                                setShowForm(true);
                              }}
                              className="text-green-600 hover:text-green-800 font-medium"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this medicine?')) {
                                  deleteMutation.mutate(med.id);
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {medicines?.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(medicines.total / 20)}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>

      {viewingMedicine && (
        <MedicineDetailsModal
          medicine={viewingMedicine}
          onClose={() => setViewingMedicine(null)}
        />
      )}
    </div>
  );
}

function MedicineForm({ medicine, onClose, onSubmit }: { medicine?: any; onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: medicine?.name || '',
    generic_name: medicine?.generic_name || '',
    category: medicine?.category || 'Analgesics',
    dosage_form: medicine?.dosage_form || 'tablet',
    strength: medicine?.strength || '',
    quantity: medicine?.quantity?.toString() || '',
    unit: medicine?.unit || 'tablets',
    expiry_date: medicine?.expiry_date ? new Date(medicine.expiry_date).toISOString().split('T')[0] : '',
    batch_number: medicine?.batch_number || '',
    supplier: medicine?.supplier || '',
    minimum_stock: medicine?.minimum_stock?.toString() || '10',
    term: medicine?.term || 'Term1',
    year: medicine?.year?.toString() || new Date().getFullYear().toString()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      year: parseInt(formData.year),
      term: formData.term,
      quantity: parseInt(formData.quantity) || 0,
      minimum_stock: parseInt(formData.minimum_stock) || 10,
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">{medicine ? 'Edit Medicine' : 'Add New Medicine'}</h3>
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
            <label className="block text-sm font-medium mb-1">Generic Name</label>
            <input
              value={formData.generic_name}
              onChange={(e) => setFormData({...formData, generic_name: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="Analgesics">Analgesics</option>
              <option value="Antibiotics">Antibiotics</option>
              <option value="Antimalarials">Antimalarials</option>
              <option value="Antihistamines">Antihistamines</option>
              <option value="Antacids">Antacids</option>
              <option value="Vitamins">Vitamins & Supplements</option>
              <option value="First Aid">First Aid</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dosage Form</label>
            <select
              value={formData.dosage_form}
              onChange={(e) => setFormData({...formData, dosage_form: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="tablet">Tablet</option>
              <option value="syrup">Syrup</option>
              <option value="injection">Injection</option>
              <option value="capsule">Capsule</option>
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
              <option value="tablets">Tablets</option>
              <option value="bottles">Bottles</option>
              <option value="boxes">Boxes</option>
              <option value="ml">ML</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Strength</label>
            <input
              value={formData.strength}
              onChange={(e) => setFormData({...formData, strength: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., 500mg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expiry Date *</label>
            <input
              required
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
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
            <label className="block text-sm font-medium mb-1">Supplier</label>
            <input
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
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
            {medicine ? 'Update Medicine' : 'Add Medicine'}
          </button>
          <button type="button" onClick={onClose} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function MedicineDetailsModal({ medicine, onClose }: { medicine: any; onClose: () => void }) {
  const daysUntilExpiry = Math.floor((new Date(medicine.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiring = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">💊 Medicine Details</h2>
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
                <label className="text-sm font-semibold text-gray-600">Medicine Name</label>
                <p className="text-lg font-bold text-gray-900">{medicine.name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Generic Name</label>
                <p className="text-lg text-gray-900">{medicine.generic_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Category</label>
                <p className="text-gray-900">{medicine.category}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Dosage Form</label>
                <p className="text-gray-900">{medicine.dosage_form}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Strength</label>
                <p className="text-gray-900">{medicine.strength || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Initial Quantity</label>
                <p className="text-lg font-bold text-blue-600">{medicine.initial_quantity || medicine.quantity} {medicine.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Remaining Quantity</label>
                <p className="text-lg font-bold text-green-600">{medicine.quantity} {medicine.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Quantity Used</label>
                <p className="text-lg font-bold text-orange-600">{(medicine.initial_quantity || medicine.quantity) - medicine.quantity} {medicine.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Minimum Stock</label>
                <p className="text-gray-900">{medicine.minimum_stock} {medicine.unit}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <div>
                  {isExpired ? (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">Expired</span>
                  ) : isExpiring ? (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">Expiring Soon</span>
                  ) : medicine.quantity <= medicine.minimum_stock ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">Low Stock</span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">In Stock</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Expiry Date</label>
                <p className={`text-gray-900 ${isExpired ? 'text-red-600 font-bold' : isExpiring ? 'text-orange-600 font-semibold' : ''}`}>
                  {new Date(medicine.expiry_date).toLocaleDateString()}
                  {isExpiring && !isExpired && ` (${daysUntilExpiry} days left)`}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Batch Number</label>
                <p className="text-gray-900">{medicine.batch_number || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Supplier</label>
                <p className="text-gray-900">{medicine.supplier || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Term</label>
                <p className="text-gray-900">{medicine.term}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Year</label>
                <p className="text-gray-900">{medicine.year}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
