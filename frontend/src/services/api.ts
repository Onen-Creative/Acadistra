import axios from 'axios';
import type { AuthResponse, LoginRequest, TokenPair } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and /api/v1 prefix
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Automatically prepend /api/v1 to relative URLs that don't already have it
    if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api/v1')) {
      config.url = `/api/v1${config.url}`;
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

        const { data } = await axios.post<TokenPair>(`/auth/refresh`, {
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

  get: async (id: string) => {
    const { data } = await api.get(`/classes/${id}`);
    return data;
  },

  create: async (classData: unknown) => {
    const { data } = await api.post('/classes', classData);
    return data;
  },

  update: async (id: string, classData: unknown) => {
    const { data } = await api.put(`/classes/${id}`, classData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/classes/${id}`);
    return data;
  },

  getTeachers: async () => {
    const { data } = await api.get('/staff', { params: { role: 'Teacher' } });
    return Array.isArray(data) ? data : data.staff || [];
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

  getMySchool: async () => {
    const { data } = await api.get('/school');
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

  toggleActive: async (id: string, isActive: boolean) => {
    const { data } = await api.patch(`/schools/${id}/toggle-active`, { is_active: isActive });
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

  getSchoolSubjects: async () => {
    const { data } = await api.get('/subjects/school');
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
  getByStudent: async (studentId: string, params?: { term?: string; year?: string; exam_type?: string }) => {
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

// Staff API
export const staffApi = {
  list: async (params?: { search?: string; role?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/staff', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/staff/${id}`);
    return data;
  },

  create: async (staffData: any) => {
    const { data } = await api.post('/staff', staffData);
    return data;
  },

  update: async (id: string, staffData: any) => {
    const { data } = await api.put(`/staff/${id}`, staffData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/staff/${id}`);
    return data;
  },
};

// Teachers API (alias for backward compatibility)
export const teachersApi = staffApi;

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

  getReportData: async (params: { type: string; term?: string; year?: string }) => {
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

  getIncident: async (id: string) => {
    const { data } = await api.get(`/clinic/incidents/${id}`);
    return data;
  },

  updateIncident: async (id: string, incidentData: any) => {
    const { data } = await api.put(`/clinic/incidents/${id}`, incidentData);
    return data;
  },

  deleteIncident: async (id: string) => {
    const { data } = await api.delete(`/clinic/incidents/${id}`);
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

// Attendance API
export const attendanceApi = {
  mark: async (attendanceData: any) => {
    const { data } = await api.post('/attendance', attendanceData);
    return data;
  },

  bulkMark: async (bulkData: any) => {
    const { data } = await api.post('/attendance/bulk', bulkData);
    return data;
  },

  list: async (params?: { class_id?: string; student_id?: string; date?: string; start_date?: string; end_date?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/attendance', { params });
    return data;
  },

  getByDate: async (params: { class_id: string; date: string }) => {
    const { data } = await api.get('/attendance/by-date', { params });
    return data;
  },

  getStats: async (params?: { class_id?: string; student_id?: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/attendance/stats', { params });
    return data;
  },

  getClassSummary: async (params: { class_id: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/attendance/class-summary', { params });
    return data;
  },

  getReport: async (params: { class_id: string; period: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/attendance/report', { params });
    return data;
  },

  getStudentHistory: async (studentId: string, params?: { period?: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get(`/attendance/student/${studentId}/history`, { params });
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/attendance/${id}`);
    return data;
  },

  getHolidays: async (params?: { year?: number; term?: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/calendar/holidays', { params });
    return data;
  },
};

// Calendar API (Holidays and non-school days)
export const calendarApi = {
  addHoliday: async (holidayData: any) => {
    const { data } = await api.post('/calendar/holidays', holidayData);
    return data;
  },

  listHolidays: async (params?: { year?: number; term?: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/calendar/holidays', { params });
    return data;
  },

  deleteHoliday: async (id: string) => {
    const { data } = await api.delete(`/calendar/holidays/${id}`);
    return data;
  },
};

// Term Dates API
export const termDatesApi = {
  list: async (params?: { year?: number }) => {
    const { data } = await api.get('/term-dates', { params });
    return data;
  },

  getCurrent: async (params?: { year?: number; term?: string }) => {
    const { data } = await api.get('/term-dates/current', { params });
    return data;
  },

  createOrUpdate: async (termData: any) => {
    const { data } = await api.post('/term-dates', termData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/term-dates/${id}`);
    return data;
  },
};

// Finance API
export const financeApi = {
  // Income
  createIncome: async (incomeData: any) => {
    const { data } = await api.post('/finance/income', incomeData);
    return data;
  },

  listIncome: async (params?: { term?: string; year?: number; category?: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/finance/income', { params });
    return data;
  },

  getIncome: async (id: string) => {
    const { data } = await api.get(`/finance/income/${id}`);
    return data;
  },

  updateIncome: async (id: string, incomeData: any) => {
    const { data } = await api.put(`/finance/income/${id}`, incomeData);
    return data;
  },

  deleteIncome: async (id: string) => {
    const { data } = await api.delete(`/finance/income/${id}`);
    return data;
  },

  // Expenditure
  createExpenditure: async (expenditureData: any) => {
    const { data } = await api.post('/finance/expenditure', expenditureData);
    return data;
  },

  listExpenditure: async (params?: { term?: string; year?: number; category?: string; status?: string; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/finance/expenditure', { params });
    return data;
  },

  getExpenditure: async (id: string) => {
    const { data } = await api.get(`/finance/expenditure/${id}`);
    return data;
  },

  updateExpenditure: async (id: string, expenditureData: any) => {
    const { data } = await api.put(`/finance/expenditure/${id}`, expenditureData);
    return data;
  },

  deleteExpenditure: async (id: string) => {
    const { data } = await api.delete(`/finance/expenditure/${id}`);
    return data;
  },

  // Summary
  getSummary: async (params?: { term?: string; year?: number; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/finance/summary', { params });
    return data;
  },

  // Export
  exportReport: async (params: { period: 'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly'; term?: string; year?: number }) => {
    const { data } = await api.get('/finance/export', { params, responseType: 'blob' });
    return data;
  },
  
  exportFeesReport: async (params: { period: 'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly'; term?: string; year?: number }) => {
    const { data } = await api.get('/fees/export', { params, responseType: 'blob' });
    return data;
  },
};

// Inventory API
export const inventoryApi = {
  listCategories: async () => {
    const { data } = await api.get('/api/v1/inventory/categories');
    return Array.isArray(data) ? data : (data?.categories || []);
  },

  listItems: async (params?: { category_id?: string; search?: string; low_stock?: boolean }) => {
    const { data } = await api.get('/api/v1/inventory/items', { params });
    return data;
  },

  createItem: async (itemData: any) => {
    const { data } = await api.post('/api/v1/inventory/items', itemData);
    return data;
  },

  updateItem: async (id: string, itemData: any) => {
    const { data } = await api.put(`/inventory/items/${id}`, itemData);
    return data;
  },

  deleteItem: async (id: string) => {
    const { data } = await api.delete(`/inventory/items/${id}`);
    return data;
  },

  recordTransaction: async (transactionData: any) => {
    const { data } = await api.post('/api/v1/inventory/transactions', transactionData);
    return data;
  },

  listTransactions: async (params?: { item_id?: string; type?: string }) => {
    const { data } = await api.get('/api/v1/inventory/transactions', { params });
    return data;
  },

  getPurchaseReceipt: async (transactionId: string) => {
    const { data } = await api.get(`/inventory/transactions/${transactionId}/receipt`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/api/v1/inventory/stats');
    return data;
  },
};

// Integration Activities API (S1-S4)
export const integrationActivitiesApi = {
  getByClass: async (params: { class_id: string; subject_id?: string; term: string; year: number }) => {
    const { data } = await api.get('/integration-activities', { params });
    return data;
  },

  createOrUpdate: async (activityData: any) => {
    const { data } = await api.post('/integration-activities', activityData);
    return data;
  },
};

// Payroll API
export const payrollApi = {
  // Salary Structures
  listSalaryStructures: async () => {
    const { data } = await api.get('/payroll/salary-structures');
    return data;
  },

  getSalaryStructure: async (userId: string) => {
    const { data } = await api.get(`/payroll/salary-structures/user/${userId}`);
    return data;
  },

  createSalaryStructure: async (salaryData: any) => {
    const { data } = await api.post('/payroll/salary-structures', salaryData);
    return data;
  },

  updateSalaryStructure: async (id: string, salaryData: any) => {
    const { data } = await api.put(`/payroll/salary-structures/${id}`, salaryData);
    return data;
  },

  deleteSalaryStructure: async (id: string) => {
    const { data } = await api.delete(`/payroll/salary-structures/${id}`);
    return data;
  },

  // Payroll Processing
  processPayroll: async (payrollData: { month: number; year: number }) => {
    const { data } = await api.post('/payroll/process', payrollData);
    return data;
  },

  listPayrollRuns: async () => {
    const { data } = await api.get('/payroll/runs');
    return data;
  },

  getPayrollRun: async (id: string) => {
    const { data } = await api.get(`/payroll/runs/${id}`);
    return data;
  },

  markPaymentPaid: async (paymentId: string, paymentData: { method: string; ref?: string }) => {
    const { data } = await api.post(`/payroll/payments/${paymentId}/mark-paid`, paymentData);
    return data;
  },

  getPayslip: async (paymentId: string) => {
    const { data } = await api.get(`/payroll/payslip/${paymentId}`);
    return data;
  },

  getSummary: async (year: number) => {
    const { data } = await api.get(`/payroll/summary/${year}`);
    return data;
  },
};

// Budget API
export const budgetApi = {
  list: async (params?: { year?: number; term?: string; status?: string }) => {
    const { data } = await api.get('/budgets', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/budgets/${id}`);
    return data;
  },

  create: async (budgetData: any) => {
    const { data } = await api.post('/budgets', budgetData);
    return data;
  },

  update: async (id: string, budgetData: any) => {
    const { data } = await api.put(`/budgets/${id}`, budgetData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/budgets/${id}`);
    return data;
  },

  getSummary: async (params?: { year?: number; term?: string }) => {
    const { data } = await api.get('/budgets/summary', { params });
    return data;
  },
};

// Requisitions API
export const requisitionsApi = {
  list: async (params?: { status?: string; department?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/requisitions', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/requisitions/${id}`);
    return data;
  },

  create: async (requisitionData: any) => {
    const { data } = await api.post('/requisitions', requisitionData);
    return data;
  },

  update: async (id: string, requisitionData: any) => {
    const { data } = await api.put(`/requisitions/${id}`, requisitionData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/requisitions/${id}`);
    return data;
  },

  approve: async (id: string, approvalData: { notes?: string }) => {
    const { data } = await api.post(`/requisitions/${id}/approve`, approvalData);
    return data;
  },

  reject: async (id: string, rejectionData: { reason: string }) => {
    const { data } = await api.post(`/requisitions/${id}/reject`, rejectionData);
    return data;
  },

  markPaid: async (id: string, paymentData: { payment_method: string; payment_reference?: string }) => {
    const { data } = await api.post(`/requisitions/${id}/mark-paid`, paymentData);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/requisitions/stats');
    return data;
  },
};

// Notifications API
export const notificationsApi = {
  list: async (params?: { page?: number; limit?: number; unread_only?: boolean }) => {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.put('/notifications/mark-all-read');
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/notifications/${id}`);
    return data;
  },

  getPreferences: async () => {
    const { data } = await api.get('/notifications/preferences');
    return data;
  },

  updatePreferences: async (preferences: any) => {
    const { data } = await api.put('/notifications/preferences', preferences);
    return data;
  },
};

export default api;