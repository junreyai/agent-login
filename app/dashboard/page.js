'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMFASetup, setShowMFASetup] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [factorId, setFactorId] = useState(null)
  const [users, setUsers] = useState([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  })
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

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
      
      console.log('User data:', currentUser)
      setUser(currentUser)

      // Fetch all users - MFA status is automatically synced by database trigger
      const { data: usersData, error: usersError } = await supabase
        .from('user_info')
        .select('*')
      
      if (usersError) throw usersError
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSetupMFA = async () => {
    try {
      setError(null)
      
      // First clean up any existing unverified factors
      const unverifiedFactors = user?.factors?.filter(factor => factor.status === 'unverified' && factor.factor_type === 'totp') || []
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      })
      if (error) throw error

      setFactorId(data.id)
      const qrCode = await QRCode.toDataURL(data.totp.uri)
      setQrCodeUrl(qrCode)
      setShowMFASetup(true)
    } catch (error) {
      console.error('Error setting up MFA:', error)
      setError(error.message)
    }
  }

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    try {
      const verifiedFactor = user?.factors?.find(factor => 
        factor.factor_type === 'totp' && factor.status === 'verified'
      )
      if (!verifiedFactor) {
        throw new Error('No verified MFA factor found')
      }

      setError(null)
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id })
      if (error) throw error

      // MFA status will be automatically synced by database trigger
      await loadUser()
      alert('Two-factor authentication has been disabled successfully!')
    } catch (error) {
      console.error('Error disabling MFA:', error)
      setError(error.message)
    }
  }

  const handleCancelMFA = async () => {
    try {
      if (factorId) {
        await supabase.auth.mfa.unenroll({ factorId })
      }
      setShowMFASetup(false)
      setQrCodeUrl(null)
      setVerificationCode('')
      setError(null)
      setFactorId(null)
      await loadUser()
    } catch (error) {
      console.error('Error canceling MFA setup:', error)
      setError(error.message)
    }
  }

  const handleVerifyMFA = async (e) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    try {
      setError(null)
      // First create a challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      // Then verify the challenge
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verificationCode,
      })
      if (verifyError) throw verifyError

      // MFA status will be automatically synced by database trigger
      setShowMFASetup(false)
      setQrCodeUrl(null)
      setVerificationCode('')
      setFactorId(null)
      await loadUser()
      alert('Two-factor authentication has been enabled successfully!')
    } catch (error) {
      console.error('Error verifying MFA:', error)
      setError(error.message)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate form
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      setError('All fields are required')
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newUser.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      // Reset form and close modal
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user'
      })
      setShowAddUserModal(false)

      // Reload user list
      await loadUser()
    } catch (error) {
      console.error('Error creating user:', error)
      setError(error.message)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: editingUser.first_name,
          lastName: editingUser.last_name,
          role: editingUser.role
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      setShowEditUserModal(false)
      setEditingUser(null)
      await loadUser()
    } catch (error) {
      console.error('Error updating user:', error)
      setError(error.message)
    }
  }

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      setShowDeleteModal(false)
      setUserToDelete(null)
      await loadUser()
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(error.message)
    }
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setShowEditUserModal(true)
  }

  const openDeleteModal = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const hasVerifiedMFA = user?.factors?.some(factor => 
    factor.factor_type === 'totp' && factor.status === 'verified'
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Add User
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select
                      id="role"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {showEditUserModal && editingUser && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Edit User</h3>
                  <form onSubmit={handleEditUser} className="mt-4">
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editingUser.first_name}
                        onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editingUser.last_name}
                        onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Role
                      </label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {error && (
                      <p className="text-red-500 text-xs italic mb-4">{error}</p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditUserModal(false)
                          setEditingUser(null)
                          setError(null)
                        }}
                        className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && userToDelete && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete User</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete {userToDelete.first_name} {userToDelete.last_name}? This action cannot be undone.
                    </p>
                  </div>
                  {error && (
                    <p className="text-red-500 text-xs italic mt-4">{error}</p>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteModal(false)
                        setUserToDelete(null)
                        setError(null)
                      }}
                      className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteUser}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User List Table */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">User List</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MFA Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.first_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.mfa_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
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

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            <div className="mt-4">
              {!showMFASetup && (
                <>
                  {hasVerifiedMFA ? (
                    <button
                      onClick={handleDisableMFA}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Disable Two-Factor Authentication
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSetupMFA}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Set Up Two-Factor Authentication
                      </button>
                      <p className="mt-2 text-sm text-gray-500">
                        Enhance your account security by enabling two-factor authentication.
                      </p>
                    </>
                  )}
                </>
              )}

              {showMFASetup && (
                <div className="mt-6 p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Set up Two-Factor Authentication</h3>
                  
                  {qrCodeUrl && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-4">
                        1. Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy)
                      </p>
                      <div className="flex justify-center">
                        <img src={qrCodeUrl} alt="QR Code" className="max-w-[200px]" />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleVerifyMFA} className="space-y-4">
                    <div>
                      <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                        2. Enter the verification code from your authenticator app
                      </label>
                      <input
                        type="text"
                        id="verificationCode"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Enter 6-digit code"
                      />
                    </div>

                    {error && (
                      <div className="text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Verify and Enable 2FA
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMFA}
                        className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
