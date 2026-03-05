// Reusable Beautiful UI Components

export const GradientCard = ({ children, gradient = "from-blue-500 to-purple-600", className = "" }: any) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-lg text-white ${className}`}>
    {children}
  </div>
)

export const StatCard = ({ title, value, icon, gradient, trend, onClick }: any) => (
  <div onClick={onClick} className={`cursor-pointer group relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${gradient}`}>
    <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
      <div className="text-8xl">{icon}</div>
    </div>
    <div className="relative z-10">
      <p className="text-white/80 text-sm font-medium mb-2">{title}</p>
      <p className="text-white text-4xl font-bold mb-1">{value || 0}</p>
      {trend && <p className="text-white/70 text-xs">{trend}</p>}
    </div>
  </div>
)

export const PageHeader = ({ title, subtitle, description, action, icon }: any) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 md:p-8 shadow-2xl mb-6 md:mb-8">
    <div className="absolute inset-0 bg-black/10"></div>
    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        {icon && <span className="text-4xl md:text-5xl">{icon}</span>}
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">{title}</h1>
          <p className="text-blue-100 text-sm md:text-lg">{subtitle || description}</p>
        </div>
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  </div>
)

export const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0"></div>
    </div>
  </div>
)
