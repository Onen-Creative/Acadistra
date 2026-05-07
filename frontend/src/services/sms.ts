import api from './api';

export interface SMSProvider {
  id: string;
  school_id: string;
  provider: string;
  username: string;
  sender_id: string;
  is_active: boolean;
  balance: number;
}

export interface SMSTemplate {
  id: string;
  school_id?: string;
  name: string;
  category: string;
  template: string;
  variables: any;
  is_active: boolean;
}

export interface SMSQueue {
  id: string;
  school_id: string;
  recipient_id?: string;
  recipient_type: string;
  phone_number: string;
  message: string;
  category: string;
  priority: number;
  status: string;
  scheduled_for?: string;
  sent_at?: string;
  attempts: number;
  cost: number;
  error_message?: string;
  created_at: string;
}

export interface SMSBatch {
  id: string;
  school_id: string;
  name: string;
  category: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  total_cost: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SMSLog {
  id: string;
  school_id: string;
  recipient: string;
  message: string;
  status: string;
  sms_type: string;
  cost: number;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface SendSMSRequest {
  recipient_id?: string;
  recipient_type: string;
  phone_number: string;
  message: string;
  category: string;
  priority?: number;
  scheduled_for?: string;
}

export interface BulkSMSRequest {
  name: string;
  category: string;
  message?: string;
  template_id?: string;
  recipients: {
    recipient_id?: string;
    recipient_type: string;
    phone_number: string;
    variables?: Record<string, any>;
  }[];
  priority?: number;
}

export interface ConfigureProviderRequest {
  provider: string;
  api_key: string;
  api_secret?: string;
  username: string;
  sender_id?: string;
}

export interface CreateTemplateRequest {
  name: string;
  category: string;
  template: string;
  variables?: Record<string, any>;
}

export const smsService = {
  // Provider
  getProvider: async (): Promise<SMSProvider> => {
    const response = await api.get('/sms/provider');
    return response.data;
  },

  configureProvider: async (data: ConfigureProviderRequest): Promise<void> => {
    await api.post('/sms/provider', data);
  },

  // Templates
  getTemplates: async (): Promise<SMSTemplate[]> => {
    const response = await api.get('/sms/templates');
    return response.data;
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<SMSTemplate> => {
    const response = await api.post('/sms/templates', data);
    return response.data;
  },

  // Send SMS
  sendSMS: async (data: SendSMSRequest): Promise<void> => {
    await api.post('/sms/send', data);
  },

  sendBulkSMS: async (data: BulkSMSRequest): Promise<SMSBatch> => {
    const response = await api.post('/sms/bulk', data);
    return response.data;
  },

  // Queue & Logs
  getQueue: async (status?: string): Promise<SMSQueue[]> => {
    const response = await api.get('/sms/queue', { params: { status } });
    return response.data;
  },

  getBatches: async (): Promise<SMSBatch[]> => {
    const response = await api.get('/sms/batches');
    return response.data;
  },

  getLogs: async (): Promise<SMSLog[]> => {
    const response = await api.get('/sms/logs');
    return response.data;
  },

  // Stats
  getStats: async (): Promise<any> => {
    const response = await api.get('/sms/stats');
    return response.data;
  },
};
