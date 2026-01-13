interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function DashboardHeader({
  title,
  subtitle,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-30">
      <div className="px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={onMenuClick} className="lg:hidden text-gray-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-gray-600 truncate">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
