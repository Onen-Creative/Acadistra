'use client'

import { useState, useEffect } from 'react'
import { getImageUrl, preloadImage } from '@/utils/imageUrl'

interface ImageWithFallbackProps {
  src: string | null | undefined
  alt: string
  fallback?: string
  className?: string
  style?: React.CSSProperties
  onLoad?: () => void
  onError?: () => void
}

export default function ImageWithFallback({
  src,
  alt,
  fallback,
  className,
  style,
  onLoad,
  onError
}: ImageWithFallbackProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true)
      setHasError(false)

      if (!src) {
        setImageSrc(fallback || '')
        setIsLoading(false)
        return
      }

      const imageUrl = getImageUrl(src)
      
      try {
        const exists = await preloadImage(imageUrl)
        if (exists) {
          setImageSrc(imageUrl)
        } else {
          setImageSrc(fallback || '')
          setHasError(true)
          onError?.()
        }
      } catch (error) {
        setImageSrc(fallback || '')
        setHasError(true)
        onError?.()
      } finally {
        setIsLoading(false)
      }
    }

    loadImage()
  }, [src, fallback, onError])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    if (!hasError && fallback) {
      setImageSrc(fallback)
      setHasError(true)
      onError?.()
    }
  }

  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        style={style}
      >
        <span className="text-gray-400 text-xs">Loading...</span>
      </div>
    )
  }

  if (!imageSrc) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={style}
      >
        <span className="text-gray-400 text-xs">No Image</span>
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
    />
  )
}