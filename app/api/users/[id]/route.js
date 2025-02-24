import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Constants
const ALLOWED_ROLES = ['admin', 'user']

// Helper functions
const validateUpdateInput = (data) => {
  const { firstName, lastName, role } = data
  const errors = []

  if (!firstName?.trim()) errors.push('First name is required')
  if (!lastName?.trim()) errors.push('Last name is required')
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
      throw { status: 403, message: 'Only administrators can modify users' }
    }

    return user
  } catch (error) {
    throw {
      status: error.status || 403,
      message: error.message || 'Unauthorized access'
    }
  }
}

const validateUserId = async (adminClient, userId) => {
  const { data, error } = await adminClient
    .from('user_info')
    .select('id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw { status: 404, message: 'User not found' }
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    // Validate request body
    const updateData = await request.json()
    const validationErrors = validateUpdateInput(updateData)
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    const { firstName, lastName, role } = updateData
    const adminAuthClient = createSupabaseAdmin()

    // Validate user exists
    await validateUserId(adminAuthClient, params.id)

    // Update user info
    const { error: updateError } = await adminAuthClient
      .from('user_info')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      throw {
        status: 500,
        message: 'Error updating user information'
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: params.id,
        firstName,
        lastName,
        role
      }
    })
  } catch (error) {
    console.error('Error in PUT /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    const adminAuthClient = createSupabaseAdmin()

    // Validate user exists
    await validateUserId(adminAuthClient, params.id)

    // Begin transaction-like operations
    // First delete from user_info table
    const { error: deleteUserInfoError } = await adminAuthClient
      .from('user_info')
      .delete()
      .eq('id', params.id)

    if (deleteUserInfoError) {
      throw {
        status: 500,
        message: 'Error deleting user information'
      }
    }

    // Then delete from auth.users
    const { error: deleteAuthError } = await adminAuthClient.auth.admin.deleteUser(
      params.id
    )

    if (deleteAuthError) {
      // Attempt to rollback user_info deletion
      try {
        await adminAuthClient
          .from('user_info')
          .insert({
            id: params.id,
            role: 'user' // Default role as fallback
          })
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError)
      }

      throw {
        status: 500,
        message: 'Error deleting user authentication'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User successfully deleted'
    })
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// GET single user
export async function GET(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    const { data: user, error } = await supabase
      .from('user_info')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !user) {
      throw { status: 404, message: 'User not found' }
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
