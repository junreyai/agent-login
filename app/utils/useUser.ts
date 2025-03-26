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
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false)
  
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  
  const redirect = useCallback((path: string) => {
    if (!isRedirecting) {
      setIsRedirecting(true)
      router.push(path)
    }
  }, [isRedirecting, router])
  
  // Function to load user data
  const loadUser = useCallback(async () => {
    if (isRedirecting) return
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setUser(null)
        if (redirectIfNotAuthenticated) {
          redirect('/login')
        }
        return
      }

      const { user: enhancedUser, error: fetchError } = await fetchCurrentUser()
      
      if (fetchError) {
        setError(fetchError)
        setUser(null)
        if (redirectIfNotAuthenticated) {
          redirect('/login')
        }
        return
      }
      
      if (!enhancedUser) {
        setUser(null)
        if (redirectIfNotAuthenticated) {
          redirect('/login')
        }
        return
      }
      
      // Check if admin role is required
      if (adminRequired && enhancedUser.role !== 'admin') {
        setError('Admin access required')
        setUser(null)
        redirect('/dashboard')
        return
      }
      
      setUser(enhancedUser)
      setError(null)
      
      // Update last login timestamp if requested
      if (updateLoginTimestamp && enhancedUser.id) {
        updateLastLogin(enhancedUser.id).catch(console.error)
      }
    } catch (err: any) {
      setError(err.message)
      setUser(null)
      if (redirectIfNotAuthenticated) {
        redirect('/login')
      }
    }
  }, [adminRequired, redirectIfNotAuthenticated, redirect, updateLoginTimestamp, isRedirecting, supabase])
  
  // Function to refresh user data
  const refreshUser = useCallback(async () => {
    if (!isRedirecting) {
      await loadUser()
    }
  }, [loadUser, isRedirecting])
  
  // Function to sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setError(null)
      router.push('/login')
    } catch (err: any) {
      setError(err.message)
    }
  }, [supabase, router])
  
  // Load user data on mount and set up auth state change listener
  useEffect(() => {
    let mounted = true
    
    const initialize = async () => {
      if (mounted && !isRedirecting) {
        await loadUser()
      }
    }
    
    initialize()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isRedirecting) return
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        if (redirectIfNotAuthenticated) {
          redirect('/login')
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser()
      }
    })
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUser, redirectIfNotAuthenticated, redirect, supabase, isRedirecting])
  
  return {
    user,
    error,
    refreshUser,
    signOut
  }
} 