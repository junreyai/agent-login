import React from 'react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  message: string
  buttonText?: string
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  message,
  buttonText = 'Continue'
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center">
          {/* Success Icon */}
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
            <svg
              className="w-8 h-8 text-green-500 dark:text-green-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Message */}
          <p className="mt-4 text-center text-gray-700 dark:text-gray-300">
            {message}
          </p>

          {/* Button */}
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessModal 