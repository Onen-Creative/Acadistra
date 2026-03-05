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