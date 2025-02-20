'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMFASetup, setShowMFASetup] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [factorId, setFactorId] = useState(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const checkMFAStatus = async () => {
    try {
      const { data: { factors }, error: mfaError } = await supabase.auth.mfa.listFactors()
      if (mfaError) throw mfaError
      
      const hasMFA = factors?.totp?.some(factor => factor.status === 'verified')
      setMfaEnabled(hasMFA)

      // Clean up any unverified factors
      const unverifiedFactors = factors?.totp?.filter(factor => factor.status === 'unverified') || []
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
    } catch (error) {
      console.error('Error checking MFA status:', error)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)
        await checkMFAStatus()
      } catch (error) {
        console.error('Error getting user:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSetupMFA = async () => {
    try {
      setError(null)
      
      // First clean up any existing unverified factors
      await checkMFAStatus()

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      })
      if (error) throw error

      setFactorId(data.id)
      const qrCode = await QRCode.toDataURL(data.totp.uri)
      setQrCodeUrl(qrCode)
      setShowMFASetup(true)
    } catch (error) {
      console.error('Error setting up MFA:', error)
      setError(error.message)
    }
  }

  const handleCancelMFA = async () => {
    try {
      if (factorId) {
        await supabase.auth.mfa.unenroll({ factorId })
      }
      setShowMFASetup(false)
      setQrCodeUrl(null)
      setVerificationCode('')
      setError(null)
      setFactorId(null)
      await checkMFAStatus()
    } catch (error) {
      console.error('Error canceling MFA setup:', error)
      setError(error.message)
    }
  }

  const handleVerifyMFA = async (e) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    try {
      setError(null)
      // First create a challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      // Then verify the challenge
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verificationCode,
      })
      if (verifyError) throw verifyError

      setMfaEnabled(true)
      setShowMFASetup(false)
      setQrCodeUrl(null)
      setVerificationCode('')
      setFactorId(null)
    } catch (error) {
      console.error('Error verifying MFA:', error)
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">User Information</h2>
              <p className="mt-1 text-sm text-gray-500">Email: {user?.email}</p>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
              <div className="mt-4">
                {!mfaEnabled && !showMFASetup && (
                  <>
                    <button
                      onClick={handleSetupMFA}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Set Up Two-Factor Authentication
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      Enhance your account security by enabling two-factor authentication.
                    </p>
                  </>
                )}

                {mfaEnabled && (
                  <div className="text-sm text-green-600 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Two-factor authentication is enabled
                  </div>
                )}

                {showMFASetup && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Set up Two-Factor Authentication</h3>
                    
                    {qrCodeUrl && (
                      <div className="mb-6">
                        <p className="text-sm text-gray-600 mb-4">
                          1. Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy)
                        </p>
                        <div className="flex justify-center">
                          <img src={qrCodeUrl} alt="QR Code" className="max-w-[200px]" />
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleVerifyMFA} className="space-y-4">
                      <div>
                        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                          2. Enter the verification code from your authenticator app
                        </label>
                        <input
                          type="text"
                          id="verificationCode"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Enter 6-digit code"
                        />
                      </div>

                      {error && (
                        <div className="text-sm text-red-600">
                          {error}
                        </div>
                      )}

                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Verify and Enable 2FA
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelMFA}
                          className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
