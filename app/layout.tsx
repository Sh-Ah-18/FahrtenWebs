import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { SimpleAuthProvider } from "@/contexts/simple-auth-context"
import { QueryProvider } from "@/contexts/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Luxury Work Management",
  description: "Verwaltungssystem für Luxury Work",
    generator: 'v0.app'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <QueryProvider>
          <SimpleAuthProvider>
            {children}
            <Toaster />
          </SimpleAuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
