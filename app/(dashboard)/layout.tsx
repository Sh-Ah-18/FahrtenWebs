"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Menu, Home, Ticket, Building2, Users, MapPinned, ChevronRight, LogOut } from "lucide-react"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import SimpleProtectedRoute from "@/components/simple-protected-route"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSimpleAuth()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // **NEU**: Immer schließen, wenn Route wechselt (auch bei Back/Forward)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Anfragen", href: "/anfragen", icon: Ticket },
    { name: "Unternehmen", href: "/unternehmen", icon: Building2 },
    { name: "Mitarbeiter", href: "/mitarbeiter", icon: Users },
    { name: "Kostenstellen", href: "/kostenstellen", icon: MapPinned },
  ]

  const NavLink = ({ item }: { item: (typeof navigation)[0] }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)} // sicherheitshalber dennoch
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          isActive
            ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-400"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        }`}
      >
        <item.icon className={`h-5 w-5 ${isActive ? "text-amber-400" : ""}`} />
        <span>{item.name}</span>
        {isActive && <ChevronRight className="ml-auto h-4 w-4 text-amber-400" />}
      </Link>
    )
  }

  const Sidebar = () => (
    <div className="flex h-full flex-col gap-2 overflow-y-auto bg-gray-900 px-3 py-4">
      <div className="mb-4 flex items-center px-2">
        <h2 className="text-xl font-bold text-white">
          <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">Luxury</span>{" "}
          Work
        </h2>
      </div>
      <div className="space-y-1">
        {navigation.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}
      </div>
      <div className="mt-auto">
        <div className="mb-2 border-t border-gray-800 pt-2">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-amber-400">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="truncate font-medium text-white">{user?.email || "User"}</p>
              <p className="text-xs">Benutzer</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:bg-gray-800 hover:text-white"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </div>
  )

  return (
    <SimpleProtectedRoute>
      <div className="flex h-screen bg-gray-950">
        {/* Desktop sidebar */}
        <div className="hidden shrink-0 lg:block lg:w-64">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="border-b border-gray-800 bg-gray-900 px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              {/* **KEIN** SheetTrigger im controlled Mode */}
              <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
              <h1 className="text-lg font-bold text-white">
                <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
                  Luxury
                </span>{" "}
                Work
              </h1>
              <div className="w-9" /> {/* Spacer */}
              {/* Controlled Sheet */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-64 border-gray-800 p-0">
                  <Sidebar />
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Page content */}
          <main className="min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-gray-950 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SimpleProtectedRoute>
  )
}
