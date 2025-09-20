"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { User, Session } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import { supabase } from "@/lib/supabase-browser"
import { 
  checkSessionStatus, 
  refreshSession as refreshSessionUtil, 
  setupSessionRefreshTimer
} from "@/lib/session-utils"

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  // Verbesserte Session-Verwaltung
  const refreshSession = async () => {
    try {
      console.log("AuthContext: Versuche Session zu erneuern...")
      const success = await refreshSessionUtil()
      if (!success) {
        console.warn("AuthContext: Session-Refresh fehlgeschlagen")
        // Bei Fehler zur Login-Seite weiterleiten
        await logout()
        return
      }
      
      console.log("AuthContext: Session erfolgreich erneuert")
      
      // Admin-Status neu laden
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", currentUser.id)
          .single()
        setIsAdmin(profile?.is_admin || false)
        console.log("AuthContext: User und Admin-Status aktualisiert")
      }
    } catch (err) {
      console.error("AuthContext: Fehler beim Session-Refresh:", err)
      await logout()
    }
  }

  // Automatischer Session-Refresh mit den neuen Utilities
  useEffect(() => {
    console.log("AuthContext: Richte automatischen Session-Refresh ein...")
    const cleanup = setupSessionRefreshTimer(async () => {
      console.log("AuthContext: Automatischer Session-Refresh wird ausgeführt...")
      await refreshSession()
    }, 5 * 60 * 1000) // Alle 5 Minuten prüfen

    return cleanup
  }, [])

  // Debug: Monitor for any connection issues
  useEffect(() => {
    const checkConnectionHealth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn("AuthContext: Connection health check failed:", error.message)
        } else {
          console.log("AuthContext: Connection health check passed")
        }
      } catch (err) {
        console.error("AuthContext: Connection health check exception:", err)
      }
    }

    // Check connection health every 30 seconds
    const healthInterval = setInterval(checkConnectionHealth, 30 * 1000)
    
    return () => clearInterval(healthInterval)
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log("AuthContext: Lade initiale Session...")
        setIsLoading(true)
        
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("AuthContext: Fehler beim Laden der Session:", error)
          setIsLoading(false)
          return
        }

        if (data.session?.user) {
          console.log("AuthContext: Session gefunden für User:", data.session.user.id)
          setUser(data.session.user)

          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", data.session.user.id)
            .single()

          setIsAdmin(profile?.is_admin || false)
          console.log("AuthContext: Admin-Status geladen:", profile?.is_admin)
        } else {
          console.log("AuthContext: Keine Session gefunden")
        }
      } catch (err) {
        console.error("AuthContext: Fehler beim Laden der Session:", err)
      } finally {
        setIsLoading(false)
        console.log("AuthContext: Session-Loading abgeschlossen")
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext: Auth state changed:", event, session?.user?.id)
      
      if (session?.user) {
        console.log("AuthContext: User angemeldet:", session.user.id)
        setUser(session.user)

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single()

        setIsAdmin(profile?.is_admin || false)
        console.log("AuthContext: Admin-Status aktualisiert:", profile?.is_admin)
      } else {
        console.log("AuthContext: User abgemeldet")
        setUser(null)
        setIsAdmin(false)
      }

      setIsLoading(false)

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        console.log("AuthContext: Router-Refresh ausgelöst")
        router.refresh()
      }
      
      // Bei Token-Refresh-Event
      if (event === "TOKEN_REFRESHED") {
        console.log("AuthContext: Token erfolgreich erneuert")
      }
    })

    return () => {
      console.log("AuthContext: Cleanup - unsubscribe von auth events")
      subscription.unsubscribe()
    }
  }, [router])

 const login = async (email: string, password: string) => {
  console.log("AuthContext: Login-Versuch für:", email)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error("AuthContext: Login-Fehler:", error.message)
    return { success: false, error: error.message }
  }

  console.log("AuthContext: Login erfolgreich, leite zum Dashboard weiter")
  // ✅ Manuell weiterleiten
  router.push("/dashboard")

  return { success: true }
}

  const logout = async () => {
    try {
      console.log("AuthContext: Logout wird ausgeführt...")
      await supabase.auth.signOut()
      setUser(null)
      setIsAdmin(false)
      console.log("AuthContext: Logout erfolgreich, leite zur Login-Seite weiter")
      router.push("/login")
    } catch (error) {
      console.error("AuthContext: Logout-Fehler:", error)
      // Trotzdem zur Login-Seite weiterleiten
      router.push("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
