import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit'
import { OfflineIndicator } from '@/components/OfflineIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Acadistra',
  description: 'Comprehensive school management system for Ugandan schools (ECCE → S6) with UNEB/NCDC grading',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Acadistra'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2196f3'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Suppress browser extension errors in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    const originalError = console.error
    console.error = (...args) => {
      if (args[0]?.toString().includes('proxy.js') || 
          args[0]?.toString().includes('disconnected port')) {
        return
      }
      originalError.apply(console, args)
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <ServiceWorkerInit />
        <OfflineIndicator />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}