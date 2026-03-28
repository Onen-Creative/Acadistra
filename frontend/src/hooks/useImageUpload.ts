'use client'

import { useState } from 'react'

interface UploadOptions {
  endpoint: 'logo' | 'student-photo'
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: string) => void
}

interface UploadResponse {
  logo_url?: string
  photo_url?: string
  thumbnail_url?: string
  original_size?: number
  optimized_size?: number
  saved_percent?: string
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = async (file: File, options: UploadOptions): Promise<UploadResponse | null> => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Validate file
      if (!file) {
        throw new Error('No file selected')
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPG, JPEG, and PNG files are allowed')
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB')
      }

      const formData = new FormData()
      const fieldName = options.endpoint === 'logo' ? 'logo' : 'photo'
      formData.append(fieldName, file)

      // Get API URL
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const uploadUrl = `${API_URL}/api/v1/upload/${options.endpoint}`

      // Get auth token
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const xhr = new XMLHttpRequest()

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
            options.onProgress?.(progress)
          }
        })

        xhr.addEventListener('load', () => {
          setIsUploading(false)
          
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              options.onSuccess?.(response)
              resolve(response)
            } catch (parseError) {
              const errorMsg = 'Invalid response from server'
              setError(errorMsg)
              options.onError?.(errorMsg)
              reject(new Error(errorMsg))
            }
          } else {
            let errorMsg = 'Upload failed'
            try {
              const errorResponse = JSON.parse(xhr.responseText)
              errorMsg = errorResponse.error || errorMsg
            } catch {
              errorMsg = `Upload failed with status ${xhr.status}`
            }
            setError(errorMsg)
            options.onError?.(errorMsg)
            reject(new Error(errorMsg))
          }
        })

        xhr.addEventListener('error', () => {
          setIsUploading(false)
          const errorMsg = 'Network error during upload'
          setError(errorMsg)
          options.onError?.(errorMsg)
          reject(new Error(errorMsg))
        })

        xhr.addEventListener('timeout', () => {
          setIsUploading(false)
          const errorMsg = 'Upload timeout'
          setError(errorMsg)
          options.onError?.(errorMsg)
          reject(new Error(errorMsg))
        })

        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.timeout = 60000 // 60 seconds timeout
        xhr.send(formData)
      })

    } catch (err) {
      setIsUploading(false)
      const errorMsg = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMsg)
      options.onError?.(errorMsg)
      return null
    }
  }

  const reset = () => {
    setIsUploading(false)
    setUploadProgress(0)
    setError(null)
  }

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    error,
    reset
  }
}

// Utility function to validate image files
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG, JPEG, and PNG files are allowed'
  }

  if (file.size > maxSize) {
    return 'File size must be less than 10MB'
  }

  return null
}

// Utility function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}