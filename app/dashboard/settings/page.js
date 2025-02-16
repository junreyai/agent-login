'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'

const Settings = () => {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [secret, setSecret] = useState(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo')
    if (!storedUserInfo) {
      router.push('/login')
      return
    }
    setUserInfo(JSON.parse(storedUserInfo))
  }, [router])

  const generateSecret = async () => {
    setLoading(true)
    setError(null)
    try {
      // Generate a random secret (in a real app, use a proper TOTP library)
      const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      setSecret(randomSecret)
      
      // Generate QR code data URL
      const otpAuthUrl = `otpauth://totp/AgentLogin:${userInfo.email}?secret=${randomSecret}&issuer=AgentLogin`
      setQrCode(otpAuthUrl)
      setShowQR(true)
    } catch (error) {
      setError('Error generating 2FA secret')
      console.error('2FA setup error:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable2FA = async () => {
    setLoading(true)
    setError(null)
    try {
      // In a real app, verify the code against the secret using a TOTP library
      // For demo purposes, we'll just update the database
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ mfa: true })
        .eq('email', userInfo.email)

      if (updateError) throw updateError

      // Update local storage
      const updatedUserInfo = { ...userInfo, mfa: true }
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
      setUserInfo(updatedUserInfo)
      
      setShowQR(false)
      setSecret(null)
      setVerificationCode('')
      alert('2FA has been enabled successfully!')
    } catch (error) {
      setError('Error enabling 2FA')
      console.error('2FA verification error:', error)
    } finally {
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ mfa: false })
        .eq('email', userInfo.email)

      if (updateError) throw updateError

      // Update local storage
      const updatedUserInfo = { ...userInfo, mfa: false }
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
      setUserInfo(updatedUserInfo)
      
      alert('2FA has been disabled successfully!')
    } catch (error) {
      setError('Error disabling 2FA')
      console.error('2FA disable error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!userInfo) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Security Settings</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication (2FA)</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-500 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Status: <span className={userInfo.mfa ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {userInfo.mfa ? 'Enabled' : 'Disabled'}
            </span>
          </p>
          
          {!userInfo.mfa && !showQR && (
            <button
              onClick={generateSecret}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
          )}

          {userInfo.mfa && (
            <button
              onClick={disable2FA}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          )}
        </div>

        {showQR && (
          <div className="mb-6 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Setup Two-Factor Authentication</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                1. Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy)
              </p>
              <div className="bg-white p-4 inline-block rounded-lg">
                {qrCode && <QRCode value={qrCode} size={200} />}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                2. Enter the verification code from your authenticator app:
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={verifyAndEnable2FA}
              disabled={loading || verificationCode.length !== 6}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify and Enable 2FA'}
            </button>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Security Tips</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Store your backup codes in a safe place</li>
            <li>Don't share your 2FA codes with anyone</li>
            <li>Use a reliable authenticator app</li>
            <li>Enable 2FA on all your important accounts</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Settings
