import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../Modal';

const medicineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  generic_name: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  dosage_form: z.string().optional(),
  strength: z.string().optional(),
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  batch_number: z.string().optional(),
  supplier: z.string().optional(),
  cost_per_unit: z.number().optional(),
  minimum_stock: z.number().min(1, 'Minimum stock required'),
  notes: z.string().optional(),
});

type MedicineFormData = z.infer<typeof medicineSchema>;

interface MedicineFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MedicineFormData) => Promise<void>;
  initialData?: Partial<MedicineFormData>;
  isEdit?: boolean;
}

const MedicineForm: React.FC<MedicineFormProps> = ({ isOpen, onClose, onSubmit, initialData, isEdit = false }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: initialData || { quantity: 0, minimum_stock: 10 },
  });

  const handleFormSubmit = async (data: MedicineFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Medicine' : 'Add New Medicine'} size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              {...register('name')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Generic Name</label>
            <input
              {...register('generic_name')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category *</label>
            <select
              {...register('category')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            >
              <option value="">Select Category</option>
              <option value="Analgesics">Analgesics</option>
              <option value="Antibiotics">Antibiotics</option>
              <option value="Antimalarials">Antimalarials</option>
              <option value="Vitamins">Vitamins</option>
              <option value="First Aid">First Aid</option>
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Dosage Form</label>
            <select
              {...register('dosage_form')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            >
              <option value="">Select Form</option>
              <option value="Tablet">Tablet</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
              <option value="Capsule">Capsule</option>
              <option value="Ointment">Ointment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Strength</label>
            <input
              {...register('strength')}
              placeholder="e.g., 500mg"
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity *</label>
            <input
              type="number"
              {...register('quantity', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Unit *</label>
            <input
              {...register('unit')}
              placeholder="e.g., tablets, bottles"
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
            {errors.unit && <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
            <input
              type="date"
              {...register('expiry_date')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
            {errors.expiry_date && <p className="mt-1 text-sm text-red-600">{errors.expiry_date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Batch Number</label>
            <input
              {...register('batch_number')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <input
              {...register('supplier')}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cost Per Unit</label>
            <input
              type="number"
              step="0.01"
              {...register('cost_per_unit', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Stock *</label>
            <input
              type="number"
              {...register('minimum_stock', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
            {errors.minimum_stock && <p className="mt-1 text-sm text-red-600">{errors.minimum_stock.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MedicineForm;
