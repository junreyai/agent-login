import React from 'react'

interface ButtonLoaderProps {
  color?: string
  size?: string
  className?: string
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({ 
  color = 'white', 
  size = 'small',
  className = '' 
}) => {
  return (
    <div className={`animate-spin rounded-full h-4 w-4 border-2 border-${color}-500 border-t-transparent ${className}`} />
  )
}

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'rose', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className={`animate-spin rounded-full border-4 border-${color}-200 border-t-${color}-600 ${sizeClasses[size]} ${className}`} />
  )
}

interface PageLoadingProps {
  message?: string
}

export const PageLoading: React.FC<PageLoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner size="large" color="rose" />
      <p className="mt-4 text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  )
} 