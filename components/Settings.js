"use client";
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import MFASetup from './MFASetup';

const Settings = () => {
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Check MFA status from user_info table
      const { data, error } = await supabase
        .from('user_info')
        .select('mfa')
        .eq('email', user.email)
        .single();

      if (error) throw error;

      setMfaEnabled(data.mfa);
    } catch (error) {
      setError(error.message);
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMFASetupComplete = () => {
    setShowMFASetup(false);
    setMfaEnabled(true);
    checkMFAStatus(); // Refresh the MFA status
  };

  const handleDisableMFA = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Get existing factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      // Unenroll from all TOTP factors
      const totpFactors = factors?.all?.filter(factor => factor.factor_type === 'totp') || [];
      for (const factor of totpFactors) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }

      // Update user_info table
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ mfa: false })
        .eq('email', user.email);

      if (updateError) throw updateError;

      setMfaEnabled(false);
    } catch (error) {
      setError(error.message);
      console.error('Error disabling MFA:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Settings</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold mb-2">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-600 mb-4">
            {mfaEnabled 
              ? "Two-factor authentication is currently enabled for your account."
              : "Add an extra layer of security to your account by enabling two-factor authentication."}
          </p>

          {mfaEnabled ? (
            <button
              onClick={handleDisableMFA}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-red-300"
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          ) : (
            <button
              onClick={() => setShowMFASetup(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Set Up 2FA
            </button>
          )}
        </div>
      </div>

      {showMFASetup && !mfaEnabled && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <button
                onClick={() => setShowMFASetup(false)}
                className="float-right text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <MFASetup onSetupComplete={handleMFASetupComplete} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
