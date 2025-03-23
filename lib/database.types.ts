export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_info: {
        Row: {
          id: string
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
          two_factor_enabled: boolean
          two_factor_secret?: string
        }
        Insert: {
          id: string
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
          two_factor_enabled?: boolean
          two_factor_secret?: string
        }
        Update: {
          id?: string
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
          two_factor_enabled?: boolean
          two_factor_secret?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 