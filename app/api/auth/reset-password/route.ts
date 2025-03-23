import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request): Promise<Response> {
  try {
    const { email } = await request.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get the site URL from request origin
    const siteUrl = new URL(request.url).origin

    // Send the reset password email
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password/update`,
    })

    if (error) {
      console.error('Reset password error:', error)
      return new Response(JSON.stringify({ 
        error: 'Failed to send reset password email. Please try again.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Log success for debugging
    console.log('Reset password email sent successfully', {
      email,
      redirectUrl: `${siteUrl}/reset-password/update`
    })

    return new Response(JSON.stringify({ 
      message: 'Password reset instructions sent to your email. Please check your inbox and spam folder.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Internal server error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process reset password request. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
} 