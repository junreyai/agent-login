'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PageLoading, ButtonLoader } from '../components/LoadingComponents'
import useUser from '@/app/utils/useUser'
import { updateUserProfile } from '@/app/utils/userUtils'
import type { Database } from '@/lib/database.types'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  
  // Use our custom hook for user data
  const { user, loading: userLoading, refreshUser } = useUser({ 
    redirectIfNotAuthenticated: true 
  })
  
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [updating, setUpdating] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
    }
  }, [user])

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setMessage('')
    
    try {
      if (!user) {
        throw new Error('User not found')
      }

      const { success, error } = await updateUserProfile(user.id, {
        first_name: firstName,
        last_name: lastName
      })
      
      if (!success) throw new Error(error || 'Failed to update profile')
      
      setMessage('Profile updated successfully!')
      refreshUser() // Refresh user data
    } catch (error: any) {
      setMessage(`Error updating profile: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  if (userLoading) return <PageLoading message="Loading your account settings..." />

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900">
      {/* Navbar is now in the root layout */}
      
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-800 dark:text-blue-300">Account Settings</h1>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6 border border-blue-100 dark:border-blue-900/50">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">Profile Information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                onChange={() => {}}
                className="w-full px-3 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                disabled
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            
            {message && (
              <div className={`p-3 rounded-md mb-4 ${message.includes('Error') ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                {message}
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <ButtonLoader color="blue" size="small" className="mr-2" />
                    Updating...
                  </>
                ) : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6 border border-blue-100 dark:border-blue-900/50">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">Security</h2>
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Two-Factor Authentication</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Enhance your account security by enabling two-factor authentication.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => router.push('/2fa-setup')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Manage 2FA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 