'use client';

import React from 'react';

/**
 * LoadingSpinner component for displaying loading states throughout the application
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.color - Color theme: 'blue', 'gray', 'white' (default: 'blue')
 * @param {string} props.text - Optional text to display below the spinner
 * @param {boolean} props.fullScreen - Whether to display the spinner in full screen mode
 * @param {string} props.className - Additional CSS classes
 */
export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  text, 
  fullScreen = false,
  className = ''
}) {
  // Size classes
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };
  
  // Color classes
  const colorClasses = {
    blue: 'border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400',
    gray: 'border-gray-200 border-t-gray-600 dark:border-gray-800 dark:border-t-gray-400',
    white: 'border-gray-100/30 border-t-white'
  };
  
  // Container classes
  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin border-solid`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {text}
        </p>
      )}
    </div>
  );
}
