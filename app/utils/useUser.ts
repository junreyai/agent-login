'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { fetchCurrentUser, updateLastLogin } from './userUtils'
import type { Database } from '@/lib/database.types'
import type { EnhancedUser } from '@/app/utils/types'

interface UseUserOptions {
  redirectIfNotAuthenticated?: boolean
  adminRequired?: boolean
  updateLoginTimestamp?: boolean
}

interface UseUserReturn {
  user: EnhancedUser | null
  error: string | null
  isLoading: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

export default function useUser({
  redirectIfNotAuthenticated = true,
  adminRequired = false,
  updateLoginTimestamp = false
}: UseUserOptions = {}): UseUserReturn {
  const [user, setUser] = useState<EnhancedUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  
  // Function to handle authentication errors
  const handleAuthError = useCallback((err: any, shouldRedirect: boolean = true) => {
    console.error('Authentication error:', err)
    setError(err.message || 'Authentication failed')
    setUser(null)
    if (shouldRedirect && redirectIfNotAuthenticated) {
      router.replace('/login')
    }
  }, [redirectIfNotAuthenticated, router])

  // Function to load user data
  const loadUser = useCallback(async (session?: any) => {
    try {
      // Get session if not provided
      if (!session) {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        session = currentSession
      }

      // Check if user is authenticated
      if (!session?.user) {
        handleAuthError(new Error('No active session'))
        return
      }

      // Fetch enhanced user data
      const { user: enhancedUser, error: fetchError } = await fetchCurrentUser()
      
      if (fetchError) {
        throw new Error(fetchError)
      }
      
      if (!enhancedUser) {
        handleAuthError(new Error('User data not found'))
        return
      }
      
      // Check admin role if required
      if (adminRequired && enhancedUser.role !== 'admin') {
        setError('Admin access required')
        setUser(null)
        router.replace('/dashboard')
        return
      }
      
      // Update user state
      setUser(enhancedUser)
      setError(null)
      
      // Update last login timestamp if requested
      if (updateLoginTimestamp && enhancedUser.id) {
        await updateLastLogin(enhancedUser.id)
      }
    } catch (err: any) {
      handleAuthError(err)
    } finally {
      setIsLoading(false)
    }
  }, [adminRequired, updateLoginTimestamp, supabase, router, handleAuthError])
  
  // Function to refresh user data
  const refreshUser = useCallback(async () => {
    setIsLoading(true)
    await loadUser()
  }, [loadUser])
  
  // Function to sign out
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      
      setUser(null)
      setError(null)
      router.replace('/login')
    } catch (err: any) {
      console.error('Sign out error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])
  
  // Initialize session check
  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        
        if (!sessionChecked && mounted) {
          setSessionChecked(true)
          await loadUser(session)
        }
      } catch (error) {
        console.error('Session check error:', error)
        if (mounted) {
          setIsLoading(false)
          setSessionChecked(true)
        }
      }
    }

    if (!sessionChecked) {
      checkSession()
    }

    return () => {
      mounted = false
    }
  }, [sessionChecked, supabase, loadUser])
  
  // Set up auth state change listener
  useEffect(() => {
    if (!sessionChecked) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_OUT':
          setUser(null)
          setError(null)
          setIsLoading(false)
          if (redirectIfNotAuthenticated) {
            router.replace('/login')
          }
          break
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          setIsLoading(true)
          await loadUser(session)
          break
        case 'USER_UPDATED':
          await refreshUser()
          break
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [sessionChecked, loadUser, refreshUser, redirectIfNotAuthenticated, router, supabase])
  
  return {
    user,
    error,
    isLoading,
    refreshUser,
    signOut
  }
} 