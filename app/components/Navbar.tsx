'use client'

import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
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

  // Debug user object
  useEffect(() => {
    console.log('Navbar user:', user)
    console.log('User role:', user?.role)
    console.log('User full data:', JSON.stringify(user, null, 2))
  }, [user])

  const handleSignOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear any local storage items if needed
      localStorage.removeItem('supabase.auth.token')
      
      // Redirect to login page
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Admin button visibility
  const showAdminButton = user && user.role === 'admin'

  return (
    <nav className="">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/assets/Logo.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              </Link>
            </div>
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-rose-400 border-b-2 border-transparent hover:border-rose-400 hover:text-rose-500 transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/settings" 
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-rose-500 border-b-2 border-transparent hover:border-rose-400 transition-colors"
              >
                Settings
              </Link>
              <Link 
                href="/2fa-setup" 
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-rose-500 border-b-2 border-transparent hover:border-rose-400 transition-colors"
              >
                2FA Setup
              </Link>
              {showAdminButton && (
                <Link
                  href="/admin"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-rose-500 border-b-2 border-transparent hover:border-rose-400 transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center p-2 text-sm font-medium text-white bg-rose-400 hover:bg-rose-500 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 