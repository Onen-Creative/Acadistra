'use client'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'success' | 'warning' | 'danger' | 'info'
  isLoading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const colors = {
    success: 'from-green-500 to-emerald-600',
    warning: 'from-yellow-500 to-orange-600',
    danger: 'from-red-500 to-rose-600',
    info: 'from-blue-500 to-indigo-600',
  }

  const icons = {
    success: '✓',
    warning: '⚠️',
    danger: '🗑️',
    info: 'ℹ️',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        <div className={`bg-gradient-to-r ${colors[type]} p-6 rounded-t-2xl`}>
          <div className="flex items-center gap-3 text-white">
            <div className="text-3xl">{icons[type]}</div>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 bg-gradient-to-r ${colors[type]} text-white py-3 rounded-xl hover:shadow-xl transition-all duration-300 font-semibold disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold disabled:opacity-50"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
