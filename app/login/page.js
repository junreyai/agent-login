'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
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
      })
      
      if (signInError) throw signInError

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
              role: ''            }
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
              role: 'user'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showMFAPrompt ? 'Enter Authentication Code' : 'Sign in to your account'}
          </h2>
        </div>

        {!showMFAPrompt ? (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyMFA}>
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                Enter the 6-digit code from your authenticator app
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter 6-digit code"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
