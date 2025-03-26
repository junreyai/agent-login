'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import NavbarWrapper from './NavbarWrapper'

interface ClientLayoutProps {
  children: ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Disable Next.js loading indicator
  useEffect(() => {
    // Remove any existing loading indicators
    const style = document.createElement('style')
    style.textContent = `
      #nprogress {
        display: none !important;
      }
      .nprogress-custom-parent {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <>
      <NavbarWrapper />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  )
} 