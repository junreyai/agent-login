'use client'

// Core imports
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Third-party imports
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Components
import SuccessModal from '../components/SuccessModal'

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

  // AI Agent dummy data
  const [agents] = useState([
    {
      id: 1,
      name: 'Customer Support Agent',
      status: 'Active',
      interactions: 1243,
      successRate: 94,
      lastActive: '2 minutes ago',
      description: 'Handles customer inquiries and support tickets',
      avatar: '👨‍💼'
    },
    {
      id: 2,
      name: 'Data Analysis Agent',
      status: 'Active',
      interactions: 867,
      successRate: 98,
      lastActive: '15 minutes ago',
      description: 'Processes and analyzes business data',
      avatar: '📊'
    },
    {
      id: 3,
      name: 'Content Creation Agent',
      status: 'Inactive',
      interactions: 532,
      successRate: 87,
      lastActive: '3 hours ago',
      description: 'Generates marketing content and blog posts',
      avatar: '✍️'
    },
    {
      id: 4,
      name: 'Scheduling Assistant',
      status: 'Active',
      interactions: 1876,
      successRate: 96,
      lastActive: '1 hour ago',
      description: 'Manages appointments and schedules',
      avatar: '📅'
    }
  ])

  // Agent performance metrics (dummy data)
  const [performanceMetrics] = useState({
    totalInteractions: 4518,
    avgResponseTime: '1.8s',
    avgSuccessRate: 94,
    activeAgents: 3,
    totalAgents: 4
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
      {/* Navbar is now in the root layout */}
      
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

          {/* AI Agent Dashboard Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-blue-600 dark:border-blue-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">AI Agent Platform</h1>
              <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                + New Agent
              </button>
            </div>
            
            {/* Performance Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-300">Total Interactions</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{performanceMetrics.totalInteractions}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-300">Avg. Response Time</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{performanceMetrics.avgResponseTime}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-300">Success Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{performanceMetrics.avgSuccessRate}%</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-300">Active Agents</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{performanceMetrics.activeAgents}/{performanceMetrics.totalAgents}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-300">System Status</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">Healthy</p>
              </div>
            </div>
          </div>

          {/* Agent List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-blue-600 dark:border-blue-500">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">Your AI Agents</h2>
            
            {/* Desktop table view (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-200 dark:divide-blue-800">
                <thead className="bg-blue-50 dark:bg-blue-900/30">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Agent</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Interactions</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Success Rate</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Last Active</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-blue-100 dark:divide-blue-800">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-xl border-2 border-blue-300 dark:border-blue-700">
                            {agent.avatar}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-400">{agent.name}</div>
                            <div className="text-sm text-blue-600/70 dark:text-blue-300/70">{agent.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.status === 'Active' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-300">
                        {agent.interactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-300">
                        {agent.successRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-300">
                        {agent.lastActive}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3 focus:outline-none focus:underline">Edit</button>
                        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3 focus:outline-none focus:underline">View</button>
                        <button className={`${
                          agent.status === 'Active' 
                            ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300' 
                            : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                        } focus:outline-none focus:underline`}>
                          {agent.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile card view (shown only on mobile) */}
            <div className="md:hidden space-y-4">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-xl border-2 border-blue-300 dark:border-blue-700">
                        {agent.avatar}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-400">{agent.name}</div>
                      </div>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      agent.status === 'Active' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="text-sm text-blue-600/70 dark:text-blue-300/70 mb-3">{agent.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-blue-600 dark:text-blue-300 font-medium">Interactions:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-300">{agent.interactions}</span>
                    </div>
                    <div>
                      <span className="text-blue-600 dark:text-blue-300 font-medium">Success Rate:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-300">{agent.successRate}%</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-blue-600 dark:text-blue-300 font-medium">Last Active:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-300">{agent.lastActive}</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-blue-100 dark:border-blue-800 pt-3">
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm focus:outline-none focus:underline">Edit</button>
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm focus:outline-none focus:underline">View</button>
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm focus:outline-none focus:underline">
                      {agent.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Interactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-blue-600 dark:border-blue-500">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">Recent Interactions</h2>
            <div className="space-y-4">
              {/* Interaction 1 */}
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-lg border-2 border-blue-300 dark:border-blue-700">
                      👨‍💼
                    </div>
                    <span className="ml-2 font-medium text-blue-700 dark:text-blue-400">Customer Support Agent</span>
                  </div>
                  <span className="text-sm text-blue-600/70 dark:text-blue-300/70">10 minutes ago</span>
                </div>
                <div className="pl-0 sm:pl-10">
                  <p className="text-blue-600 dark:text-blue-300 mb-2 font-medium">User: How do I reset my password?</p>
                  <p className="text-blue-700 dark:text-blue-400">Agent: To reset your password, please go to the login page and click on "Forgot Password". You'll receive an email with instructions to create a new password.</p>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">✓ Successful</span>
                    <span className="hidden sm:inline mx-2 text-blue-300 dark:text-blue-700">|</span>
                    <span className="text-blue-600/70 dark:text-blue-300/70 text-sm">Response time: 0.8s</span>
                  </div>
                </div>
              </div>
              
              {/* Interaction 2 */}
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-lg border-2 border-blue-300 dark:border-blue-700">
                      📊
                    </div>
                    <span className="ml-2 font-medium text-blue-700 dark:text-blue-400">Data Analysis Agent</span>
                  </div>
                  <span className="text-sm text-blue-600/70 dark:text-blue-300/70">1 hour ago</span>
                </div>
                <div className="pl-0 sm:pl-10">
                  <p className="text-blue-600 dark:text-blue-300 mb-2 font-medium">User: Generate a report of user activity for the past week</p>
                  <p className="text-blue-700 dark:text-blue-400">Agent: I've analyzed the user activity data for the past week. There were 1,243 active users, with peak activity on Wednesday. The most used feature was the dashboard (42%), followed by messaging (28%).</p>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">✓ Successful</span>
                    <span className="hidden sm:inline mx-2 text-blue-300 dark:text-blue-700">|</span>
                    <span className="text-blue-600/70 dark:text-blue-300/70 text-sm">Response time: 2.3s</span>
                  </div>
                </div>
              </div>
              
              {/* Interaction 3 */}
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-lg border-2 border-blue-300 dark:border-blue-700">
                      📅
                    </div>
                    <span className="ml-2 font-medium text-blue-700 dark:text-blue-400">Scheduling Assistant</span>
                  </div>
                  <span className="text-sm text-blue-600/70 dark:text-blue-300/70">3 hours ago</span>
                </div>
                <div className="pl-0 sm:pl-10">
                  <p className="text-blue-600 dark:text-blue-300 mb-2 font-medium">User: Schedule a team meeting for tomorrow at 2pm</p>
                  <p className="text-blue-700 dark:text-blue-400">Agent: I've scheduled a team meeting for tomorrow at 2:00 PM. All team members have been notified and the meeting has been added to the shared calendar. Would you like me to prepare an agenda as well?</p>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">✓ Successful</span>
                    <span className="hidden sm:inline mx-2 text-blue-300 dark:text-blue-700">|</span>
                    <span className="text-blue-600/70 dark:text-blue-300/70 text-sm">Response time: 1.5s</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline">
                View All Interactions →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
