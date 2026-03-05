// Beautiful, Responsive Form Components

import { forwardRef } from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  required?: boolean
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, icon, required, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl border-2 ${
          error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        } focus:ring-2 ${
          error ? 'focus:ring-red-200' : 'focus:ring-blue-200'
        } transition-all outline-none ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  )
)

FormInput.displayName = 'FormInput'

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  icon?: string
  required?: boolean
  options: { value: string; label: string }[]
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, icon, required, options, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl border-2 ${
          error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        } focus:ring-2 ${
          error ? 'focus:ring-red-200' : 'focus:ring-blue-200'
        } transition-all outline-none bg-white ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  )
)

FormSelect.displayName = 'FormSelect'

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  icon?: string
  required?: boolean
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, icon, required, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl border-2 ${
          error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        } focus:ring-2 ${
          error ? 'focus:ring-red-200' : 'focus:ring-blue-200'
        } transition-all outline-none resize-none ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  )
)

FormTextarea.displayName = 'FormTextarea'

export const FormSection = ({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-200">
      {icon && <span className="text-2xl">{icon}</span>}
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {children}
    </div>
  </div>
)

export const FormCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6 ${className}`}>
    {children}
  </div>
)

export const FormActions = ({ 
  onCancel, 
  submitText = 'Submit', 
  cancelText = 'Cancel',
  isLoading = false,
  loadingText = 'Submitting...',
  submitDisabled = false
}: { 
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  isLoading?: boolean
  loadingText?: string
  submitDisabled?: boolean
}) => (
  <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
    {onCancel && (
      <button
        type="button"
        onClick={onCancel}
        className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 transition-all duration-300 hover:shadow-lg"
      >
        ❌ {cancelText}
      </button>
    )}
    <button
      type="submit"
      disabled={isLoading || submitDisabled}
      className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
    >
      {isLoading ? `⏳ ${loadingText}` : `✅ ${submitText}`}
    </button>
  </div>
)

export const StepIndicator = ({ 
  steps, 
  currentStep 
}: { 
  steps: string[]
  currentStep: number 
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all duration-300 ${
                index <= currentStep
                  ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg scale-110'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1}
            </div>
            <p className={`mt-2 text-xs md:text-sm font-medium text-center ${
              index <= currentStep ? 'text-blue-600' : 'text-gray-400'
            }`}>
              {step}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${
              index < currentStep ? 'bg-gradient-to-r from-blue-500 to-blue-700' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  </div>
)

export const FormGrid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) => (
  <div className={`grid grid-cols-1 ${cols === 2 ? 'md:grid-cols-2' : cols === 3 ? 'md:grid-cols-3' : ''} gap-4 md:gap-6`}>
    {children}
  </div>
)

export const FullWidthField = ({ children }: { children: React.ReactNode }) => (
  <div className="md:col-span-2">
    {children}
  </div>
)
