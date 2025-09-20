"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useSimpleAuth()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />
        <h1 className="mt-4 text-2xl font-bold text-white">
          <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">Luxury</span>{" "}
          Work Management
        </h1>
        <p className="mt-2 text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
