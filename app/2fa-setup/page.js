'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import QRCode from 'qrcode';
import SuccessModal from '@/app/components/SuccessModal';
import Navbar from '@/app/components/Navbar';

export default function TwoFactorSetupPage() {
  // Router and Supabase client initialization
  const router = useRouter();
  const supabase = createClientComponentClient();

  // User and authentication states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // MFA related states
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState(null);
  const [showDisableMFAModal, setShowDisableMFAModal] = useState(false);

  // Modal states
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  // Load user data and check authentication
  const loadUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // MFA handlers
  const handleSetupMFA = async () => {
    try {
      setError(null);
      
      // Clean up existing unverified factors
      const unverifiedFactors = user?.factors?.filter(
        factor => factor.status === 'unverified' && factor.factor_type === 'totp'
      ) || [];

      for (const factor of unverifiedFactors) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (unenrollError) {
          if (!unenrollError.message?.includes('404')) {
            throw unenrollError;
          }
        }
      }

      // Enroll new MFA factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Next Login',
        friendlyName: `TOTP-${Date.now()}`
      });
      if (error) throw error;

      setFactorId(data.id);
      const qrCode = await QRCode.toDataURL(data.totp.uri);
      setQrCodeUrl(qrCode);
      setShowMFASetup(true);
    } catch (error) {
      console.error('Error setting up MFA:', error);
      setError('Failed to set up MFA. Please try again.');
    }
  };

  const handleDisableMFA = async () => {
    try {
      const verifiedFactor = user?.factors?.find(
        factor => factor.factor_type === 'totp' && factor.status === 'verified'
      );
      
      if (!verifiedFactor) {
        throw new Error('No verified MFA factor found');
      }

      setError(null);

      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
      if (error) throw error;

      setShowDisableMFAModal(false);
      await loadUser();

      setSuccessModal({
        isOpen: true,
        title: '2FA Successfully Disabled',
        message: 'Two-factor authentication has been disabled for your account.'
      });
    } catch (error) {
      console.error('Error disabling MFA:', error);
      setError('Failed to disable MFA. Please try again.');
    }
  };

  const handleCancelMFA = async () => {
    try {
      if (factorId) {
        await supabase.auth.mfa.unenroll({ factorId });
      }
      resetMFAState();
      await loadUser();
    } catch (error) {
      console.error('Error canceling MFA setup:', error);
      setError('Failed to cancel MFA setup. Please try again.');
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    
    if (!validateVerificationCode(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setError(null);
      
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verificationCode,
      });
      if (verifyError) throw verifyError;

      setSuccessModal({
        isOpen: true,
        title: '2FA Successfully Enabled',
        message: 'Two-factor authentication has been enabled for your account.'
      });

      resetMFAState();
      await loadUser();
    } catch (error) {
      console.error('Error verifying MFA:', error);
      setError('Failed to verify MFA code. Please try again.');
    }
  };

  // Helper functions
  const resetMFAState = () => {
    setShowMFASetup(false);
    setQrCodeUrl(null);
    setVerificationCode('');
    setError(null);
    setFactorId(null);
  };

  const validateVerificationCode = (code) => {
    return code && code.length === 6 && /^\d+$/.test(code);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent dark:border-blue-400 dark:border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-4"></div>
          <div className="text-blue-600 dark:text-blue-400 animate-pulse">Loading<span className="animate-[ellipsis_1.5s_steps(4,end)_infinite]">...</span></div>
        </div>
      </div>
    );
  }

  const hasVerifiedMFA = user?.factors?.some(factor => 
    factor.factor_type === 'totp' && factor.status === 'verified'
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900">
      {/* Navbar Component */}
      <Navbar user={user} />
      
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
                <div>
                  <div className="mb-6 flex flex-col items-center">
                    <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">1. Scan this QR code with your authenticator app</h3>
                    <div className="bg-white p-4 rounded-md inline-block">
                      {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code for 2FA" className="w-48 h-48" />}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">2. Enter the verification code from your app</h3>
                    <form onSubmit={handleVerifyMFA} className="space-y-4">
                      <div className="flex justify-center">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                          placeholder="6-digit code"
                          className="w-full md:w-64 px-3 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-center"
                          maxLength={6}
                          required
                        />
                      </div>
                      <div className="flex justify-center space-x-4">
                        <button
                          type="submit"
                          disabled={verificationCode.length !== 6}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Verify and Enable
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelMFA}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-blue-100 dark:border-blue-900/50 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 text-center">About Two-Factor Authentication</h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-400 text-center">
            <p>
              Two-factor authentication adds an extra layer of security to your account by requiring both your password and a verification code from your mobile device.
            </p>
            <p>
              We recommend using authenticator apps like Google Authenticator, Authy, or Microsoft Authenticator.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Recovery Options</h3>
              <p className="text-sm">
                If you lose access to your authenticator app, you'll need to contact support to regain access to your account. Make sure to keep your recovery codes in a safe place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disable 2FA Confirmation Modal */}
      {showDisableMFAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">Disable Two-Factor Authentication?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Are you sure you want to disable two-factor authentication? This will make your account less secure.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDisableMFAModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMFA}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50 rounded-lg transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <SuccessModal
          title={successModal.title}
          message={successModal.message}
          onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        />
      )}
    </div>
  );
}