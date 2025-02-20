import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PUT(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    // Get user info to check role
    const { data: userInfo, error: userInfoError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userInfoError) throw userInfoError

    if (userInfo.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can update users' },
        { status: 403 }
      )
    }

    // Get request body
    const { firstName, lastName, role } = await request.json()

    // Create admin client
    const adminAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Update user info
    const { error: updateError } = await adminAuthClient
      .from('user_info')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role
      })
      .eq('id', params.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    // Get user info to check role
    const { data: userInfo, error: userInfoError } = await supabase
      .from('user_info')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userInfoError) throw userInfoError

    if (userInfo.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can delete users' },
        { status: 403 }
      )
    }

    // Create admin client
    const adminAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // First delete from user_info table
    const { error: deleteUserInfoError } = await adminAuthClient
      .from('user_info')
      .delete()
      .eq('id', params.id)

    if (deleteUserInfoError) throw deleteUserInfoError

    // Then delete from auth.users
    const { error: deleteAuthError } = await adminAuthClient.auth.admin.deleteUser(
      params.id
    )

    if (deleteAuthError) throw deleteAuthError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'Database error deleting user' },
      { status: error.status || 500 }
    )
  }
}
