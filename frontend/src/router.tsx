import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';

const Login = lazy(() => import('@/pages/Login'));
const SystemAdminDashboard = lazy(() => import('@/pages/SystemAdminDashboard'));
const SchoolAdminDashboard = lazy(() => import('@/pages/SchoolAdminDashboard'));
const TeacherDashboard = lazy(() => import('@/pages/TeacherDashboard'));
const BursarDashboard = lazy(() => import('@/pages/BursarDashboard'));
const FeesReportsPage = lazy(() => import('@/pages/FeesReportsPage'));
const LibrarianDashboard = lazy(() => import('@/pages/LibrarianDashboard'));
const BooksPage = lazy(() => import('@/pages/BooksPage'));
const BookIssuesPage = lazy(() => import('@/pages/BookIssuesPage'));
const LibraryReportsPage = lazy(() => import('@/pages/LibraryReportsPage'));
const NurseDashboard = lazy(() => import('@/pages/NurseDashboard'));
const ClinicVisitsPage = lazy(() => import('@/pages/ClinicVisitsPage'));
const HealthProfilesPage = lazy(() => import('@/pages/HealthProfilesPage'));
const HealthProfileDetailPage = lazy(() => import('@/pages/HealthProfileDetailPage'));
const MedicalTestsPage = lazy(() => import('@/pages/MedicalTestsPage'));
const MedicinesPage = lazy(() => import('@/pages/MedicinesPage'));
const ConsumablesPage = lazy(() => import('@/pages/ConsumablesPage'));
const EmergencyIncidentsPage = lazy(() => import('@/pages/EmergencyIncidentsPage'));
const ClinicReportsPage = lazy(() => import('@/pages/ClinicReportsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const StudentDetails = lazy(() => import('@/pages/StudentDetails'));
const ClassView = lazy(() => import('@/pages/ClassView'));
const StudentRegistrationPage = lazy(() => import('@/pages/StudentRegistrationPage'));
const TeachersPage = lazy(() => import('@/pages/TeachersPage'));

// Loading component
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleBasedDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'system_admin') return <SystemAdminDashboard />;
  if (user.role === 'school_admin') return <SchoolAdminDashboard />;
  if (user.role === 'teacher') return <TeacherDashboard />;
  if (user.role === 'bursar') return <BursarDashboard />;
  if (user.role === 'librarian') return <LibrarianDashboard />;
  if (user.role === 'nurse') return <NurseDashboard />;
  return <Navigate to="/login" replace />;
}

// Root component that handles initial routing
function RootRedirect() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/fees',
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <BursarDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute>
            <FeesReportsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <RoleBasedDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/schools',
    element: (
      <ProtectedRoute>
        <SystemAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admins',
    element: (
      <ProtectedRoute>
        <SystemAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/students',
    element: (
      <ProtectedRoute>
        <RoleBasedDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/teachers',
    element: (
      <ProtectedRoute>
        <TeachersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <SchoolAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/classes/:id',
    element: (
      <ProtectedRoute>
        <ClassView />
      </ProtectedRoute>
    ),
  },
  {
    path: '/results',
    element: (
      <ProtectedRoute>
        <SchoolAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedRoute>
        <SchoolAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/library',
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <LibrarianDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'books',
        element: (
          <ProtectedRoute>
            <BooksPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'issues',
        element: (
          <ProtectedRoute>
            <BookIssuesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute>
            <LibraryReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/library" replace />,
      },
    ],
  },
  {
    path: '/clinic',
    element: (
      <ProtectedRoute>
        <NurseDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/view-marks',
    element: (
      <ProtectedRoute>
        <TeacherDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/enter-marks',
    element: (
      <ProtectedRoute>
        <TeacherDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/marks',
    element: (
      <ProtectedRoute>
        <TeacherDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/visits',
    element: (
      <ProtectedRoute>
        <ClinicVisitsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/health-profiles',
    element: (
      <ProtectedRoute>
        <HealthProfilesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/health-profiles/:id',
    element: (
      <ProtectedRoute>
        <HealthProfileDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/tests',
    element: (
      <ProtectedRoute>
        <MedicalTestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/medicines',
    element: (
      <ProtectedRoute>
        <MedicinesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/consumables',
    element: (
      <ProtectedRoute>
        <ConsumablesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/incidents',
    element: (
      <ProtectedRoute>
        <EmergencyIncidentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clinic/reports',
    element: (
      <ProtectedRoute>
        <ClinicReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/students/:id',
    element: (
      <ProtectedRoute>
        <StudentDetails />
      </ProtectedRoute>
    ),
  },
  {
    path: '/register-student',
    element: (
      <ProtectedRoute>
        <StudentRegistrationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
]);

export { Loading };