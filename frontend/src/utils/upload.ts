import { api } from '@/services/api';

export interface UploadResponse {
  photo_url?: string;
  thumbnail_url?: string;
  original_size?: number;
  optimized_size?: number;
  saved_percent?: string;
  logo_url?: string;
}

/**
 * Upload student photo with proper authentication handling
 */
export async function uploadStudentPhoto(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('photo', file);

  try {
    // First try with the axios instance (which handles token refresh automatically)
    const response = await api.post('/upload/student-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    // If axios fails, try with fetch as fallback with query token
    if (error.response?.status === 401) {
      const token = localStorage.getItem('access_token');
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/v1/upload/student-photo?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
    }
    throw error;
  }
}

/**
 * Upload school logo with proper authentication handling
 */
export async function uploadSchoolLogo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('logo', file);

  try {
    // First try with the axios instance (which handles token refresh automatically)
    const response = await api.post('/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    // If axios fails, try with fetch as fallback with query token
    if (error.response?.status === 401) {
      const token = localStorage.getItem('access_token');
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/v1/upload/logo?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
    }
    throw error;
  }
}