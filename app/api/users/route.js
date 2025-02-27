import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Constants
const ALLOWED_ROLES = ['admin', 'user']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Helper functions
const validateUserInput = (data) => {
  const { firstName, lastName, email, role } = data
  const errors = []

  if (!firstName?.trim()) errors.push('First name is required')
  if (!lastName?.trim()) errors.push('Last name is required')
  if (!email?.trim()) errors.push('Email is required')
  if (!EMAIL_REGEX.test(email)) errors.push('Invalid email format')
  if (!role || !ALLOWED_ROLES.includes(role)) errors.push('Invalid role')

  return errors
}

const createSupabaseAdmin = () => {
  // Get the site URL, ensuring no trailing slash
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
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

const checkAdminAccess = async (supabase) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    const { data: userInfo, error: userInfoError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userInfoError) throw userInfoError
    if (userInfo.role !== 'admin') {
      throw { status: 403, message: 'Only administrators can create new users' }
    }

    return user
  } catch (error) {
    throw {
      status: error.status || 403,
      message: error.message || 'Unauthorized access'
    }
  }
}

export async function POST(request) {
  try {
    const requestData = await request.json()
    const { firstName, lastName, email, role } = requestData

    // Validate input
    const validationErrors = validateUserInput({ firstName, lastName, email, role })
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Check if user has admin access
    const supabase = createRouteHandlerClient({ cookies })
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
      throw {
        status: inviteError.status || 500,
        message: inviteError.message || 'Error sending invitation'
      }
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
        throw {
          status: updateError.status || 500,
          message: updateError.message || 'Error updating user info'
        }
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
        throw {
          status: createError.status || 500,
          message: createError.message || 'Error creating user info'
        }
      }
    }

    return NextResponse.json({
      message: 'User invited successfully',
      user: data.user
    })
  } catch (error) {
    console.error('Error in POST /api/users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// GET method to fetch users (admin only)
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    const { data: users, error } = await supabase
      .from('user_info')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
