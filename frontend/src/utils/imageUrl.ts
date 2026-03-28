/**
 * Get the full URL for an image stored on the backend
 * Works both locally and on production with proper fallbacks
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Get environment variables
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com';
  
  // In production, images are served through Caddy proxy from main domain
  // In development, serve directly from backend
  if (typeof window !== 'undefined') {
    // Client-side: Use current domain for production, API URL for development
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
      // Production: Images served through main domain via Caddy proxy
      // Use the current protocol and hostname to ensure HTTPS in production
      return `${window.location.protocol}//${window.location.hostname}${normalizedPath}`;
    } else {
      // Development: Direct to backend
      return `${API_URL}${normalizedPath}`;
    }
  } else {
    // Server-side rendering: Use appropriate URL based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Production SSR: Use the app URL (main domain)
      const baseUrl = APP_URL.replace(/\/$/, ''); // Remove trailing slash
      return `${baseUrl}${normalizedPath}`;
    } else {
      // Development SSR: Use API URL
      return `${API_URL}${normalizedPath}`;
    }
  }
}

/**
 * Get image URL with error handling and fallback
 */
export function getImageUrlWithFallback(path: string | null | undefined, fallback?: string): string {
  const imageUrl = getImageUrl(path);
  return imageUrl || fallback || '';
}

/**
 * Preload an image to check if it exists
 */
export function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
