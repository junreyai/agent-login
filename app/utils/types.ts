export interface UserInfo {
  id: string
  first_name: string | null
  last_name: string | null
  role: 'user' | 'admin'
  created_at: string
  two_factor_enabled: boolean
  two_factor_secret?: string | null
}

export interface EnhancedUser {
  id: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  lastLogin: string | null
  fullName: string
  email?: string
  [key: string]: any
}

export interface FetchUsersOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  page?: number
}

export interface FetchUsersResponse {
  users: EnhancedUser[]
  count: number
  totalPages: number
  currentPage: number
  error: string | null
}

export interface ProfileData {
  first_name?: string
  last_name?: string
  role?: 'user' | 'admin'
  [key: string]: any
} 