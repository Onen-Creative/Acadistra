import axios from 'axios';
import type { AuthResponse, LoginRequest, TokenPair } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post<TokenPair>(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.setItem('auth_error', JSON.stringify({
          message: error.response?.data?.message || 'Session expired',
          status: error.response?.status,
          url: error.config?.url,
          timestamp: new Date().toISOString()
        }));
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refresh_token: refreshToken });
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await api.post<TokenPair>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },
};

// Classes API
export const classesApi = {
  list: async (params?: { year?: number; term?: string }) => {
    const { data } = await api.get('/classes', { params });
    return data;
  },

  getLevels: async () => {
    const { data } = await api.get('/classes/levels');
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/classes/${id}`);
    return data;
  },

  create: async (classData: unknown) => {
    const { data } = await api.post('/classes', classData);
    return data;
  },
};

// Students API
export const studentsApi = {
  list: async (params?: { class_id?: string; class_level?: string; term?: string; year?: number; search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/students', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/students/${id}`);
    return data;
  },

  create: async (studentData: any) => {
    const { data } = await api.post('/students', studentData);
    return data;
  },

  update: async (id: string, studentData: any) => {
    const { data } = await api.put(`/students/${id}`, studentData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/students/${id}`);
    return data;
  },

  promoteOrDemote: async (id: string, newClassLevel: string, year: number, term: string) => {
    const { data } = await api.post(`/students/${id}/promote`, { new_class_level: newClassLevel, year, term });
    return data;
  },
};

// Marks API
export const marksApi = {
  batchUpdate: async (marks: unknown[]) => {
    const { data } = await api.post('/marks/batch', { marks });
    return data;
  },

  getByClass: async (classId: string, params: { term: string; year: number }) => {
    const { data } = await api.get(`/classes/${classId}/marks`, { params });
    return data;
  },

  getByStudent: async (studentId: string) => {
    const { data } = await api.get(`/students/${studentId}/marks`);
    return data;
  },

  update: async (id: string, markData: any) => {
    const { data } = await api.put(`/marks/${id}`, markData);
    return data;
  },
};

// Reports API
export const reportsApi = {
  generate: async (params: { student_id?: string; class_id?: string; term: string; year: number }) => {
    const { data } = await api.post('/reports/generate', params);
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/reports/${id}`);
    return data;
  },

  getByStudent: async (studentId: string) => {
    const { data } = await api.get(`/students/${studentId}/reports`);
    return data;
  },
};

// Users API
export const usersApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/users', { params });
    return data;
  },

  create: async (userData: any) => {
    const { data } = await api.post('/users', userData);
    return data;
  },

  update: async (id: string, userData: any) => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },

  // School admin user management
  listSchoolUsers: async () => {
    const { data } = await api.get('/school-users');
    return data;
  },

  createSchoolUser: async (userData: any) => {
    const { data } = await api.post('/school-users', userData);
    return data;
  },

  updateSchoolUser: async (id: string, userData: any) => {
    const { data } = await api.put(`/school-users/${id}`, userData);
    return data;
  },

  deleteSchoolUser: async (id: string) => {
    const { data } = await api.delete(`/school-users/${id}`);
    return data;
  },
};

// Schools API
export const schoolsApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/schools', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/schools/${id}`);
    return data;
  },

  getLevels: async () => {
    const { data } = await api.get('/school/levels');
    return data;
  },

  create: async (schoolData: any) => {
    const { data } = await api.post('/schools', schoolData);
    return data;
  },

  update: async (id: string, schoolData: any) => {
    const { data } = await api.put(`/schools/${id}`, schoolData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/schools/${id}`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/stats');
    return data;
  },

  // School admin dashboard summary
  getSummary: async (params?: { term?: string; year?: string }) => {
    const { data } = await api.get('/dashboard/summary', { params });
    return data;
  },
};

// Subjects API
export const subjectsApi = {
  list: async (params?: { level?: string }) => {
    const { data } = await api.get('/subjects', { params });
    return data;
  },

  create: async (subjectData: any) => {
    const { data } = await api.post('/subjects', subjectData);
    return data;
  },

  update: async (id: string, subjectData: any) => {
    const { data } = await api.put(`/subjects/${id}`, subjectData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/subjects/${id}`);
    return data;
  },
};

// Results API
export const resultsApi = {
  getByStudent: async (studentId: string, params?: { term?: string; year?: string }) => {
    const { data } = await api.get(`/students/${studentId}/results`, { params });
    return data;
  },

  createOrUpdate: async (resultData: any) => {
    const { data } = await api.post('/results', resultData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/results/${id}`);
    return data;
  },
};

// Audit Logs API
export const auditApi = {
  getRecentActivity: async (limit: number = 20) => {
    const { data } = await api.get('/audit/recent', { params: { limit } });
    return data;
  },
};

// Fees API
export const feesApi = {
  list: async (params?: { level?: string; term?: string; year?: number; search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/fees', { params });
    return data;
  },

  createOrUpdate: async (feesData: any) => {
    const { data } = await api.post('/fees', feesData);
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/fees/${id}`);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/fees/${id}`);
    return data;
  },

  recordPayment: async (paymentData: any) => {
    const { data } = await api.post('/fees/payment', paymentData);
    return data;
  },

  getReports: async (params: { type: string; term?: string; year?: string }) => {
    const { data } = await api.get('/fees/reports', { params });
    return data;
  },
};

// Teachers API
export const teachersApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/teachers', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/teachers/${id}`);
    return data;
  },

  create: async (teacherData: any) => {
    const { data } = await api.post('/teachers', teacherData);
    return data;
  },

  update: async (id: string, teacherData: any) => {
    const { data } = await api.put(`/teachers/${id}`, teacherData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/teachers/${id}`);
    return data;
  },
};

// Library API
export const libraryApi = {
  // Books
  listBooks: async (params?: { subject?: string; search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/library/books', { params });
    return data;
  },

  createBook: async (bookData: any) => {
    const { data } = await api.post('/library/books', bookData);
    return data;
  },

  updateBook: async (id: string, bookData: any) => {
    const { data } = await api.put(`/library/books/${id}`, bookData);
    return data;
  },

  deleteBook: async (id: string) => {
    const { data } = await api.delete(`/library/books/${id}`);
    return data;
  },

  getAvailableCopies: async (id: string) => {
    const { data } = await api.get(`/library/books/${id}/available-copies`);
    return data;
  },

  getCopyHistory: async (id: string) => {
    const { data } = await api.get(`/library/books/${id}/history`);
    return data;
  },

  searchByCopyNumber: async (copyNumber: string) => {
    const { data } = await api.get('/library/search-copy', { params: { copy_number: copyNumber } });
    return data;
  },

  bulkIssueBooks: async (issueData: any) => {
    const { data } = await api.post('/library/bulk-issue', issueData);
    return data;
  },

  // Issues
  listIssues: async (params?: { status?: string; student_id?: string; term?: string; year?: string; search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/library/issues', { params });
    return data;
  },

  issueBook: async (issueData: any) => {
    const { data } = await api.post('/library/issue', issueData);
    return data;
  },

  returnBook: async (id: string, returnData: any) => {
    const { data } = await api.put(`/library/return/${id}`, returnData);
    return data;
  },

  getStats: async (params?: { term?: string; year?: number }) => {
    const { data } = await api.get('/library/stats', { params });
    return data;
  },

  getStatsBySubject: async (params?: { term?: string; year?: number }) => {
    const { data } = await api.get('/library/stats/subjects', { params });
    return data;
  },

  getReports: async (params: { type: string; term?: string; year?: string }) => {
    const { data } = await api.get('/library/reports', { params });
    return data;
  },
};

// Clinic API
export const clinicApi = {
  // Visits (Nurse only)
  listVisits: async (params?: { student_id?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/clinic/visits', { params });
    return data;
  },

  createVisit: async (visitData: any) => {
    const { data } = await api.post('/clinic/visits', visitData);
    return data;
  },

  getVisit: async (id: string) => {
    const { data } = await api.get(`/clinic/visits/${id}`);
    return data;
  },

  updateVisit: async (id: string, visitData: any) => {
    const { data } = await api.put(`/clinic/visits/${id}`, visitData);
    return data;
  },
  deleteVisit: async (id: string) => {
    const { data } = await api.delete(`/clinic/visits/${id}`);
    return data;
  },


  // Health Profiles (Nurse only)
  createHealthProfile: async (profileData: any) => {
    const { data } = await api.post('/clinic/health-profiles', profileData);
    return data;
  },

  getHealthProfile: async (studentId: string) => {
    const { data } = await api.get(`/clinic/health-profiles/${studentId}`);
    return data;
  },
  getHealthProfileById: async (id: string) => {
    const { data } = await api.get(`/clinic/health-profiles/detail/${id}`);
    return data;
  },


  getStudentHealthData: async (studentId: string) => {
    const { data } = await api.get(`/clinic/students/${studentId}/health-data`);
    return data;
  },

  updateHealthProfile: async (id: string, profileData: any) => {
    const { data } = await api.put(`/clinic/health-profiles/${id}`, profileData);
    return data;
  },

  // Medical Tests (Nurse only)
  createTest: async (testData: any) => {
    const { data } = await api.post('/clinic/tests', testData);
    return data;
  },

  listTests: async (params?: { visit_id?: string; student_id?: string; test_type?: string }) => {
    const { data } = await api.get('/clinic/tests', { params });
    return data;
  },

  // Medicine Inventory (Nurse only)
  listMedicines: async (params?: { category?: string; low_stock?: boolean; search?: string; page?: number; limit?: number; year?: number; term?: string }) => {
    const { data } = await api.get('/clinic/medicines', { params });
    return data;
  },

  createMedicine: async (medicineData: any) => {
    const { data } = await api.post('/clinic/medicines', medicineData);
    return data;
  },

  updateMedicine: async (id: string, medicineData: any) => {
    const { data } = await api.put(`/clinic/medicines/${id}`, medicineData);
    return data;
  },

  deleteMedicine: async (id: string) => {
    const { data } = await api.delete(`/clinic/medicines/${id}`);
    return data;
  },

  // Medication Administration (Nurse only)
  administerMedication: async (adminData: any) => {
    const { data } = await api.post('/clinic/medication-admin', adminData);
    return data;
  },

  getMedicationHistory: async (params?: { student_id?: string; visit_id?: string }) => {
    const { data } = await api.get('/clinic/medication-history', { params });
    return data;
  },

  // Consumables (Nurse only)
  listConsumables: async (params?: { category?: string; low_stock?: boolean; search?: string; page?: number; limit?: number; year?: number; term?: string }) => {
    const { data } = await api.get('/clinic/consumables', { params });
    return data;
  },

  createConsumable: async (consumableData: any) => {
    const { data } = await api.post('/clinic/consumables', consumableData);
    return data;
  },

  updateConsumable: async (id: string, consumableData: any) => {
    const { data } = await api.put(`/clinic/consumables/${id}`, consumableData);
    return data;
  },

  deleteConsumable: async (id: string) => {
    const { data } = await api.delete(`/clinic/consumables/${id}`);
    return data;
  },

  // Consumable Usage
  recordConsumableUsage: async (usageData: any) => {
    const { data } = await api.post('/clinic/consumable-usage', usageData);
    return data;
  },

  getConsumableUsage: async (params?: { consumable_id?: string; visit_id?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/clinic/consumable-usage', { params });
    return data;
  },

  deleteHealthProfile: async (id: string) => {
    const { data } = await api.delete(`/clinic/health-profiles/${id}`);
    return data;
  },

  // Emergency Incidents (Nurse only)
  createIncident: async (incidentData: any) => {
    const { data } = await api.post('/clinic/incidents', incidentData);
    return data;
  },

  listIncidents: async (params?: { student_id?: string }) => {
    const { data } = await api.get('/clinic/incidents', { params });
    return data;
  },

  // Summary (Admin only - aggregated data)
  getSummary: async (params?: { term?: string; year?: number; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/clinic/summary', { params });
    return data;
  },

  getReports: async (params: { type: string; term?: string; year?: string }) => {
    const { data } = await api.get('/clinic/reports', { params });
    return data;
  },
};
