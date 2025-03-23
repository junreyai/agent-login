import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Constants
const ALLOWED_ROLES = ['admin', 'user'] as const
type Role = typeof ALLOWED_ROLES[number]
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface UserInput {
  firstName: string
  lastName: string
  email: string
  role: Role
}

// Helper functions
const validateUserInput = (data: Partial<UserInput>): string[] => {
  const { firstName, lastName, email, role } = data
  const errors: string[] = []

  if (!firstName?.trim()) errors.push('First name is required')
  if (!lastName?.trim()) errors.push('Last name is required')
  if (!email?.trim()) errors.push('Email is required')
  if (!email || !EMAIL_REGEX.test(email)) errors.push('Invalid email format')
  if (!role || !ALLOWED_ROLES.includes(role)) errors.push('Invalid role')

  return errors
}

const createSupabaseAdmin = () => {
  // Get the site URL, ensuring no trailing slash
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-site-url': siteUrl // Pass site URL in headers
        }
      }
    }
  )
}

interface CustomError extends Error {
  status?: number
}

const checkAdminAccess = async (supabase: ReturnType<typeof createRouteHandlerClient<Database>>) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) throw new Error('No user found')

    const { data: userInfo, error: userInfoError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userInfoError) throw userInfoError
    if (userInfo.role !== 'admin') {
      const error = new Error('Only administrators can create new users') as CustomError
      error.status = 403
      throw error
    }

    return user
  } catch (error: any) {
    const customError = new Error(error.message || 'Unauthorized access') as CustomError
    customError.status = error.status || 403
    throw customError
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestData = await request.json()
    const { firstName, lastName, email, role } = requestData as UserInput

    // Validate input
    const validationErrors = validateUserInput({ firstName, lastName, email, role })
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Check if user has admin access
    const supabase = createRouteHandlerClient<Database>({ cookies })
    await checkAdminAccess(supabase)

    // Create user with admin client
    const adminAuthClient = createSupabaseAdmin()

    // Get the site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // First send the invitation to get the user ID
    const { data, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: role
      },
      redirectTo: `${siteUrl}/login`, // Simplified redirect URL - we'll handle the rest in the login page
    })

    if (inviteError) {
      const error = new Error(inviteError.message || 'Error sending invitation') as CustomError
      error.status = 500
      throw error
    }

    // Now check if user_info exists for this user
    const { data: existingUserInfo } = await adminAuthClient
      .from('user_info')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (existingUserInfo) {
      // Update existing user info
      const { error: updateError } = await adminAuthClient
        .from('user_info')
        .update({
          first_name: firstName,
          last_name: lastName,
          role: role
        })
        .eq('id', data.user.id)

      if (updateError) {
        const error = new Error(updateError.message || 'Error updating user info') as CustomError
        error.status = 500
        throw error
      }
    } else {
      // Create new user info record
      const { error: createError } = await adminAuthClient
        .from('user_info')
        .insert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          role: role
        })

      if (createError) {
        const error = new Error(createError.message || 'Error creating user info') as CustomError
        error.status = 500
        throw error
      }
    }

    return NextResponse.json({
      message: 'User invited successfully',
      user: data.user
    })
  } catch (error: any) {
    console.error('Error in POST /api/users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// GET method to fetch users (admin only)
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    const { data: users, error } = await supabase
      .from('user_info')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 