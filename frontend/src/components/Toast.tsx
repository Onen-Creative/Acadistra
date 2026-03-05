'use client'

import { useEffect } from 'react'

interface ToastProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

export default function Toast({ isOpen, onClose, title, message, type }: ToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const colors = {
    success: 'from-green-500 to-emerald-600',
    error: 'from-red-500 to-rose-600',
    warning: 'from-yellow-500 to-orange-600',
    info: 'from-blue-500 to-indigo-600',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`bg-gradient-to-r ${colors[type]} rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white text-xl font-bold">
            {icons[type]}
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
            <p className="text-white text-opacity-90 text-xs">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white hover:bg-white hover:bg-opacity-20 rounded-full w-6 h-6 flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
