'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import speakeasy from 'speakeasy'
import Link from 'next/link'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showMfaInput, setShowMfaInput] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      console.log('Attempting login for:', normalizedEmail)

      // Attempt authentication first
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        console.error('Authentication error:', signInError)
        throw new Error('Invalid email or password')
      }

      if (!authData?.user) {
        console.error('No user data in auth response')
        throw new Error('Authentication failed')
      }

      console.log('Authentication successful, getting user info...')

      // Get user info after successful authentication
      const { data: userInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('*')
        .eq('email', normalizedEmail)
        .single()

      if (userInfoError) {
        console.error('Error fetching user info:', userInfoError)
        throw new Error('Could not retrieve user information')
      }

      if (!userInfo) {
        console.error('No user info found')
        throw new Error('User information not found')
      }

      // Check if MFA is enabled
      if (userInfo.mfa && userInfo.mfa_secret) {
        if (!showMfaInput) {
          console.log('MFA required, showing input...')
          setShowMfaInput(true)
          setLoading(false)
          return
        }

        console.log('Verifying MFA code...')
        const verified = speakeasy.totp.verify({
          secret: userInfo.mfa_secret,
          encoding: 'base32',
          token: mfaCode,
          window: 1
        })

        if (!verified) {
          throw new Error('Invalid MFA code')
        }
      }

      // Store user info in localStorage
      const userToStore = {
        id: userInfo.id,
        email: userInfo.email,
        role: userInfo.role,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name
      }
      localStorage.setItem('userInfo', JSON.stringify(userToStore))
      console.log('Login successful, redirecting to dashboard...')

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Login process failed:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-[pulse_3s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-xl animate-[pulse_3s_ease-in-out_infinite_0.7s]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-[pulse_3s_ease-in-out_infinite_1s]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8 backdrop-blur-md bg-slate-900/50 p-8 rounded-2xl shadow-2xl border border-blue-500/20">
          {error && (
            <div className="mb-4 text-center text-red-500 bg-red-100/10 rounded-lg p-3">
              {error}
            </div>
          )}
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white mb-2">
              Welcome Back
            </h2>
            <p className="mt-2 text-center text-sm text-blue-200">
              Sign in to your account
            </p>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="py-8 px-4 sm:rounded-lg sm:px-10">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-blue-200">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="block w-full appearance-none rounded-md border border-blue-500/30 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-slate-800/50 text-white"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || showMfaInput}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-blue-200">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="block w-full appearance-none rounded-md border border-blue-500/30 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-slate-800/50 text-white"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || showMfaInput}
                    />
                  </div>
                </div>

                {showMfaInput && (
                  <div className="rounded-md shadow-sm">
                    <label htmlFor="mfa" className="block text-sm font-medium text-blue-200 mb-2">
                      Enter MFA Code
                    </label>
                    <input
                      id="mfa"
                      name="mfa"
                      type="text"
                      required
                      className="block w-full appearance-none rounded-md border border-blue-500/30 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-slate-800/50 text-white"
                      placeholder="Enter 6-digit code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                      loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    {loading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : null}
                    {showMfaInput ? 'Verify MFA Code' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Login