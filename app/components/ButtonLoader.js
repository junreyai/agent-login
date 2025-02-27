'use client';

import React from 'react';

/**
 * ButtonLoader component for displaying loading states within buttons
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner: 'sm', 'md' (default: 'sm')
 * @param {string} props.color - Color of the spinner: 'white', 'blue', 'gray' (default: 'white')
 * @param {string} props.className - Additional CSS classes
 */
export default function ButtonLoader({ 
  size = 'sm', 
  color = 'white',
  className = '' 
}) {
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2'
  };
  
  // Color classes
  const colorClasses = {
    white: 'border-white/30 border-t-white',
    blue: 'border-blue-200 border-t-blue-600',
    gray: 'border-gray-200 border-t-gray-600'
  };

  return (
    <div 
      className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin border-solid ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
