import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user's session to verify admin status
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the user is an admin by checking the user_info table
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError || !userInfo || userInfo.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // First delete from user_info table using admin client
    const { error: profileError } = await supabaseAdmin
      .from('user_info')
      .delete()
      .eq('id', params.id)

    if (profileError) {
      return NextResponse.json(
        { error: `Database error: ${profileError.message}` },
        { status: 400 }
      )
    }

    // Then delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      params.id
    )

    if (deleteError) {
      // Try to rollback user_info deletion if auth deletion fails
      try {
        const { data: oldUserInfo } = await supabaseAdmin
          .from('user_info')
          .select('*')
          .eq('id', params.id)
          .single()

        if (oldUserInfo) {
          await supabaseAdmin
            .from('user_info')
            .insert(oldUserInfo)
        }
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError)
      }

      return NextResponse.json(
        { error: `Auth error: ${deleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error in user deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user's session to verify admin status
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the user is an admin by checking the user_info table
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError || !userInfo || userInfo.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get the user data from the request
    const userData = await request.json()
    const { firstName, lastName, role } = userData

    // Validate required fields
    if (!firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update user_info table using admin client
    const { error: updateError } = await supabaseAdmin
      .from('user_info')
      .update({
        first_name: firstName,
        last_name: lastName,
        role
      })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json(
        { error: `Database error: ${updateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 