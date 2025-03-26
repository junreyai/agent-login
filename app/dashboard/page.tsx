'use client'

// Core imports
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Third-party imports
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Components
import SuccessModal from '../components/SuccessModal'
import { PageLoading } from '../components/LoadingComponents'

// Utilities
import useUser from '@/app/utils/useUser'

// Types
interface Agent {
  id: number
  name: string
  status: 'Active' | 'Inactive'
  interactions: number
  successRate: number
  lastActive: string
  description: string
  avatar: string
}

interface PerformanceMetrics {
  totalInteractions: number
  avgResponseTime: string
  avgSuccessRate: number
  activeAgents: number
  totalAgents: number
}

interface SuccessModalState {
  isOpen: boolean
  message: string
}

export default function DashboardPage() {
  // Router and Supabase client initialization
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Use our custom hook for user data
  const { user, loading, error } = useUser({ 
    redirectIfNotAuthenticated: true,
    updateLoginTimestamp: true
  })

  // Modal states
  const [successModal, setSuccessModal] = useState<SuccessModalState>({
    isOpen: false,
    message: ''
  })

  // AI Agent dummy data
  const [agents] = useState<Agent[]>([
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
  const [performanceMetrics] = useState<PerformanceMetrics>({
    totalInteractions: 4518,
    avgResponseTime: '1.8s',
    avgSuccessRate: 94,
    activeAgents: 3,
    totalAgents: 4
  })

  useEffect(() => {
    // Add keyframes for the ellipsis animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes ellipsis {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handleAgentAction = (agentId: number, action: 'edit' | 'view' | 'toggle'): void => {
    // Implement agent actions here
    console.log(`${action} agent ${agentId}`)
  }

  if (loading) {
    return <PageLoading message="Loading your dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Success Modal */}
          <SuccessModal
            isOpen={successModal.isOpen}
            onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
            message={successModal.message}
          />

          {/* Dashboard Header with New Logo */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-indigo-100 dark:border-indigo-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI Command Center</h1>
                  <p className="text-gray-600 dark:text-gray-400">Manage your AI agents efficiently</p>
                </div>
              </div>
              <button 
                onClick={() => console.log('Create new agent')}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span>New Agent</span>
              </button>
            </div>
            
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Total Interactions',
                  value: performanceMetrics.totalInteractions,
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  )
                },
                {
                  label: 'Avg. Response Time',
                  value: performanceMetrics.avgResponseTime,
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  )
                },
                {
                  label: 'Success Rate',
                  value: `${performanceMetrics.avgSuccessRate}%`,
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  )
                },
                {
                  label: 'Active Agents',
                  value: `${performanceMetrics.activeAgents}/${performanceMetrics.totalAgents}`,
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  )
                },
                {
                  label: 'System Status',
                  value: 'Healthy',
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                  )
                }
              ].map((metric, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-indigo-50 dark:border-indigo-900 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                      {metric.icon}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agent List */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-indigo-100 dark:border-indigo-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Your AI Agents</h2>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Desktop table view (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interactions</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Success Rate</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Active</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-xl text-xl shadow-inner">
                            {agent.avatar}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{agent.interactions}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-grow bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24 mr-2">
                            <div 
                              className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                              style={{ width: `${agent.successRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white">{agent.successRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {agent.lastActive}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                          onClick={() => handleAgentAction(agent.id, 'edit')}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleAgentAction(agent.id, 'view')}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline"
                        >
                          View
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
                    <button 
                      onClick={() => handleAgentAction(agent.id, 'edit')}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm focus:outline-none focus:underline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleAgentAction(agent.id, 'view')}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm focus:outline-none focus:underline"
                    >
                      View
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
              <button 
                onClick={() => console.log('View all interactions')}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline"
              >
                View All Interactions →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 