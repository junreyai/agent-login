'use client'

import { useState, FormEvent, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'
import Image from 'next/image'
import Logo from '@/public/assets/Logo.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showMFAPrompt, setShowMFAPrompt] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient<Database>()

  // Check if we're already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      }
    }
    checkSession()
  }, [supabase.auth, router])

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (session) {
        // Get the redirect URL from query params or default to dashboard
        const redirectTo = searchParams.get('redirect') || '/dashboard'
        router.replace(redirectTo)
      } else if (user && !user.email_confirmed_at) {
        setError('Please verify your email address')
        setIsLoading(false)
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleVerifyMFA = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email',
      })

      if (error) throw error

      if (session) {
        const redirectTo = searchParams.get('redirect') || '/dashboard'
        router.replace(redirectTo)
      } else {
        throw new Error('Verification failed')
      }
    } catch (error: any) {
      console.error('MFA verification error:', error)
      setError(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8 text-center">
            <Image
              src={Logo}
              alt="Next-Login Logo"
              width={150}
              height={150}
              className="mx-auto"
            />
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to your account
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-md p-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={showMFAPrompt ? handleVerifyMFA : handleSignIn}>
            <div className="space-y-6">
              {!showMFAPrompt ? (
                <>
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      disabled={isLoading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-rose-400 text-white py-2 px-4 rounded-md hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>

                  <div className="text-center">
                    <Link
                      href="/reset-password"
                      className={`text-sm text-rose-500 hover:text-rose-600 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="verificationCode" className="block mb-2 text-sm font-medium text-gray-700">
                      Verification Code
                    </label>
                    <input
                      id="verificationCode"
                      name="verificationCode"
                      type="text"
                      required
                      disabled={isLoading}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                      placeholder="Enter verification code"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-rose-400 text-white py-2 px-4 rounded-md hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 