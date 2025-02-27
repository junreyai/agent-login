'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner, ButtonLoader } from '../components/LoadingComponents'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showMFAPrompt, setShowMFAPrompt] = useState(false)
  const [factorId, setFactorId] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const setupMFA = searchParams.get('setup_mfa')
    if (setupMFA) {
      checkMFAEnrollment()
    }

    // Add keyframes for the ellipsis animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ellipsis {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
    `;
    document.head.appendChild(style);

    // Check for invitation hash in URL
    const handleInvitation = async () => {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        try {
          // Parse the hash
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const type = hashParams.get('type')

          if (type === 'invite' && accessToken) {
            // If we're on localhost and NEXT_PUBLIC_SITE_URL is set, redirect to production
            if (window.location.hostname === 'localhost' && process.env.NEXT_PUBLIC_SITE_URL) {
              const productionUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL)
              productionUrl.pathname = '/login'
              productionUrl.hash = window.location.hash
              window.location.href = productionUrl.toString()
              return
            }

            // Set the session using the tokens
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (error) {
              console.error('Session error:', error)
              throw error
            }

            if (!session) {
              throw new Error('No session after setting tokens')
            }

            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname)

            // Redirect to set password page
            router.push('/set-password')
            return
          }
        } catch (error) {
          console.error('Error handling invitation:', error)
          setError(error.message || 'Error processing invitation link')
        }
      }
    }

    handleInvitation()

    // Cleanup style element on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, [])

  const checkMFAEnrollment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get MFA enrollment status
      const { data: { factors }, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error

      const totpFactor = factors?.find(factor => factor.factor_type === 'totp')
      if (totpFactor?.status === 'verified') {
        router.push('/dashboard')
      } else if (totpFactor) {
        setFactorId(totpFactor.id)
        setShowMFAPrompt(true)
      }
    } catch (error) {
      console.error('Error checking MFA enrollment:', error)
      setError(error.message)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // First check if the user has MFA enabled
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: true // Ensure session persistence
        }
      })
      
      if (signInError) throw signInError

      // Check if we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      
      if (!session) {
        throw new Error('No session established after login')
      }

      const { data: { user } } = await supabase.auth.getUser()
      console.log('User data:', user)

      // Create empty user_info record if it doesn't exist
      const { data: existingUserInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUserInfo) {
        const { error: insertError } = await supabase
          .from('user_info')
          .insert([
            {
              id: user.id,
              first_name: '',
              last_name: '',
              email: user.email,
              mfa_enabled: false,
              role: ''
            }
          ])
        if (insertError) throw insertError
      }

      // Check if user has verified MFA factors
      const verifiedMFAFactor = user?.factors?.find(factor => 
        factor.factor_type === 'totp' && 
        factor.status === 'verified'
      )

      if (verifiedMFAFactor) {
        // Don't sign out, just show the MFA prompt
        console.log('MFA is required, showing prompt')
        setFactorId(verifiedMFAFactor.id)
        setShowMFAPrompt(true)
      } else {
        // No MFA required, proceed to dashboard
        console.log('No MFA required, proceeding to dashboard')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMFA = async (e) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create MFA challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      })
      if (challengeError) throw challengeError

      console.log('MFA Challenge created:', challenge)

      // Verify the challenge
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verificationCode
      })
      if (verifyError) throw verifyError

      console.log('MFA Verification successful:', data)

      // Check session after verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (!session) {
        throw new Error('Session not found after MFA verification')
      }

      // Get user and ensure user_info record exists
      const { data: { user } } = await supabase.auth.getUser()
      const { data: existingUserInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUserInfo) {
        const { error: insertError } = await supabase
          .from('user_info')
          .insert([
            {
              id: user.id,
              first_name: '',
              last_name: '',
              email: user.email,
              mfa_enabled: false,
              role: ''
            }
          ])
        if (insertError) throw insertError
      }

      // If verification successful and session exists, redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('MFA verification error:', error)
      setError(error.message)
      setVerificationCode('')
      
      // If there's an error, try to sign out to clean up any partial session
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Welcome Back
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
          Sign in to your account to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!showMFAPrompt ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Enter your password"
                />
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => router.push('/reset-password')}
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <ButtonLoader color="blue" className="mr-2" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyMFA}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Authentication Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <ButtonLoader color="blue" className="mr-2" />
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-white dark:bg-gray-800 flex items-center justify-center">
        <LoadingSpinner size="md" color="blue" text="Loading..." />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
