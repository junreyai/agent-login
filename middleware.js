import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Get the site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if this is an invitation URL that needs to be rewritten
  const url = req.nextUrl.clone()
  if (url.hash && url.hash.includes('access_token') && url.hash.includes('type=invite')) {
    const targetUrl = new URL(siteUrl)
    targetUrl.hash = url.hash
    targetUrl.pathname = '/login'
    return NextResponse.redirect(targetUrl)
  }

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
      const loginUrl = new URL('/login', siteUrl)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Handle login page access
  if (req.nextUrl.pathname.startsWith('/login')) {
    if (session) {
      const dashboardUrl = new URL('/dashboard', siteUrl)
      return NextResponse.redirect(dashboardUrl)
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
    '/',  
  ],
}
