import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
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
        { error: 'Only administrators can create new users' },
        { status: 403 }
      )
    }

    // Get request body
    const { firstName, lastName, email, password, role } = await request.json()

    // Create admin client with service role
    const adminAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createError) throw createError

    // Update user info using admin client
    const { error: updateError } = await adminAuthClient
      .from('user_info')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role
      })
      .eq('id', newUser.user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, user: newUser.user })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    )
  }
}
