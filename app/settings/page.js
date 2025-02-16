'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import speakeasy from 'speakeasy'
import Toast from '@/components/Toast'

const Settings = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [secret, setSecret] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const qrCanvasRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      
      if (!session) {
        router.push('/login')
        return
      }

      // Get user info from localStorage
      const storedUserInfo = localStorage.getItem('userInfo')
      if (!storedUserInfo) {
        router.push('/login')
        return
      }

      const parsedUserInfo = JSON.parse(storedUserInfo)
      setSession(session)

      // Fetch current user's full info
      const { data: userData, error: userError } = await supabase
        .from('user_info')
        .select('*')
        .eq('email', parsedUserInfo.email)
        .single()

      if (userError) throw userError
      setUserInfo(userData)
    } catch (error) {
      console.error('Error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      }
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const enableMFA = async () => {
    try {
      setLoading(true)
      setError(null)

      // Generate new secret
      const secret = speakeasy.generateSecret({ 
        name: userInfo.email,
        issuer: 'AgentLogin'
      })
      
      // Create URL in Google Authenticator format
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(userInfo.email)}?secret=${secret.base32}&issuer=AgentLogin`

      // Generate QR code URL using QRServer
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`

      setSecret(secret.base32)
      setQrCodeDataUrl(qrCodeUrl)
      setShowQR(true)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnableMFA = async () => {
    if (!verificationCode || !secret) return

    try {
      setLoading(true)
      setError(null)

      // Verify TOTP
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: verificationCode
      })

      if (!verified) {
        throw new Error('Invalid verification code')
      }

      // Update user_info table with the secret and MFA status
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ 
          mfa: true,
          mfa_secret: secret 
        })
        .eq('email', userInfo.email)

      if (updateError) throw updateError

      // Update local storage
      const updatedUserInfo = { ...userInfo, mfa: true }
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
      setUserInfo(updatedUserInfo)
      setShowQR(false)
      setSecret(null)
      setQrCodeDataUrl(null)
      setVerificationCode('')

      showToast('MFA enabled successfully')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match')
      showToast('New passwords do not match', 'error')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      showToast('New password must be at least 6 characters long', 'error')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userInfo.email,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error)
      }

      setSuccess('Password updated successfully')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      showToast('Password updated successfully')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {session && userInfo ? (
            <div className="min-h-screen bg-gray-100 p-8">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="flex items-center text-blue-600 hover:text-blue-700 transition duration-200"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Dashboard
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-600">{success}</p>
                    </div>
                  )}

                  <div className="flex gap-6">
                    {/* Password Update Section */}
                    <div className="bg-white rounded-lg shadow-sm p-6 flex-1 border-2">
                      <h2 className="text-xl font-semibold text-blue-900 mb-4">Update Password</h2>
                      <form onSubmit={updatePassword} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({
                              ...prev,
                              currentPassword: e.target.value
                            }))}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({
                              ...prev,
                              newPassword: e.target.value
                            }))}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({
                              ...prev,
                              confirmPassword: e.target.value
                            }))}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                        >
                          Update Password
                        </button>
                      </form>
                    </div>

                    {/* MFA Section */}
                    <div className="bg-white rounded-lg shadow-sm p-6 flex-1 border-2">
                      <h2 className="text-xl font-semibold text-blue-900 mb-4">Two-Factor Authentication</h2>
                      {userInfo.mfa ? (
                        <div className="flex items-center justify-center space-x-2 bg-green-50 p-4 rounded-lg border border-green-200">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-700 font-medium">MFA is enabled for your account</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {!showQR ? (
                            <div className="text-center">
                              <p className="text-blue-600 mb-4">
                                Enable two-factor authentication to add an extra layer of security to your account.
                              </p>
                              <button
                                onClick={enableMFA}
                                disabled={loading}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                              >
                                {loading ? 'Loading...' : 'Enable MFA'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="text-center">
                                <h3 className="text-lg font-medium text-blue-900 mb-2">Scan QR Code</h3>
                                <p className="text-blue-600 mb-4">
                                  Use an authenticator app like Google Authenticator or Authy to scan this QR code
                                </p>
                              </div>
                              <div className="flex justify-center">
                                <div className="p-4 bg-white border rounded-lg shadow-sm">
                                  {qrCodeDataUrl && (
                                    <img 
                                      src={qrCodeDataUrl}
                                      alt="QR Code"
                                      width={200}
                                      height={200}
                                      style={{ display: 'block' }}
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <p className="text-sm text-blue-600 text-center">
                                  If you can't scan the QR code, enter this code manually:
                                </p>
                                <div className="mt-4">
                                  <input
                                    type="text"
                                    value={secret}
                                    readOnly
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 font-mono"
                                  />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Enter 6-digit code"
                                  value={verificationCode}
                                  onChange={(e) => setVerificationCode(e.target.value)}
                                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center bg-gray-50 text-gray-900"
                                />
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => {
                                      setShowQR(false)
                                      setVerificationCode('')
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-blue-900 hover:bg-gray-50 transition duration-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={verifyAndEnableMFA}
                                    disabled={!verificationCode || loading}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                                  >
                                    Enable
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default Settings
