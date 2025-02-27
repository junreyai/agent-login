'use client';

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * PageLoading component for displaying a full-page loading state
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Custom loading message (default: 'Loading...')
 * @param {string} props.spinnerSize - Size of the spinner: 'sm', 'md', 'lg' (default: 'lg')
 * @param {string} props.spinnerColor - Color of the spinner (default: 'blue')
 * @param {boolean} props.transparent - Whether the background should be transparent
 */
export default function PageLoading({ 
  message = 'Loading...', 
  spinnerSize = 'lg',
  spinnerColor = 'blue',
  transparent = false
}) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${
      transparent 
        ? 'bg-transparent' 
        : 'bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900'
    }`}>
      <div className="text-center">
        <LoadingSpinner 
          size={spinnerSize} 
          color={spinnerColor} 
        />
        <h2 className="mt-4 text-xl font-semibold text-blue-700 dark:text-blue-400">
          {message}
        </h2>
      </div>
    </div>
  );
}
