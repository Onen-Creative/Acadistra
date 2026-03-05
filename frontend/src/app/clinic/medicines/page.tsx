'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { clinicApi } from '@/services/api';
import toast from 'react-hot-toast';

export default function MedicinesPage() {
  const { user } = useRequireAuth(['nurse', 'school_admin']);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [viewingMedicine, setViewingMedicine] = useState<any>(null);

  useEffect(() => {
    if (user) fetchMedicines();
  }, [user]);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await clinicApi.listMedicines({ limit: 1000 });
      setMedicines(response.medicines || []);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medicine?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await clinicApi.deleteMedicine(id);
      toast.success('Medicine deleted!', { id: loadingToast });
      fetchMedicines();
    } catch (error) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const lowStockCount = medicines.filter(m => m.quantity <= m.minimum_stock).length;
  const expiredCount = medicines.filter(m => new Date(m.expiry_date) < new Date()).length;
  const expiringSoonCount = medicines.filter(m => {
    const daysUntilExpiry = Math.floor((new Date(m.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">💊 Medicine Inventory</h1>
              <p className="text-purple-100">Manage clinic medicine stock</p>
            </div>
            <button
              onClick={() => { setEditingMedicine(null); setShowModal(true); }}
              className="bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg font-medium shadow-lg"
            >
              + Add Medicine
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-blue-100 text-sm font-medium">Total Medicines</p>
            <p className="text-4xl font-bold mt-2">{medicines.length}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-red-100 text-sm font-medium">Low Stock</p>
            <p className="text-4xl font-bold mt-2">{lowStockCount}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-orange-100 text-sm font-medium">Expired</p>
            <p className="text-4xl font-bold mt-2">{expiredCount}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-yellow-100 text-sm font-medium">Expiring Soon (30d)</p>
            <p className="text-4xl font-bold mt-2">{expiringSoonCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Strength</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {medicines.map((medicine: any) => (
                  <tr key={medicine.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{medicine.name}</p>
                        {medicine.generic_name && (
                          <p className="text-xs text-gray-500">{medicine.generic_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{medicine.category || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm">{medicine.strength || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${
                        medicine.quantity <= medicine.minimum_stock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {medicine.quantity} {medicine.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {(() => {
                        const expiryDate = new Date(medicine.expiry_date);
                        const today = new Date();
                        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (expiryDate < today) {
                          return <span className="text-red-600 font-bold">EXPIRED</span>;
                        } else if (daysUntilExpiry <= 30) {
                          return <span className="text-orange-600 font-semibold">{daysUntilExpiry}d left</span>;
                        } else {
                          return <span className="text-gray-600">{expiryDate.toLocaleDateString()}</span>;
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const expiryDate = new Date(medicine.expiry_date);
                        const today = new Date();
                        const isExpired = expiryDate < today;
                        const isLowStock = medicine.quantity <= medicine.minimum_stock;
                        
                        if (isExpired) {
                          return (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                              Expired
                            </span>
                          );
                        } else if (isLowStock) {
                          return (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                              Low Stock
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              In Stock
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => setViewingMedicine(medicine)}
                          className="bg-indigo-500 text-white px-2 py-1 rounded text-xs hover:bg-indigo-600"
                        >
                          View
                        </button>
                        <button
                          onClick={() => { setEditingMedicine(medicine); setShowModal(true); }}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(medicine.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <MedicineModal
            medicine={editingMedicine}
            onClose={() => { setShowModal(false); setEditingMedicine(null); }}
            onSuccess={() => { setShowModal(false); setEditingMedicine(null); fetchMedicines(); }}
          />
        )}

        {viewingMedicine && (
          <ViewMedicineModal
            medicine={viewingMedicine}
            onClose={() => setViewingMedicine(null)}
            onEdit={() => {
              setEditingMedicine(viewingMedicine);
              setViewingMedicine(null);
              setShowModal(true);
            }}
            onDelete={() => {
              handleDelete(viewingMedicine.id);
              setViewingMedicine(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function MedicineModal({ medicine, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: medicine?.name || '',
    generic_name: medicine?.generic_name || '',
    category: medicine?.category || '',
    dosage_form: medicine?.dosage_form || '',
    strength: medicine?.strength || '',
    unit: medicine?.unit || 'tablets',
    quantity: medicine?.quantity || 0,
    initial_quantity: medicine?.initial_quantity || 0,
    minimum_stock: medicine?.minimum_stock || 10,
    cost_per_unit: medicine?.cost_per_unit || 0,
    expiry_date: medicine?.expiry_date?.split('T')[0] || '',
    batch_number: medicine?.batch_number || '',
    supplier: medicine?.supplier || '',
    notes: medicine?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(medicine ? 'Updating...' : 'Adding...');
    try {
      const data = {
        ...formData,
        quantity: parseInt(formData.quantity.toString()),
        initial_quantity: parseInt(formData.initial_quantity.toString()),
        minimum_stock: parseInt(formData.minimum_stock.toString()),
        cost_per_unit: parseFloat(formData.cost_per_unit.toString()),
        expiry_date: formData.expiry_date ? `${formData.expiry_date}T00:00:00Z` : ''
      };
      if (medicine) {
        await clinicApi.updateMedicine(medicine.id, data);
        toast.success('Medicine updated!', { id: loadingToast });
      } else {
        await clinicApi.createMedicine(data);
        toast.success('Medicine added!', { id: loadingToast });
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed', { id: loadingToast });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{medicine ? 'Edit' : 'Add'} Medicine</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select category</option>
                <option value="Analgesics">Analgesics</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Antimalarials">Antimalarials</option>
                <option value="Antacids">Antacids</option>
                <option value="Vitamins">Vitamins</option>
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
                <option value="">Select form</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Cream">Cream</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Strength</label>
              <input
                value={formData.strength}
                onChange={(e) => setFormData({...formData, strength: e.target.value})}
                placeholder="e.g., 500mg"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit *</label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
                <option value="tubes">Tubes</option>
                <option value="sachets">Sachets</option>
                <option value="vials">Vials</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Initial Qty</label>
              <input
                type="number"
                value={formData.initial_quantity}
                onChange={(e) => setFormData({...formData, initial_quantity: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Qty *</label>
              <input
                required
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Stock</label>
              <input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cost Per Unit (UGX)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({...formData, cost_per_unit: parseFloat(e.target.value) || 0})}
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
              <label className="block text-sm font-medium mb-1">Expiry Date *</label>
              <input
                required
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
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
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
              {medicine ? 'Update' : 'Add'} Medicine
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewMedicineModal({ medicine, onClose, onEdit, onDelete }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 rounded-t-xl">
          <h3 className="text-2xl font-bold">💊 Medicine Details</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Name</p>
              <p className="text-sm font-semibold">{medicine.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Generic Name</p>
              <p className="text-sm font-semibold">{medicine.generic_name || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Category</p>
              <p className="text-sm font-semibold">{medicine.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Dosage Form</p>
              <p className="text-sm font-semibold">{medicine.dosage_form || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Strength</p>
              <p className="text-sm font-semibold">{medicine.strength || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Unit</p>
              <p className="text-sm font-semibold">{medicine.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Initial Quantity</p>
              <p className="text-sm font-semibold">{medicine.initial_quantity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Current Quantity</p>
              <p className={`text-sm font-semibold ${
                medicine.quantity <= medicine.minimum_stock ? 'text-red-600' : 'text-green-600'
              }`}>
                {medicine.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Minimum Stock</p>
              <p className="text-sm font-semibold">{medicine.minimum_stock}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Cost Per Unit</p>
              <p className="text-sm font-semibold">UGX {medicine.cost_per_unit?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Batch Number</p>
              <p className="text-sm font-semibold">{medicine.batch_number || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Expiry Date</p>
              <p className="text-sm font-semibold">{medicine.expiry_date ? new Date(medicine.expiry_date).toLocaleDateString() : '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Supplier</p>
            <p className="text-sm font-semibold">{medicine.supplier || '-'}</p>
          </div>
          {medicine.notes && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Notes</p>
              <p className="text-sm">{medicine.notes}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button onClick={onEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Edit
            </button>
            <button onClick={onDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
              Delete
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
