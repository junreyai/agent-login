'use client'

// Core imports
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Third-party imports
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Components
import SuccessModal from '../components/SuccessModal'
import Navbar from '../components/Navbar'

export default function DashboardPage() {
  // Router and Supabase client initialization
  const router = useRouter()
  const supabase = createClientComponentClient()

  // User and authentication states
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  })

  // Load user data and check authentication
  const loadUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      
      if (!session) {
        router.push('/login')
        return
      }

      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      // Fetch user role and additional information
      const { data: currentUserInfo, error: currentUserInfoError } = await supabase
        .from('user_info')
        .select('role')
        .eq('id', currentUser.id)
        .single()
      
      if (currentUserInfoError) throw currentUserInfoError

      const userWithRole = { ...currentUser, role: currentUserInfo.role }
      console.log('Current user with role:', userWithRole)
      setUser(userWithRole)
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()

    // Add keyframes for the ellipsis animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ellipsis {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent dark:border-blue-400 dark:border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-4"></div>
          <div className="text-blue-600 dark:text-blue-400 animate-pulse">Loading<span className="animate-[ellipsis_1.5s_steps(4,end)_infinite]">...</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navbar Component */}
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Success Modal */}
          <SuccessModal
            isOpen={successModal.isOpen}
            onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
            title={successModal.title}
            message={successModal.message}
          />


        </div>
      </div>
    </div>
  )
}
