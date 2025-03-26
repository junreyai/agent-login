'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import Navbar from './Navbar'

export default function NavbarWrapper() {
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  // Check if the current route is public
  const isPublicRoute = ['/login', '/register'].includes(pathname || '')

  useEffect(() => {
    let mounted = true

    const checkUser = async () => {
      if (isPublicRoute) return

      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.user) {
          if (mounted) {
            setUser(null)
            router.replace('/login')
          }
          return
        }

        // Fetch additional user info from user_info table
        const { data: userInfo, error: userError } = await supabase
          .from('user_info')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userError && !userError.message.includes('not found')) {
          console.error('Error fetching user info:', userError)
        }

        // Combine session user data with user_info data
        if (mounted) {
          setUser({
            ...session.user,
            ...(userInfo || {}),
          })
        }
      } catch (error) {
        console.error('Error in checkUser:', error)
        if (mounted) {
          setUser(null)
          router.replace('/login')
        }
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              // Fetch user info on sign in
              const { data: userInfo, error: userError } = await supabase
                .from('user_info')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (userError && !userError.message.includes('not found')) {
                console.error('Error fetching user info:', userError)
              }

              setUser({
                ...session.user,
                ...(userInfo || {}),
              })
            }
            break

          case 'SIGNED_OUT':
            setUser(null)
            router.replace('/login')
            break

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              // Refresh user info on token refresh
              const { data: userInfo, error: userError } = await supabase
                .from('user_info')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (userError && !userError.message.includes('not found')) {
                console.error('Error fetching user info:', userError)
              }

              setUser({
                ...session.user,
                ...(userInfo || {}),
              })
            }
            break
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        setUser(null)
        router.replace('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, isPublicRoute, router])

  // Don't show navbar on public routes
  if (isPublicRoute) {
    return null
  }

  // Show navbar if we have a user
  return user ? <Navbar user={user} /> : null
} 