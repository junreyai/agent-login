'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Navbar from './Navbar'

export default function NavbarWrapper() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          try {
            // Fetch user role from user_info table
            const { data: userInfo, error } = await supabase
              .from('user_info')
              .select('role')
              .eq('id', user.id)
              .single()
            
            if (userInfo && !error) {
              // Add role to user object
              setUser({...user, role: userInfo.role})
            } else {
              // If there's an error or no userInfo, still set the user without role
              console.log('No role found or error fetching role:', error)
              setUser(user)
            }
          } catch (roleError) {
            // If there's an exception in fetching role, still set the user
            console.error('Error fetching user role:', roleError)
            setUser(user)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            // Fetch user role when auth state changes
            const { data: userInfo, error } = await supabase
              .from('user_info')
              .select('role')
              .eq('id', session.user.id)
              .single()
            
            if (userInfo && !error) {
              // Add role to user object
              setUser({...session.user, role: userInfo.role})
            } else {
              // If there's an error or no userInfo, still set the user without role
              console.log('Auth change: No role found or error fetching role:', error)
              setUser(session.user)
            }
          } catch (roleError) {
            // If there's an exception in fetching role, still set the user
            console.error('Auth change: Error fetching user role:', roleError)
            setUser(session.user)
          }
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase])

  // Don't render navbar if still loading or no user (not authenticated)
  if (loading) return null
  
  // Only show navbar if user is authenticated
  return user ? <Navbar user={user} /> : null
}
