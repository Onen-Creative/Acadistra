import api from './api';

export interface CreateAnnouncementRequest {
  title: string;
  message: string;
  target_roles: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  send_email: boolean;
  send_sms?: boolean;
  scheduled_for?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_roles: { roles: string[] };
  priority: string;
  status: string;
  total_sent: number;
  total_failed: number;
  created_at: string;
  sent_at?: string;
}

export const announcementService = {
  create: async (data: CreateAnnouncementRequest): Promise<Announcement> => {
    const response = await api.post('/announcements', data);
    return response.data;
  },

  send: async (id: string): Promise<{ message: string; total_sent: number; total_failed: number }> => {
    const response = await api.post(`/announcements/${id}/send`);
    return response.data;
  },

  list: async (): Promise<Announcement[]> => {
    const response = await api.get('/announcements');
    return response.data;
  },

  get: async (id: string): Promise<Announcement> => {
    const response = await api.get(`/announcements/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/announcements/${id}`);
  },
};
