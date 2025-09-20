// Simple authentication system without complex session management
"use client"

import { createBrowserClient } from "@supabase/ssr"

// Create a simple Supabase client
const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export type User = {
  id: string
  email: string
  is_admin?: boolean
}

export type AuthState = {
  user: User | null
  isLoading: boolean
}

// Simple auth functions
export const auth = {
  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error || !user) return null

      // Get admin status
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

      return {
        id: user.id,
        email: user.email || "",
        is_admin: profile?.is_admin || false,
      }
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  },

  // Login
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Login failed" }
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Logout error:", error)
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      return !!session
    } catch (error) {
      return false
    }
  },
}

// Export supabase client for database operations
export { supabase }
