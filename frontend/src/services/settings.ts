import api from './api'

export interface SystemSettings {
  system_name: string
  support_email: string
  default_country: string
  two_factor_enabled: boolean
  session_timeout: number
  smtp_host: string
  smtp_port: number
  smtp_username: string
  auto_backup: boolean
  backup_time: string
}

export const settingsService = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await api.get('/settings')
    return response.data
  },

  updateSettings: async (settings: SystemSettings): Promise<void> => {
    await api.put('/settings', settings)
  },

  runBackup: async (): Promise<void> => {
    // This would trigger a backup endpoint if implemented
    await api.post('/backup/run')
  }
}
