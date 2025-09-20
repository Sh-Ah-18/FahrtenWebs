"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { auth, type User, type AuthState } from "@/lib/simple-auth"

type SimpleAuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load initial user
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true)
      const currentUser = await auth.getCurrentUser()
      setUser(currentUser)
      setIsLoading(false)
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    const result = await auth.login(email, password)

    if (result.success) {
      const currentUser = await auth.getCurrentUser()
      setUser(currentUser)
      router.push("/dashboard")
    }

    return result
  }

  const logout = async () => {
    await auth.logout()
    setUser(null)
    router.push("/login")
  }

  const isAdmin = user?.is_admin || false

  return (
    <SimpleAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  )
}

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext)
  if (!context) {
    throw new Error("useSimpleAuth must be used within a SimpleAuthProvider")
  }
  return context
}
