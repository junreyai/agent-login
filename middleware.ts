import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

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

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/reset-password', '/auth']
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  // If it's a public route and user is authenticated, redirect to dashboard
  if (isPublicRoute && session) {
    const dashboardUrl = new URL('/dashboard', siteUrl)
    return NextResponse.redirect(dashboardUrl)
  }

  // If it's a public route and user is not authenticated, allow access
  if (isPublicRoute) {
    return res
  }

  // For all other routes, require authentication
  if (!session) {
    const loginUrl = new URL('/login', siteUrl)
    return NextResponse.redirect(loginUrl)
  }

  // Special handling for admin route
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userInfo, error } = await supabase
        .from('user_info')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (error || !userInfo || userInfo.role !== 'admin') {
        const dashboardUrl = new URL('/dashboard', siteUrl)
        return NextResponse.redirect(dashboardUrl)
      }
    } else {
      const loginUrl = new URL('/login', siteUrl)
      return NextResponse.redirect(loginUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png).*)',
  ],
} 