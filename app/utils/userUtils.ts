'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import type { UserInfo, EnhancedUser, FetchUsersOptions, FetchUsersResponse, ProfileData } from './types'

/**
 * Fetch the current authenticated user with their profile information
 */
export async function fetchCurrentUser(): Promise<{ user: EnhancedUser | null; error: string | null }> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error:', userError)
      return { user: null, error: userError.message }
    }
    
    if (!user) {
      console.log('No authenticated user found')
      return { user: null, error: null }
    }
    
    // Fetch additional user profile information from user_info table
    const { data: userInfo, error: profileError } = await supabase
      .from('user_info')
      .select('first_name, last_name, role')
      .eq('id', user.id)
      .single()
    
    // Create default user info if not found
    if (profileError && (profileError.code === 'PGRST116' || profileError.message?.includes('not found'))) {
      const defaultUserInfo = {
        first_name: '',
        last_name: '',
        role: 'user'
      }
      
      await supabase
        .from('user_info')
        .insert({
          id: user.id,
          ...defaultUserInfo
        })
      
      return {
        user: {
          ...user,
          firstName: defaultUserInfo.first_name,
          lastName: defaultUserInfo.last_name,
          role: defaultUserInfo.role,
          lastLogin: user.user_metadata?.last_login || null,
          fullName: ''
        },
        error: null
      }
    }
    
    // Return user with profile data
    return {
      user: {
        ...user,
        firstName: userInfo?.first_name || '',
        lastName: userInfo?.last_name || '',
        role: userInfo?.role || 'user',
        lastLogin: user.user_metadata?.last_login || null,
        fullName: `${userInfo?.first_name || ''} ${userInfo?.last_name || ''}`.trim()
      },
      error: null
    }
  } catch (error: any) {
    console.error('Error fetching current user:', error)
    return { user: null, error: error.message || 'Failed to fetch user' }
  }
}

/**
 * Fetch all users (for admin purposes)
 */
export async function fetchAllUsers({ 
  sortBy = 'created_at', 
  sortOrder = 'desc',
  limit = 50,
  page = 1
}: FetchUsersOptions = {}): Promise<FetchUsersResponse> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    // Check if the current user is an admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Authentication required')
    }
    
    // Fetch the user's role
    const { data: userData, error: userError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userError) throw userError
    
    // Only allow admins to fetch all users
    if (userData.role !== 'admin') {
      throw new Error('Admin access required')
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit
    
    // Fetch users with their profile information
    const { data: users, error: usersError, count } = await supabase
      .from('user_info')
      .select(`
        id, 
        first_name, 
        last_name, 
        role, 
        created_at
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)
    
    if (usersError) throw usersError
    
    // Format user data
    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role || 'user',
      createdAt: user.created_at,
      lastLogin: null
    }))
    
    return { 
      users: formattedUsers, 
      count: count || 0, 
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page, 
      error: null 
    }
  } catch (error: any) {
    console.error('Error fetching all users:', error?.message || 'Unknown error')
    return { 
      users: [], 
      count: 0, 
      totalPages: 0, 
      currentPage: page, 
      error: error?.message || 'Unknown error' 
    }
  }
}

/**
 * Update a user's profile information
 */
export async function updateUserProfile(userId: string, profileData: ProfileData): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    // Get the current user to check permissions
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Authentication required')
    }
    
    // Check if user is updating their own profile or is an admin
    if (user.id !== userId) {
      // Verify the user is an admin
      const { data: userData, error: userError } = await supabase
        .from('user_info')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (userError) throw userError
      
      if (userData.role !== 'admin') {
        throw new Error('Permission denied')
      }
    }
    
    // Update the user's profile
    const { error } = await supabase
      .from('user_info')
      .update(profileData)
      .eq('id', userId)
    
    if (error) throw error
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if this is the user's first time logging in
 */
export async function checkFirstTimeLogin(userId: string): Promise<boolean> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    const { data: userInfo, error } = await supabase
      .from('user_info')
      .select('last_login')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error checking first time login:', error)
      return true
    }
    
    return !userInfo.last_login
  } catch (error) {
    console.error('Error checking first time login:', error)
    return true
  }
}

/**
 * Update the user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    const { error } = await supabase
      .from('user_info')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating last login:', error)
    }
  } catch (error) {
    console.error('Error updating last login:', error)
  }
} 