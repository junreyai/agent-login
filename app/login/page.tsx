'use client'

import { useState, useEffect, FormEvent, Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner, ButtonLoader } from '../components/LoadingComponents'
import { updateLastLogin, checkFirstTimeLogin } from '@/app/utils/userUtils'
import type { Database } from '@/lib/database.types'

function LoginContent() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [showMFAPrompt, setShowMFAPrompt] = useState<boolean>(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const setupMFA = searchParams.get('setup_mfa')
    if (setupMFA) {
      checkMFAEnrollment()
    }

    // Add keyframes for the ellipsis animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes ellipsis {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
    `
    document.head.appendChild(style)

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
            setLoading(true)
            const { data: { user }, error: signInError } = await supabase.auth.getUser()
            
            if (signInError) throw signInError

            if (user) {
              const isFirstTimeLogin = await checkFirstTimeLogin(user.id)
              if (isFirstTimeLogin) {
                router.push('/set-password')
              } else {
                router.push('/dashboard')
              }
            }
          }
        } catch (err) {
          console.error('Error handling invitation:', err)
          setError('Error processing invitation. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    }

    handleInvitation()

    return () => {
      // Cleanup style element
      style.remove()
    }
  }, [searchParams, router, supabase])

  const checkMFAEnrollment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const hasTOTP = factors?.totp && factors.totp.length > 0
        
        if (!hasTOTP) {
          router.push('/2fa-setup')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      console.error('Error checking MFA enrollment:', err)
      setError('Error checking MFA status. Please try again.')
    }
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      // Validate email and password before attempting sign in
      if (!email.trim() || !password.trim()) {
        throw new Error('Please enter both email and password')
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Provide more user-friendly error messages
        if (signInError.message === 'Invalid login credentials') {
          throw new Error('The email or password you entered is incorrect. Please try again.')
        } else if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in.')
        } else {
          throw signInError
        }
      }

      if (data?.user) {
        // Check for MFA enrollment
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const hasTOTP = factors?.totp && factors.totp.length > 0

        if (hasTOTP) {
          // If MFA is enabled, show the verification prompt
          const challenge = await supabase.auth.mfa.challenge({ factorId: factors.totp[0].id })
          if (challenge.error) throw challenge.error
          
          setFactorId(factors.totp[0].id)
          setChallengeId(challenge.data.id)
          setShowMFAPrompt(true)
        } else {
          // If no MFA, proceed with normal login
          const isFirstTimeLogin = await checkFirstTimeLogin(data.user.id)
          if (isFirstTimeLogin) {
            router.push('/set-password')
          } else {
            await updateLastLogin(data.user.id)
            router.push('/dashboard')
          }
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'An error occurred during sign in. Please try again.')
    } finally {
      if (!showMFAPrompt) {
        setLoading(false)
      }
    }
  }

  const handleVerifyMFA = async (e: FormEvent) => {
    e.preventDefault()
    if (!factorId || !challengeId) return

    try {
      setLoading(true)
      setError(null)

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verificationCode,
      })

      if (verifyError) throw verifyError

      if (verifyData) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await updateLastLogin(user.id)
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      console.error('MFA verification error:', err)
      setError(err.message || 'Error verifying MFA code')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !showMFAPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading<span className="animate-ellipsis"></span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {showMFAPrompt ? 'Enter 2FA Code' : 'Sign in to your account'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={showMFAPrompt ? handleVerifyMFA : handleSignIn}>
          {!showMFAPrompt ? (
            <>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email-address" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
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
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                    placeholder="Password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <ButtonLoader color="white" size="small" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="verification-code" className="sr-only">
                  Verification Code
                </label>
                <input
                  id="verification-code"
                  name="code"
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                  placeholder="Enter 6-digit code"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !verificationCode}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <ButtonLoader color="white" size="small" className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/reset-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Forgot your password?
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="large" />}>
      <LoginContent />
    </Suspense>
  )
} 