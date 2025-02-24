import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // Exchange the code for a session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Auth error:', exchangeError.message)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
        )
      }

      // Get the base URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                     (requestUrl.protocol + '//' + requestUrl.host)

      // Redirect to login
      return NextResponse.redirect(new URL('/login', baseUrl))

    } catch (error) {
      console.error('Unexpected error:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('An unexpected error occurred')}`, request.url)
      )
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
