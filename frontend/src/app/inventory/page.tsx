'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { inventoryApi } from '@/services/api'
import ConfirmDialog from '@/components/ConfirmDialog'
import Toast from '@/components/Toast'
import * as XLSX from 'xlsx'

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: any }>({ type: '' })
  const [toast, setToast] = useState({ isOpen: false, title: '', message: '', type: 'success' as 'success' | 'error' | 'info' | 'warning' })

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ isOpen: true, title, message, type })
  }

  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventoryApi.listCategories(),
  })

  useEffect(() => {
    if (categoriesError) {
      console.error('Categories error:', categoriesError)
    }
    if (categories) {
      console.log('Categories loaded:', categories)
    }
  }, [categories, categoriesError])

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory-items', selectedCategory, search, showLowStock],
    queryFn: () => inventoryApi.listItems({ 
      category_id: selectedCategory, 
      search, 
      low_stock: showLowStock 
    }),
  })

  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: inventoryApi.getStats,
  })

  const createMutation = useMutation({
    mutationFn: inventoryApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      setShowAddItem(false)
      showToast('Success!', 'Inventory item created successfully', 'success')
    },
    onError: () => showToast('Error', 'Failed to create inventory item', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => inventoryApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      setShowEditItem(false)
      showToast('Updated!', 'Inventory item updated successfully', 'success')
    },
    onError: () => showToast('Error', 'Failed to update inventory item', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      showToast('Deleted!', 'Inventory item deleted successfully', 'success')
    },
    onError: () => showToast('Error', 'Failed to delete inventory item', 'error'),
  })

  const transactionMutation = useMutation({
    mutationFn: inventoryApi.recordTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      setShowTransaction(false)
      setShowConfirmDialog(false)
      showToast('Transaction Recorded!', 'Inventory transaction completed successfully', 'success')
    },
    onError: () => showToast('Error', 'Failed to record transaction', 'error'),
  })

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item)
    setConfirmAction({ type: 'delete', data: item.id })
    setShowConfirmDialog(true)
  }

  const handleConfirm = () => {
    if (confirmAction.type === 'delete') {
      deleteMutation.mutate(confirmAction.data)
    }
    setShowConfirmDialog(false)
  }

  const exportToExcel = () => {
    if (!items || items.length === 0) return
    
    const data = items.map((item: any, index: number) => ({
      '#': index + 1,
      'Item Number': item.item_number,
      'Item Name': item.name,
      'Category': item.category?.name || 'N/A',
      'Quantity Purchased': item.total_quantity_purchased || 0,
      'Quantity Remaining': item.quantity,
      'Unit': item.unit,
      'Unit Price': item.unit_price,
      'Total Purchased (UGX)': item.total_purchase_cost || 0,
      'Current Value (UGX)': item.quantity * item.unit_price,
      'Reorder Level': item.reorder_level,
      'Location': item.location || 'N/A',
      'Status': item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    XLSX.writeFile(wb, `inventory_${new Date().getTime()}.xlsx`)
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title="📦 School Inventory" 
          subtitle="Manage school inventory and track stock levels"
          action={
            <button onClick={exportToExcel} className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transition-all duration-300">
              📊 Export
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Items</p>
            <p className="text-3xl font-bold">{stats?.total_items || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Low Stock Items</p>
            <p className="text-3xl font-bold">{stats?.low_stock_items || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Value</p>
            <p className="text-3xl font-bold">UGX {(stats?.total_value || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="">All Categories</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2" />
            <label className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} />
              <span>Low Stock Only</span>
            </label>
            <button onClick={() => setShowAddItem(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-xl transition-all duration-300 font-semibold">
              ➕ Add Item
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading inventory...</p>
          </div>
        ) : items?.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Items Found</h3>
            <p className="text-gray-500">Add items to start managing your inventory</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Item #</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Purchased</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Remaining</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Unit Price</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total Cost</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Value</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{item.item_number}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-sm truncate max-w-[150px]">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{item.location || 'No location'}</p>
                      </td>
                      <td className="px-3 py-3 text-sm truncate max-w-[100px]">{item.category?.name || 'N/A'}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="text-sm font-semibold text-blue-600">{item.total_quantity_purchased || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="text-sm font-semibold">{item.quantity}</span>
                        <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm whitespace-nowrap">{item.unit_price.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center text-sm font-semibold text-blue-600 whitespace-nowrap">{(item.total_purchase_cost || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">{(item.quantity * item.unit_price).toLocaleString()}</td>
                      <td className="px-3 py-3 text-center">
                        {item.quantity <= item.reorder_level ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold whitespace-nowrap">Low</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">OK</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setSelectedItem(item); setShowTransaction(true); }} className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 whitespace-nowrap">
                            Trans
                          </button>
                          <button onClick={() => { setSelectedItem(item); setShowEditItem(true); }} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteClick(item)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showAddItem && <AddItemModal categories={categories} onClose={() => setShowAddItem(false)} onSubmit={createMutation.mutate} />}
        {showEditItem && <EditItemModal item={selectedItem} categories={categories} onClose={() => setShowEditItem(false)} onSubmit={(data: any) => updateMutation.mutate({ id: selectedItem.id, data })} />}
        {showTransaction && <TransactionModal item={selectedItem} onClose={() => setShowTransaction(false)} onSubmit={transactionMutation.mutate} />}
        
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleConfirm}
          title="Delete Item"
          message={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isLoading={deleteMutation.isPending}
        />
        
        <Toast
          isOpen={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
          title={toast.title}
          message={toast.message}
          type={toast.type}
        />
      </div>
    </DashboardLayout>
  )
}

function AddItemModal({ categories, onClose, onSubmit }: any) {
  const units = ['Pieces (pcs)', 'Kilograms (kg)', 'Grams (g)', 'Liters (L)', 'Milliliters (ml)', 'Meters (m)', 'Centimeters (cm)', 'Boxes', 'Packets', 'Bags', 'Bottles', 'Cans', 'Cartons', 'Dozens', 'Pairs', 'Sets', 'Rolls', 'Sheets', 'Bundles', 'Gallons', 'Tins', 'Sacks', 'Reams', 'Units']

  const [formData, setFormData] = useState({
    name: '', category_id: '', description: '', unit: '', quantity: 0, reorder_level: 0, unit_price: 0, location: '', supplier: '', barcode: '', expiry_date: '',
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Add New Inventory Item</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Item Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full border rounded-lg px-3 py-2" placeholder="e.g., White Sugar" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} required className="w-full border rounded-lg px-3 py-2">
                <option value="">Select category</option>
                {Array.isArray(categories) && categories.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Unit *</label>
              <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} required className="w-full border rounded-lg px-3 py-2">
                <option value="">Select unit</option>
                {units.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Initial Quantity</label>
              <input type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reorder Level</label>
              <input type="number" step="0.01" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Unit Price (UGX)</label>
              <input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Storage Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Supplier</label>
              <input type="text" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Barcode/SKU</label>
              <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expiry Date</label>
            <input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-lg hover:shadow-xl transition-all duration-300 font-medium">Create Item</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-400 font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditItemModal({ item, categories, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    name: item?.name || '', category_id: item?.category_id || '', description: item?.description || '', unit: item?.unit || '', reorder_level: item?.reorder_level || 0, unit_price: item?.unit_price || 0, location: item?.location || '',
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
        <h3 className="text-lg font-bold mb-4">Edit Item</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Item Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="">Select category</option>
                {Array.isArray(categories) && categories.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Unit</label>
              <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reorder Level</label>
              <input type="number" step="0.01" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Unit Price</label>
              <input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 rounded-lg hover:shadow-xl transition-all duration-300 font-semibold">Update Item</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TransactionModal({ item, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    item_id: item?.id || '', transaction_type: 'purchase', quantity: 0, unit_price: item?.unit_price || 0, reference_no: '', notes: '', supplier: '',
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Record Transaction</h3>
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold">{item?.name}</p>
          <p className="text-sm text-gray-600">Current Stock: {item?.quantity} {item?.unit}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Transaction Type</label>
            <select value={formData.transaction_type} onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })} className="w-full border rounded-lg px-3 py-2">
              <optgroup label="Stock In">
                <option value="purchase">Purchase</option>
                <option value="donation">Donation</option>
                <option value="return">Return</option>
              </optgroup>
              <optgroup label="Stock Out">
                <option value="issue">Issue</option>
                <option value="spoilage">Spoilage</option>
                <option value="loss">Loss</option>
                <option value="damage">Damage</option>
              </optgroup>
              <optgroup label="Other">
                <option value="adjustment">Adjustment</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Unit Price (UGX)</label>
            <input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          {formData.transaction_type === 'purchase' && (
            <div>
              <label className="block text-sm font-medium mb-2">Supplier</label>
              <input type="text" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Reference No</label>
            <input type="text" value={formData.reference_no} onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Notes/Reason</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg hover:shadow-xl transition-all duration-300 font-semibold">Record Transaction</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
