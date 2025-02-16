import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request) {
  try {
    const { email, currentPassword, newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return Response.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    // Verify current password
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Get user by email
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    const user = users?.find(u => u.email === email)

    if (getUserError || !user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Update password in auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateAuthError) {
      return Response.json({ error: updateAuthError.message }, { status: 400 })
    }

    // Update password in user_info table
    const { error: updateUserError } = await supabaseAdmin
      .from('user_info')
      .update({ password: newPassword })
      .eq('email', email)

    if (updateUserError) {
      return Response.json({ error: updateUserError.message }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
