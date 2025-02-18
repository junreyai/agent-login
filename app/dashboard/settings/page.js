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
      // Use Supabase's built-in MFA enrollment
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      })
      
      if (error) throw error

      setSecret(data.secret) // Store the secret for verification
      // Ensure the QR code data is a string
      const qrCodeData = Buffer.from(data.qr_code, 'utf-8').toString()
      setQrCode(qrCodeData)
      setShowQR(true)

      // Store the secret in the database
      const { error: dbError } = await supabase
        .from('user_info')
        .update({ mfa_secret: data.secret })
        .eq('email', user.email)

      if (dbError) throw dbError
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
      // Verify the TOTP code using Supabase
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: 'totp',
        code: verificationCode
      })

      if (error) throw error

      // Update local storage
      const updatedUserInfo = { ...userInfo, mfa: true }
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
      setUserInfo(updatedUserInfo)
      
      setShowQR(false)
      setSecret(null)
      setVerificationCode('')
      alert('2FA has been enabled successfully!')
    } catch (error) {
      setError(error.message || 'Error enabling 2FA')
      console.error('2FA verification error:', error)
    } finally {
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    setLoading(true)
    setError(null)
    try {
      // Use Supabase's MFA unenroll
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: 'totp'
      })

      if (error) throw error

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

        {showQR && qrCode && (
          <div className="mt-4 flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCode
                value={qrCode}
                size={200}
                level="M"
              />
            </div>
            <div className="text-sm text-gray-300">
              <p>1. Scan this QR code with your authenticator app</p>
              <p>2. Enter the code shown in your app below</p>
              <p className="mt-2 text-xs text-gray-400">Secret key (if needed): {secret}</p>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                className="mt-1 block w-full rounded-md border border-blue-500/30 bg-slate-800/50 text-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              <button
                onClick={verifyAndEnable2FA}
                disabled={loading || !verificationCode}
                className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </div>
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
