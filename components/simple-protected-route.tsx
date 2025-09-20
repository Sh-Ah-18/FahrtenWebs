"use client"

import type React from "react"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

type SimpleProtectedRouteProps = {
  children: React.ReactNode
  adminOnly?: boolean
}

export default function SimpleProtectedRoute({ children, adminOnly = false }: SimpleProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useSimpleAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== "/login") {
        router.push("/login")
      } else if (user && pathname === "/login") {
        router.push("/dashboard")
      } else if (adminOnly && !isAdmin) {
        router.push("/dashboard")
      }
    }
  }, [user, isLoading, router, pathname, adminOnly, isAdmin])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-950">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        <span className="ml-3 text-white">Loading...</span>
      </div>
    )
  }

  if (!user && pathname !== "/login") {
    return null
  }

  if (adminOnly && !isAdmin) {
    return null
  }

  return <>{children}</>
}
