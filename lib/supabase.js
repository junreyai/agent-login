import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Get the site URL, ensuring no trailing slash
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 
                (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'))
                .replace(/\/$/, '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-site-url': siteUrl
    }
  }
})