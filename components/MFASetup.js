"use client";
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import QRCode from 'qrcode';

const MFASetup = ({ onSetupComplete }) => {
  const [qrCode, setQrCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true);

  useEffect(() => {
    if (qrCode) {
      generateQRCode(qrCode);
    }
  }, [qrCode]);

  const generateQRCode = async (data) => {
    try {
      const url = await QRCode.toDataURL(data);
      setQrCodeUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    }
  };

  // Step 1: Verify password and start MFA enrollment
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Get current user's email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First, upgrade the session with the password
      const { error: upgradeError } = await supabase.auth.reauthenticate();
      if (upgradeError) throw upgradeError;

      // Clean up existing factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactors = factors?.all?.filter(factor => factor.factor_type === 'totp') || [];
      for (const factor of totpFactors) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (error) {
          console.error('Error unenrolling factor:', error);
        }
      }

      // Start the enrollment process
      const friendlyName = `Authenticator-${Date.now()}`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Secure Login App',
        friendlyName
      });

      if (error) throw error;

      setQrCode(data.totp.uri);
      setFactorId(data.id);
      setShowPasswordPrompt(false);

    } catch (error) {
      setError(error.message);
      console.error('MFA Setup Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify and complete MFA setup
  const verifyAndCompleteMFASetup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // First create a challenge
      const { data: challengeData, error: challengeError } = 
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      // Then verify the challenge with the code
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (error) throw error;

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Update user's MFA status in the user_info table
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ mfa: true })
        .eq('email', user.email);

      if (updateError) throw updateError;

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_info')
        .select('mfa')
        .eq('email', user.email)
        .single();

      if (verifyError) throw verifyError;

      if (!verifyData['mfa']) {
        throw new Error('Failed to update MFA status in database');
      }

      // If successful, call the completion handler
      onSetupComplete();
    } catch (error) {
      setError(error.message);
      console.error('MFA Verification Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Set Up Two-Factor Authentication</h2>
      
      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {showPasswordPrompt ? (
        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Please enter your password to continue with MFA setup:
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      ) : qrCodeUrl ? (
        <div>
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center mb-4">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>

          <form onSubmit={verifyAndCompleteMFASetup}>
            <div className="mb-4">
              <label htmlFor="verificationCode" className="block text-sm font-medium mb-2">
                2. Enter the verification code from your authenticator app:
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter 6-digit code"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !verificationCode}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Verifying...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-red-500">Failed to generate QR code. Please try again.</p>
        </div>
      )}
    </div>
  );
};

export default MFASetup;