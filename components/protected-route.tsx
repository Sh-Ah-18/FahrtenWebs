"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

type ProtectedRouteProps = {
  children: React.ReactNode
  adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Debug-Logging
  useEffect(() => {
    console.log("ProtectedRoute Debug:", {
      pathname,
      isLoading,
      hasUser: !!user,
      userId: user?.id,
      isAdmin,
      adminOnly
    })
  }, [pathname, isLoading, user, isAdmin, adminOnly])

  useEffect(() => {
    if (!isLoading) {
      console.log("ProtectedRoute: Auth-Check läuft...", { user: !!user, pathname })
      
      // If user is not logged in and not on login page, redirect to login
      if (!user && pathname !== "/login") {
        console.log("ProtectedRoute: Kein User, leite zur Login-Seite weiter")
        router.push("/login")
      } else if (user && pathname === "/login") {
        // If user is logged in and on login page, redirect to dashboard
        console.log("ProtectedRoute: User ist angemeldet, leite zum Dashboard weiter")
        router.push("/dashboard")
      } else if (adminOnly && !isAdmin) {
        // If page requires admin but user is not admin, redirect to dashboard
        console.log("ProtectedRoute: Admin-Berechtigung erforderlich, leite zum Dashboard weiter")
        router.push("/dashboard")
      } else if (user) {
        console.log("ProtectedRoute: Zugriff erlaubt für User:", user.id)
      }
    }
  }, [user, isLoading, router, pathname, adminOnly, isAdmin])

  // Show loading state while checking authentication
  if (isLoading) {
    console.log("ProtectedRoute: Zeige Loading-State")
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-950">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        <span className="ml-3 text-white">Lade...</span>
      </div>
    )
  }

  // If not logged in and not on login page, don't render children
  if (!user && pathname !== "/login") {
    console.log("ProtectedRoute: Kein User, rendere nichts")
    return null
  }

  // If page requires admin but user is not admin, don't render children
  if (adminOnly && !isAdmin) {
    console.log("ProtectedRoute: Keine Admin-Berechtigung, rendere nichts")
    return null
  }

  // Otherwise, render children
  console.log("ProtectedRoute: Rendere Children")
  return <>{children}</>
}
