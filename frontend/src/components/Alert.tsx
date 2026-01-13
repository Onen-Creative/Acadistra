interface AlertProps {
  type: 'allergy' | 'low_stock' | 'expiry' | 'chronic' | 'info';
  message: string;
  onClose?: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const styles = {
    allergy: 'bg-red-50 border-red-500 text-red-800',
    low_stock: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    expiry: 'bg-orange-50 border-orange-500 text-orange-800',
    chronic: 'bg-purple-50 border-purple-500 text-purple-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
  };

  const icons = {
    allergy: '⚠️',
    low_stock: '📦',
    expiry: '⏰',
    chronic: '💊',
    info: 'ℹ️',
  };

  return (
    <div className={`border-l-4 p-4 rounded ${styles[type]} flex items-start justify-between`}>
      <div className="flex items-start">
        <span className="text-2xl mr-3">{icons[type]}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
