'use client'

// Core imports
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Third-party imports
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Components
import { PageLoading } from '../components/LoadingComponents'

// Utilities
import useUser from '@/app/utils/useUser'
import type { Database } from '@/lib/database.types'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const { user, loading, error } = useUser({ 
    redirectIfNotAuthenticated: true,
    updateLoginTimestamp: true
  })

  if (loading) {
    return <PageLoading message="Loading your dashboard..." />
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome, {user.firstName || 'User'}!
          </h1>
          <p className="text-gray-600">
            This is your dashboard. You can start customizing it based on your needs.
          </p>
        </div>
      </div>
    </div>
  )
} 