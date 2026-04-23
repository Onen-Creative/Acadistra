export interface Announcement {
  id: string;
  school_id?: string;
  title: string;
  message: string;
  target_roles: { roles: string[] };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  send_email: boolean;
  send_sms: boolean;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduled_for?: string;
  sent_at?: string;
  created_by: string;
  total_sent: number;
  total_failed: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementDTO {
  title: string;
  message: string;
  target_roles: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  send_email: boolean;
  send_sms?: boolean;
  scheduled_for?: string;
}

export interface AnnouncementStats {
  total: number;
  sent: number;
  draft: number;
  failed: number;
}
