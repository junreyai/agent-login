import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

const PUBLIC_ROUTES = ['/login', '/reset-password', '/auth']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  try {
    // Refresh session if expired
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      throw sessionError
    }

    // Check if the current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )

    // Handle authentication based on route type
    if (!session && !isPublicRoute) {
      // If no session and trying to access protected route, redirect to login
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (session && isPublicRoute) {
      // If has session and trying to access public route, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Update session in response
    if (session) {
      res.headers.set('x-supabase-auth', JSON.stringify({ 
        access_token: session.access_token,
        expires_at: session.expires_at 
      }))
    }

    return res
  } catch (error) {
    // On error, clear session and redirect to login
    console.error('Middleware error:', error)
    await supabase.auth.signOut()
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }
}

// Specify which routes should trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 