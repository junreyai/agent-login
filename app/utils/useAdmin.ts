'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { fetchAllUsers } from './userUtils'
import useUser from './useUser'
import type { Database } from '@/lib/database.types'
import type { EnhancedUser } from '@/app/utils/types'

interface UseAdminReturn {
  users: EnhancedUser[]
  totalUsers: number
  totalPages: number
  currentPage: number
  loading: boolean
  error: string | null
  setError: (error: string | null) => void
  loadUsers: (options?: { sortBy?: string; sortOrder?: 'asc' | 'desc'; limit?: number; page?: number }) => Promise<void>
  createUser: (userData: { firstName: string; lastName: string; email: string; role?: 'user' | 'admin' }) => Promise<{ success: boolean; user?: any; error: string | null }>
  updateUser: (userData: EnhancedUser) => Promise<{ success: boolean; error: string | null }>
  deleteUser: (user: EnhancedUser) => Promise<{ success: boolean; error: string | null }>
}

export default function useAdmin(): UseAdminReturn {
  const { user, loading: userLoading } = useUser()
  
  const [users, setUsers] = useState<EnhancedUser[]>([])
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient<Database>()
  
  // Function to load all users
  const loadUsers = useCallback(async ({ 
    sortBy = 'created_at', 
    sortOrder = 'desc',
    limit = 10,
    page = 1
  }: { 
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    limit?: number
    page?: number
  } = {}) => {
    if (userLoading || !user || user.role !== 'admin') return
    
    setLoading(true)
    setError(null)
    
    try {
      const { users: fetchedUsers, count, totalPages: pages, error: fetchError } = 
        await fetchAllUsers({ sortBy, sortOrder, limit, page })
      
      if (fetchError) {
        console.error('Error from fetchAllUsers:', fetchError)
        setError(fetchError)
        setLoading(false)
        return
      }
      
      setUsers(fetchedUsers)
      setTotalUsers(count)
      setTotalPages(pages)
      setCurrentPage(page)
    } catch (err: any) {
      console.error('Error loading users:', err?.message || 'Unknown error')
      setError(err?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user, userLoading])
  
  // Function to create a new user
  const createUser = useCallback(async (userData: { firstName: string; lastName: string; email: string; role?: 'user' | 'admin' }) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required')
    }
    
    try {
      // Create the user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: Math.random().toString(36).slice(-10), // Generate random password
        email_confirm: true,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName
        }
      })
      
      if (authError) throw authError
      
      // Add user to user_info table
      const { error: profileError } = await supabase
        .from('user_info')
        .insert({
          id: authData.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'user'
        })
      
      if (profileError) throw profileError
      
      return { success: true, user: authData.user, error: null }
    } catch (err: any) {
      console.error('Error creating user:', err)
      return { success: false, user: null, error: err.message }
    }
  }, [user, supabase])
  
  // Function to update a user
  const updateUser = useCallback(async (userData: EnhancedUser) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required')
    }
    
    try {
      // Update user_info table
      const { error: profileError } = await supabase
        .from('user_info')
        .update({
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role
        })
        .eq('id', userData.id)
      
      if (profileError) throw profileError
      
      // Update email if provided and changed
      if (userData.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(
          userData.id,
          { email: userData.email, email_confirm: true }
        )
        
        if (emailError) throw emailError
      }
      
      return { success: true, error: null }
    } catch (err: any) {
      console.error('Error updating user:', err)
      return { success: false, error: err.message }
    }
  }, [user, supabase])
  
  // Function to delete a user
  const deleteUser = useCallback(async (userData: EnhancedUser) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required')
    }
    
    try {
      // Delete the user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userData.id)
      
      if (authError) throw authError
      
      // The user_info entry should be automatically deleted via RLS policies or triggers
      
      return { success: true, error: null }
    } catch (err: any) {
      console.error('Error deleting user:', err)
      return { success: false, error: err.message }
    }
  }, [user, supabase])
  
  return {
    users,
    totalUsers,
    totalPages,
    currentPage,
    loading: loading || userLoading,
    error,
    setError,
    loadUsers,
    createUser,
    updateUser,
    deleteUser
  }
} 