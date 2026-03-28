'use client'

import { useState, useRef, DragEvent } from 'react'
import { useImageUpload, validateImageFile, formatFileSize } from '@/hooks/useImageUpload'
import ImageWithFallback from './ImageWithFallback'

interface ImageUploadProps {
  endpoint: 'logo' | 'student-photo'
  currentImage?: string | null
  onUploadSuccess: (response: any) => void
  onUploadError?: (error: string) => void
  className?: string
  accept?: string
  maxSize?: number
  label?: string
  description?: string
}

export default function ImageUpload({
  endpoint,
  currentImage,
  onUploadSuccess,
  onUploadError,
  className = '',
  accept = 'image/jpeg,image/jpg,image/png',
  maxSize = 10,
  label = 'Upload Image',
  description = 'Drag and drop an image here, or click to select'
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { uploadImage, isUploading, uploadProgress, error, reset } = useImageUpload()

  const handleFileSelect = (file: File) => {
    const validationError = validateImageFile(file)
    if (validationError) {
      onUploadError?.(validationError)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadImage(file, {
      endpoint,
      onSuccess: (response) => {
        onUploadSuccess(response)
        reset()
      },
      onError: (error) => {
        setPreview(null)
        onUploadError?.(error)
      }
    })
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const displayImage = preview || currentImage

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        
        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />

          {displayImage ? (
            <div className="space-y-4">
              <div className="mx-auto w-32 h-32 relative">
                <ImageWithFallback
                  src={displayImage}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="text-white text-sm">
                      {uploadProgress}%
                    </div>
                  </div>
                )}
              </div>
              
              {!isUploading && (
                <p className="text-sm text-gray-600">
                  Click or drag to replace image
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {description}
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, JPEG up to {maxSize}MB
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-200 rounded-b-lg">
              <div 
                className="bg-blue-500 h-2 rounded-b-lg transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        {/* Upload Status */}
        {isUploading && (
          <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-3">
            Uploading... {uploadProgress}%
          </div>
        )}
      </div>
    </div>
  )
}