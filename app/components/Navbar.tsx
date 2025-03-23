'use client'

import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ButtonLoader } from './LoadingComponents'
import type { Database } from '@/lib/database.types'

interface User {
  id: string
  role: 'user' | 'admin'
  email?: string
  [key: string]: any
}

interface NavbarProps {
  user: User | null
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [signingOut, setSigningOut] = useState<boolean>(false)

  // Debug user object
  useEffect(() => {
    console.log('Navbar user:', user)
    console.log('User role:', user?.role)
    console.log('User full data:', JSON.stringify(user, null, 2))
  }, [user])

  const handleSignOut = async (): Promise<void> => {
    try {
      setSigningOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear any local storage items if needed
      localStorage.removeItem('supabase.auth.token')
      
      // Force a hard navigation to the login page
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      setSigningOut(false)
    }
  }

  // Admin button visibility
  const showAdminButton = user && user.role === 'admin'

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="cursor-pointer">
                <Image 
                  src="/logo.png" 
                  alt="Logo" 
                  width={32} 
                  height={32} 
                  className="h-8 w-auto" 
                />
              </Link>
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">Next-Login</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link href="/dashboard" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                Dashboard
              </Link>
              <Link href="/settings" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Settings
              </Link>
              <Link href="/2fa-setup" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                2FA Setup
              </Link>
              {showAdminButton && (
                <Link
                  href="/admin"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50"
            >
              {signingOut ? (
                <>
                  <ButtonLoader color="blue" size="small" className="mr-2" />
                  Signing Out...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 