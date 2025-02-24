import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allow access to auth routes
  if (req.nextUrl.pathname.startsWith('/auth')) {
    return res
  }

  // Allow access to reset password pages
  if (req.nextUrl.pathname.startsWith('/reset-password')) {
    return res
  }

  // Protect dashboard route
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Handle login page access
  if (req.nextUrl.pathname.startsWith('/login')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/reset-password/:path*',
    '/auth/:path*',
  ],
}
