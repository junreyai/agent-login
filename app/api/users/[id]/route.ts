import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Constants
const ALLOWED_ROLES = ['admin', 'user'] as const
type Role = typeof ALLOWED_ROLES[number]

interface UpdateInput {
  firstName: string
  lastName: string
  role: Role
}

interface CustomError extends Error {
  status?: number
}

interface RouteParams {
  params: {
    id: string
  }
}

// Helper functions
const validateUpdateInput = (data: Partial<UpdateInput>): string[] => {
  const { firstName, lastName, role } = data
  const errors: string[] = []

  if (!firstName?.trim()) errors.push('First name is required')
  if (!lastName?.trim()) errors.push('Last name is required')
  if (!role || !ALLOWED_ROLES.includes(role)) errors.push('Invalid role')

  return errors
}

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey
  )
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
      const error = new Error('Only administrators can modify users') as CustomError
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

const validateUserId = async (adminClient: ReturnType<typeof createSupabaseAdmin>, userId: string): Promise<void> => {
  const { data, error } = await adminClient
    .from('user_info')
    .select('id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    const customError = new Error('User not found') as CustomError
    customError.status = 404
    throw customError
  }
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
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

    const { firstName, lastName, role } = updateData as UpdateInput
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
      const error = new Error('Error updating user information') as CustomError
      error.status = 500
      throw error
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
  } catch (error: any) {
    console.error('Error in PUT /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
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
      const error = new Error('Error deleting user information') as CustomError
      error.status = 500
      throw error
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

      const error = new Error('Error deleting user authentication') as CustomError
      error.status = 500
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'User successfully deleted'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// GET single user
export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify admin access
    await checkAdminAccess(supabase)

    const { data: user, error } = await supabase
      .from('user_info')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !user) {
      const customError = new Error('User not found') as CustomError
      customError.status = 404
      throw customError
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 