import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicApi } from '@/services/api';
import { toast } from 'react-toastify';

interface RecordUsageModalProps {
  consumable: any;
  onClose: () => void;
}

export default function RecordUsageModal({ consumable, onClose }: RecordUsageModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    quantity_used: '',
    purpose: '',
  });

  const recordUsageMutation = useMutation({
    mutationFn: clinicApi.recordConsumableUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumables'] });
      queryClient.invalidateQueries({ queryKey: ['consumable-usage'] });
      toast.success('✅ Usage recorded successfully!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.error || 'Failed to record usage'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityUsed = parseInt(formData.quantity_used);
    
    if (quantityUsed > consumable.quantity) {
      toast.error('❌ Quantity exceeds available stock!');
      return;
    }

    recordUsageMutation.mutate({
      consumable_id: consumable.id,
      quantity_used: quantityUsed,
      purpose: formData.purpose,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">📝 Record Usage</h2>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">{consumable.name}</p>
              <p className="text-xs text-gray-600">Available: {consumable.quantity} {consumable.unit}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity Used *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={consumable.quantity}
                  value={formData.quantity_used}
                  onChange={(e) => setFormData({...formData, quantity_used: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purpose *</label>
                <textarea
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="e.g., Malaria test for student, Wound dressing, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                disabled={recordUsageMutation.isPending}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {recordUsageMutation.isPending ? 'Recording...' : 'Record Usage'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
