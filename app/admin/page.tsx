'use client'

// Core imports
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Third-party imports
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

// Components
import SuccessModal from '../components/SuccessModal'
import { PageLoading, ButtonLoader, LoadingSpinner } from '../components/LoadingComponents'

// Utilities
import useAdmin from '@/app/utils/useAdmin'
import type { EnhancedUser } from '@/app/utils/types'

// Types
interface NewUser {
  firstName: string
  lastName: string
  email: string
  role: 'user' | 'admin'
}

interface SuccessModalState {
  isOpen: boolean
  message: string
}

interface User {
  id: string
  email: string
  role: string
  created_at: string
  last_login: string | null
}

export default function AdminPage() {
  // Router and Supabase client initialization
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  // Use our custom hook for admin operations
  const { 
    users: adminUsers, 
    totalUsers,
    totalPages,
    currentPage,
    loading: adminLoading, 
    error: adminError,
    setError,
    loadUsers,
    createUser,
    updateUser,
    deleteUser
  } = useAdmin()

  // User management states
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false)
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [userToDelete, setUserToDelete] = useState<EnhancedUser | null>(null)
  const [editingUser, setEditingUser] = useState<EnhancedUser | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user'
  })

  // Modal states
  const [successModal, setSuccessModal] = useState<SuccessModalState>({
    isOpen: false,
    message: ''
  })

  // Error state
  const [error, setLocalError] = useState<string | null>(null)

  // Load users on component mount
  useEffect(() => {
    loadUsers({ limit: 10, page: 1 })
  }, [loadUsers])

  // Authentication handlers
  const handleSignOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear any local storage items if needed
      localStorage.removeItem('supabase.auth.token')
      
      // Force a hard navigation to the login page
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      setLocalError('Failed to sign out. Please try again.')
    }
  }

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLocalError(null)

    // Validate form
    if (!newUser.firstName || !newUser.lastName || !newUser.email) {
      setLocalError('All fields are required')
      return
    }

    try {
      const response = await createUser(newUser)
      
      if (!response.success) {
        // Handle specific error messages
        if (response.error?.includes('email already exists')) {
          throw new Error('A user with this email address already exists')
        }
        throw new Error(response.error || 'Failed to create user')
      }

      // Reset form and close modal
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        role: 'user'
      })
      setShowAddUserModal(false)
      
      // Show success modal with email confirmation message
      setSuccessModal({
        isOpen: true,
        message: 'An invitation has been sent to the user\'s email. They will need to confirm their email and set up their password to access the system.'
      })

      // Reload user list
      await loadUsers({ limit: 10, page: 1 })
    } catch (error) {
      console.error('Error creating user:', error)
      setLocalError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLocalError(null)
    
    if (!editingUser) return

    try {
      const response = await updateUser(editingUser)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user')
      }

      // Show success modal
      setSuccessModal({
        isOpen: true,
        message: 'The user information has been successfully updated.'
      })
      
      // Close edit modal
      setShowEditUserModal(false)
      
      // Refresh user list
      await loadUsers({ limit: 10, page: 1 })
    } catch (error) {
      console.error('Error updating user:', error)
      setLocalError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleDeleteUser = async (): Promise<void> => {
    if (!userToDelete) return

    try {
      const response = await deleteUser(userToDelete)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user')
      }

      setSuccessModal({
        isOpen: true,
        message: 'The user has been successfully deleted.'
      })
      setShowDeleteModal(false)
      setUserToDelete(null)
      await loadUsers({ limit: 10, page: 1 })
    } catch (error) {
      console.error('Error deleting user:', error)
      setLocalError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const openEditModal = (user: EnhancedUser): void => {
    setEditingUser(user)
    setShowEditUserModal(true)
  }

  const openDeleteModal = (user: EnhancedUser): void => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const openAddUserModal = (): void => {
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      role: 'user'
    })
    setShowAddUserModal(true)
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Manage users and system settings</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">User Management</h2>
              <p className="mt-1 text-sm text-gray-500">A list of all users in the system</p>
            </div>
            <button
              onClick={openAddUserModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Add User
            </button>
          </div>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 