import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Constants
const ALLOWED_ROLES = ['admin', 'user']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Helper functions
const validateUserInput = (data) => {
  const { firstName, lastName, email, password, role } = data
  const errors = []

  if (!firstName?.trim()) errors.push('First name is required')
  if (!lastName?.trim()) errors.push('Last name is required')
  if (!email?.trim()) errors.push('Email is required')
  if (!EMAIL_REGEX.test(email)) errors.push('Invalid email format')
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters')
  if (!role || !ALLOWED_ROLES.includes(role)) errors.push('Invalid role')

  return errors
}

const createSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    // Validate request body
    const userData = await request.json()
    const validationErrors = validateUserInput(userData)
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password, role } = userData

    // Create user with admin client
    const adminAuthClient = createSupabaseAdmin()

    // Create user in auth.users
    const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (createError) {
      throw {
        status: createError.status || 500,
        message: createError.message || 'Error creating user'
      }
    }

    // Update user info
    const { error: updateError } = await adminAuthClient
      .from('user_info')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role
      })
      .eq('id', newUser.user.id)

    if (updateError) {
      // Rollback user creation if user_info update fails
      await adminAuthClient.auth.admin.deleteUser(newUser.user.id)
      throw {
        status: 500,
        message: 'Error updating user information'
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        firstName,
        lastName,
        role
      }
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
