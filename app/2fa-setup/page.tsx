'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import QRCode from 'qrcode'
import SuccessModal from '@/app/components/SuccessModal'
import { PageLoading, ButtonLoader } from '@/app/components/LoadingComponents'
import useUser from '@/app/utils/useUser'
import type { Database } from '@/lib/database.types'

interface SuccessModalState {
  isOpen: boolean
  title: string
  message: string
}

interface MFAFactor {
  id: string
  status: 'verified' | 'unverified'
  factor_type: 'totp'
  [key: string]: any
}

interface TOTPResponse {
  qr_code: string
  secret: string
  uri: string
}

interface MFAEnrollResponse {
  id: string
  totp: TOTPResponse
}

export default function TwoFactorSetupPage() {
  // Router and Supabase client initialization
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  // Use our custom hook for user data
  const { user, loading, error: userError, refreshUser } = useUser()

  // Error state
  const [error, setError] = useState<string | null>(null)

  // MFA related states
  const [showMFASetup, setShowMFASetup] = useState<boolean>(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [showDisableMFAModal, setShowDisableMFAModal] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [hasVerifiedMFA, setHasVerifiedMFA] = useState<boolean>(false)

  // Modal states
  const [successModal, setSuccessModal] = useState<SuccessModalState>({
    isOpen: false,
    title: '',
    message: ''
  })

  // Check if user has MFA factors
  useEffect(() => {
    const checkMFAFactors = async () => {
      if (!user) return
      
      try {
        const { data: factors, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        
        // Check if user has any verified TOTP factors
        const verifiedFactors = factors.totp.filter(factor => factor.status === 'verified')
        setHasVerifiedMFA(verifiedFactors.length > 0)
        
        if (verifiedFactors.length > 0) {
          // Store the verified factor ID for potential disabling
          setFactorId(verifiedFactors[0].id)
        }
      } catch (error: any) {
        console.error('Error checking MFA factors:', error)
        setError('Failed to check MFA status. Please try again.')
      }
    }
    
    if (user) {
      checkMFAFactors()
    }
  }, [user, supabase])

  const generateQRCode = async (qrData: string): Promise<string> => {
    return QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  }

  // MFA handlers
  const handleSetupMFA = async () => {
    if (!user) {
      setError('User authentication required')
      return
    }

    try {
      setError(null)
      setShowMFASetup(false)
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      })
      
      if (error) throw error
      
      // Debug log the TOTP data
      console.log('TOTP Response:', {
        uri: data?.totp?.uri,
        secret: data?.totp?.secret,
        hasQRCode: !!data?.totp?.qr_code
      })
      
      if (!data?.totp?.uri) throw new Error('Invalid TOTP response')
      
      setFactorId(data.id)
      
      // Generate QR code using the TOTP URI
      try {
        console.log('Generating QR code for URI:', data.totp.uri)
        const qrCode = await generateQRCode(data.totp.uri)
        console.log('QR code generated successfully')
        setQrCodeUrl(qrCode)
        setShowMFASetup(true)
      } catch (err) {
        // If QR code fails, show secret instead
        console.error('QR Code generation failed:', err)
        setQrCodeUrl(null)
        if (data.totp.secret) {
          setError(`Please use this code manually: ${data.totp.secret}`)
          setShowMFASetup(true)
        } else {
          throw new Error('Failed to get 2FA setup information')
        }
      }
    } catch (err: any) {
      console.error('MFA setup error:', err)
      setError(err.message || 'Failed to set up 2FA')
      setShowMFASetup(false)
      setQrCodeUrl(null)
    }
  }

  const handleDisableMFA = async () => {
    try {
      if (!factorId) {
        throw new Error('No verified MFA factor found')
      }

      setError(null)

      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error

      setShowDisableMFAModal(false)
      await refreshUser()

      setSuccessModal({
        isOpen: true,
        title: '2FA Successfully Disabled',
        message: 'Two-factor authentication has been disabled for your account.'
      })
    } catch (error: any) {
      console.error('Error disabling MFA:', error)
      setError('Failed to disable MFA. Please try again.')
    }
  }

  const handleCancelMFA = async () => {
    try {
      if (factorId) {
        await supabase.auth.mfa.unenroll({ factorId })
      }
      resetMFAState()
      await refreshUser()
    } catch (error: any) {
      console.error('Error canceling MFA setup:', error)
      setError('Failed to cancel MFA setup. Please try again.')
    }
  }

  const handleVerifyMFA = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateVerificationCode(verificationCode)) {
      setError('Please enter a valid 6-digit code')
      return
    }

    try {
      if (!factorId) {
        throw new Error('No MFA factor found')
      }

      setError(null)
      setIsVerifying(true)
      
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verificationCode,
      })
      if (verifyError) throw verifyError

      setSuccessModal({
        isOpen: true,
        title: '2FA Successfully Enabled',
        message: 'Two-factor authentication has been enabled for your account.'
      })

      resetMFAState()
      await refreshUser()
    } catch (error: any) {
      console.error('Error verifying MFA:', error)
      setError('Failed to verify MFA code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Helper functions
  const resetMFAState = () => {
    setShowMFASetup(false)
    setQrCodeUrl(null)
    setVerificationCode('')
    setError(null)
    setFactorId(null)
  }

  const validateVerificationCode = (code: string): boolean => {
    return Boolean(code && code.length === 6 && /^\d+$/.test(code))
  }

  if (loading) {
    return (
      <PageLoading message="Loading 2FA setup..." />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-800 dark:text-blue-300 text-center">Two-Factor Authentication</h1>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6 border border-blue-100 dark:border-blue-900/50 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 text-center">
            {hasVerifiedMFA ? 'Manage 2FA' : 'Enable 2FA'}
          </h2>
          
          {error && (
            <div className="p-3 rounded-md mb-4 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-center">
              {error}
            </div>
          )}
          
          {hasVerifiedMFA ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Two-factor authentication is currently <span className="text-green-600 dark:text-green-400 font-semibold">enabled</span> for your account.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowDisableMFAModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Disable 2FA
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Protect your account with time-based one-time passwords (TOTP).
              </p>
              
              {!showMFASetup ? (
                <div className="flex justify-center">
                  <button
                    onClick={handleSetupMFA}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Setup 2FA
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Scan this QR code with your authenticator app:
                    </p>
                    {qrCodeUrl && (
                      <div className="flex justify-center mb-4">
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={handleVerifyMFA} className="space-y-4">
                    <div>
                      <label htmlFor="verification-code" className="sr-only">
                        Verification Code
                      </label>
                      <input
                        id="verification-code"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                      />
                    </div>
                    
                    <div className="flex justify-between space-x-4">
                      <button
                        type="button"
                        onClick={handleCancelMFA}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifying || !verificationCode}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <>
                            <ButtonLoader color="white" size="small" className="mr-2" />
                            Verifying...
                          </>
                        ) : (
                          'Verify'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => {
          setSuccessModal({ ...successModal, isOpen: false })
          router.push('/dashboard')
        }}
        message={successModal.message}
      />

      {/* Disable 2FA Confirmation Modal */}
      {showDisableMFAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Disable 2FA?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to disable two-factor authentication? This will make your account less secure.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDisableMFAModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMFA}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 