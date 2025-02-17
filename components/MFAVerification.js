"use client"
import { useState } from 'react';

const MFAVerification = ({ onVerify, onCancel }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onVerify(otp);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Enter Authentication Code</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="otp" className="block text-sm font-medium">
              Authentication Code
            </label>
            <input
              type="text"
              id="otp"
              className="w-full p-2 mt-1 border rounded-md"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MFAVerification;