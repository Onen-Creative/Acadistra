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

  // Get the correct API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com';
  
  try {
    // First try with the axios instance (which handles token refresh automatically)
    const response = await api.post('/upload/student-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes timeout for large files
    });
    return response.data;
  } catch (error: any) {
    // If axios fails, try with fetch as fallback with query token
    if (error.response?.status === 401 || error.code === 'ECONNABORTED') {
      const token = localStorage.getItem('access_token');
      if (token) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
        
        try {
          const response = await fetch(`${apiUrl}/api/v1/upload/student-photo?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
          }
          
          return await response.json();
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Upload timeout - file may be too large or connection is slow');
          }
          throw fetchError;
        }
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

  // Get the correct API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com';

  try {
    // First try with the axios instance (which handles token refresh automatically)
    const response = await api.post('/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 1 minute timeout for logos
    });
    return response.data;
  } catch (error: any) {
    // If axios fails, try with fetch as fallback with query token
    if (error.response?.status === 401 || error.code === 'ECONNABORTED') {
      const token = localStorage.getItem('access_token');
      if (token) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute
        
        try {
          const response = await fetch(`${apiUrl}/api/v1/upload/logo?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
          }
          
          return await response.json();
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Upload timeout - file may be too large or connection is slow');
          }
          throw fetchError;
        }
      }
    }
    throw error;
  }
}