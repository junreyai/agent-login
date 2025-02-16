import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request) {
  try {
    const { email, password, firstName, lastName, role } = await request.json()

    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    try {
      console.log('Creating user:', email)
      console.log('Password length:', password.length)

      // Delete any existing records in user_info
      await supabaseAdmin
        .from('user_info')
        .delete()
        .eq('email', email)

      // Delete existing user if it exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const userToDelete = existingUser?.users?.find(u => u.email === email)
      if (userToDelete) {
        await supabaseAdmin.auth.admin.deleteUser(userToDelete.id)
      }

      // Create user with admin client
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role
        },
        email_confirm: true
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return Response.json({ error: createError.message }, { status: 400 })
      }

      // Explicitly set the password using signUp
      const { error: signUpError } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      })

      if (signUpError) {
        console.error('Error setting password:', signUpError)
        return Response.json({ error: signUpError.message }, { status: 400 })
      }

      console.log('User created in auth system:', authData.user.id)

      // Add user info to user_info table
      const { error: userError } = await supabaseAdmin
        .from('user_info')
        .insert([
          {
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: role,
            mfa: false,
            password: password,
            created_at: new Date().toISOString()
          }
        ])

      if (userError) {
        console.error('Error creating user info:', userError)
        // If there's an error, clean up the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return Response.json({ error: userError.message }, { status: 400 })
      }

      return Response.json({ 
        success: true,
        user: {
          id: authData.user.id,
          email: email,
          firstName,
          lastName,
          role
        }
      })
    } catch (error) {
      console.error('Unexpected error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
