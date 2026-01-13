import { Link, useLocation, useNavigate } from 'react-router-dom';

interface MenuItem {
  path: string;
  icon: string;
  label: string;
}

interface SidebarProps {
  role: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems: Record<string, MenuItem[]> = {
    system_admin: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
      { path: '/schools', icon: '🏫', label: 'Schools' },
      { path: '/admins', icon: '👥', label: 'School Admins' },
    ],
    school_admin: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
      { path: '/students', icon: '👨🎓', label: 'Students' },
      { path: '/teachers', icon: '👩‍🏫', label: 'Teachers' },
      { path: '/users', icon: '👥', label: 'Users' },
      { path: '/results', icon: '📝', label: 'Results' },
      { path: '/reports', icon: '📄', label: 'Report Cards' },
    ],
    teacher: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
      { path: '/view-marks', icon: '👁️', label: 'View Marks' },
      { path: '/enter-marks', icon: '✍️', label: 'Enter Marks' },
    ],
    bursar: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
      { path: '/fees', icon: '💰', label: 'Fees Management' },
      { path: '/fees/reports', icon: '📄', label: 'Reports' },
    ],
    librarian: [
      { path: '/library', icon: '📊', label: 'Dashboard' },
      { path: '/library/books', icon: '📚', label: 'Books' },
      { path: '/library/issues', icon: '📖', label: 'Book Issues' },
      { path: '/library/reports', icon: '📄', label: 'Reports' },
    ],
    nurse: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
      { path: '/clinic/visits', icon: '🩺', label: 'Clinic Visits' },
      { path: '/clinic/health-profiles', icon: '📋', label: 'Health Profiles' },
      { path: '/clinic/medicines', icon: '💊', label: 'Medicines' },
      { path: '/clinic/consumables', icon: '🧰', label: 'Consumables' },
      { path: '/clinic/incidents', icon: '🚨', label: 'Incidents' },
      { path: '/clinic/reports', icon: '📄', label: 'Reports' },
    ],
  };

  const items = menuItems[role] || [];

  const roleColors: Record<string, string> = {
    system_admin: 'from-slate-800 to-slate-900',
    school_admin: 'from-blue-800 to-blue-900',
    teacher: 'from-green-800 to-green-900',
    bursar: 'from-amber-800 to-amber-900',
    librarian: 'from-indigo-800 to-indigo-900',
    nurse: 'from-teal-800 to-teal-900',
  };

  const roleLabels: Record<string, string> = {
    system_admin: 'System Admin',
    school_admin: 'School Admin',
    teacher: 'Teacher',
    bursar: 'Bursar',
    librarian: 'Librarian',
    nurse: 'Clinic Nurse',
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    onClose();
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-gradient-to-b ${roleColors[role] || 'from-gray-800 to-gray-900'} text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">🏫 School System</h2>
                <p className="text-xs text-white/60 mt-0.5 truncate">{roleLabels[role]}</p>
              </div>
              <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white ml-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="px-5 py-3 bg-black/20 border-b border-white/10">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {user.full_name?.charAt(0) || '?'}
              </div>
              <div className="ml-2.5 flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-white/50 truncate">{user.email || ''}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            {items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center px-5 py-3 mx-2 my-1 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
            <div className="text-xs text-white/30 mt-2.5 text-center">
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
