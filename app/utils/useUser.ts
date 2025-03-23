'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { fetchCurrentUser, updateLastLogin, checkFirstTimeLogin } from './userUtils'
import type { Database } from '@/lib/database.types'
import type { EnhancedUser } from '@/app/utils/types'

interface UseUserOptions {
  redirectIfNotAuthenticated?: boolean
  adminRequired?: boolean
  updateLoginTimestamp?: boolean
}

interface UseUserReturn {
  user: EnhancedUser | null
  loading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

export default function useUser({
  redirectIfNotAuthenticated = true,
  adminRequired = false,
  updateLoginTimestamp = false
}: UseUserOptions = {}): UseUserReturn {
  const [user, setUser] = useState<EnhancedUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  
  // Function to load user data
  const loadUser = useCallback(async () => {
    try {
      const { user, error: fetchError } = await fetchCurrentUser()
      
      if (fetchError) {
        setError(fetchError)
        if (redirectIfNotAuthenticated) {
          router.push('/login')
        }
        return
      }
      
      if (!user) {
        if (redirectIfNotAuthenticated) {
          router.push('/login')
        }
        return
      }
      
      // Check if admin role is required
      if (adminRequired && user.role !== 'admin') {
        setError('Admin access required')
        router.push('/dashboard')
        return
      }
      
      setUser(user)
      
      // Update last login timestamp if requested
      if (updateLoginTimestamp && user.id) {
        updateLastLogin(user.id).catch(console.error)
      }
    } catch (err: any) {
      setError(err.message)
      if (redirectIfNotAuthenticated) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [adminRequired, redirectIfNotAuthenticated, router, updateLoginTimestamp])
  
  // Function to refresh user data
  const refreshUser = useCallback(async () => {
    setLoading(true)
    await loadUser()
  }, [loadUser])
  
  // Function to sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      window.location.href = '/login'
    } catch (err: any) {
      setError(err.message)
    }
  }, [supabase])
  
  // Load user data on mount and set up auth state change listener
  useEffect(() => {
    loadUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        if (redirectIfNotAuthenticated) {
          router.push('/login')
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser()
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [loadUser, redirectIfNotAuthenticated, router, supabase])
  
  return {
    user,
    loading,
    error,
    refreshUser,
    signOut
  }
} 