'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import type { Database } from '@/lib/database.types'

interface UserInfo {
  id: string
  role: 'user' | 'admin'
  [key: string]: any
}

const PUBLIC_ROUTES = ['/login', '/reset-password', '/auth']

export default function NavbarWrapper() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const supabase = createClientComponentClient<Database>()

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setError(null)

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          throw authError
        }

        if (authUser) {
          const { data: userInfo, error: userError } = await supabase
            .from('user_info')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (userError && !userError.message.includes('not found')) {
            throw userError
          }

          setUser(userInfo ? { ...authUser, ...userInfo } : authUser)
        } else {
          setUser(null)
        }
      } catch (err: any) {
        console.error('Error fetching user:', err)
        setError(err.message)
        setUser(null)
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setError(null)

        if (session?.user) {
          const { data: userInfo, error: userError } = await supabase
            .from('user_info')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userError && !userError.message.includes('not found')) {
            throw userError
          }

          setUser(userInfo ? { ...session.user, ...userInfo } : session.user)
        } else {
          setUser(null)
        }
      } catch (err: any) {
        console.error('Error handling auth change:', err)
        setError(err.message)
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Don't render navbar when user is not authenticated
  if (!user) {
    return null
  }

  return <Navbar user={user} />
} 