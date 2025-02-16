import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request) {
  try {
    const { email } = await request.json()

    // First get the user from auth.users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1,
      page: 1,
      emailFilter: email
    })
    
    if (listError) {
      return Response.json({ error: listError.message }, { status: 400 })
    }

    if (users && users.length > 0) {
      // Delete from auth.users
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(users[0].id)
      
      if (authDeleteError) {
        return Response.json({ error: authDeleteError.message }, { status: 400 })
      }

      // Wait a short moment to ensure deletion is processed
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Delete from user_info table
    const { error: deleteInfoError } = await supabaseAdmin
      .from('user_info')
      .delete()
      .eq('email', email)

    if (deleteInfoError) {
      return Response.json({ error: deleteInfoError.message }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
