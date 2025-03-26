'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function NotFound() {
  const router = useRouter()

  // Remove any loading indicators
  useEffect(() => {
    // Remove any loading bars or spinners that might be present
    const loadingElements = document.querySelectorAll('[role="progressbar"], .nprogress-custom-parent');
    loadingElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }, []);

  return (
    <>
      {/* Override any existing styles */}
      <style jsx global>{`
        #nprogress {
          display: none !important;
        }
        .nprogress-custom-parent {
          display: none !important;
        }
      `}</style>

      <div className="fixed inset-0 bg-white">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-9xl font-bold text-rose-400 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-white text-rose-400 border border-rose-400 rounded-md hover:bg-rose-50 transition-colors duration-200"
              >
                Go Back
              </button>
              
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-rose-400 text-white rounded-md hover:bg-rose-500 transition-colors duration-200"
              >
                Return to Dashboard
              </Link>
            </div>

            <div className="mt-12">
              <svg
                className="w-24 h-24 mx-auto text-rose-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 