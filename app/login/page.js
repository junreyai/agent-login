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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-opacity-90 backdrop-blur-sm p-4">
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-filter backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-800 mb-2">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="py-8 px-4 sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-gray-50 text-gray-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || showMfaInput}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-gray-50 text-gray-900"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || showMfaInput}
                  />
                </div>
              </div>

              {showMfaInput && (
                <div className="rounded-md shadow-sm">
                  <label htmlFor="mfa" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter MFA Code
                  </label>
                  <input
                    id="mfa"
                    name="mfa"
                    type="text"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-gray-50 text-gray-900"
                    placeholder="Enter 6-digit code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                    loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
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
  )
}

export default Login