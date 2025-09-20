"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Loader2, MapPin, Ticket, User } from "lucide-react"
import Link from "next/link"
import {
  useAnfragen,
  useMitarbeiter,
  useUnternehmen,
  useKostenstellen,
  usePrefetchDashboardData,
} from "@/hooks/use-query-hooks"

export default function DashboardPage() {
  // PERFORMANCE: Use React Query hooks for data fetching with caching
  const { data: anfragen = [], isLoading: isLoadingAnfragen } = useAnfragen()
  const { data: mitarbeiter = [], isLoading: isLoadingMitarbeiter } = useMitarbeiter()
  const { data: unternehmen = [], isLoading: isLoadingUnternehmen } = useUnternehmen()
  const { data: kostenstellen = [], isLoading: isLoadingKostenstellen } = useKostenstellen()

  // PERFORMANCE: Prefetch data for other pages
  const prefetchData = usePrefetchDashboardData()

  useEffect(() => {
    // PERFORMANCE: Prefetch data for other pages when dashboard loads
    prefetchData().catch(console.error)
  }, [prefetchData])

  const isLoading = isLoadingAnfragen || isLoadingMitarbeiter || isLoadingUnternehmen || isLoadingKostenstellen

  // Calculate stats
  const stats = {
    anfragen: anfragen.length,
    mitarbeiter: mitarbeiter.length,
    unternehmen: unternehmen.length,
    kostenstellen: kostenstellen.length,
    offeneAnfragen: anfragen.filter((a) => !a.ausgefuehrt).length,
    erledigteAnfragen: anfragen.filter((a) => a.ausgefuehrt).length,
  }

  // Get the 5 most recent anfragen
  const recentAnfragen = [...anfragen]
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <span className="ml-2 text-white">Dashboard wird geladen...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
        <p className="text-gray-400">Übersicht über Ihre Arbeitsverwaltung</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Anfragen</CardDescription>
            <CardTitle className="text-2xl text-white">{stats.anfragen}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-gray-400">
              <div>Offen: {stats.offeneAnfragen}</div>
              <div>Erledigt: {stats.erledigteAnfragen}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Mitarbeiter</CardDescription>
            <CardTitle className="text-2xl text-white">{stats.mitarbeiter}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-400">
              <User className="mr-2 h-4 w-4 text-blue-400" />
              <span>Registrierte Mitarbeiter</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Unternehmen</CardDescription>
            <CardTitle className="text-2xl text-white">{stats.unternehmen}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-400">
              <Building2 className="mr-2 h-4 w-4 text-green-400" />
              <span>Registrierte Unternehmen</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Kostenstellen</CardDescription>
            <CardTitle className="text-2xl text-white">{stats.kostenstellen}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-400">
              <MapPin className="mr-2 h-4 w-4 text-rose-400" />
              <span>Registrierte Kostenstellen</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Anfragen */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Neueste Anfragen</CardTitle>
          <CardDescription className="text-gray-400">Die 5 neuesten Anfragen im System</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAnfragen.length > 0 ? (
              recentAnfragen.map((anfrage) => (
                <div
                  key={anfrage.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium text-white">{anfrage.zweck || `Anfrage #${anfrage.id}`}</p>
                      <p className="text-sm text-gray-400">
                        {anfrage.mitarbeiter?.name} • {new Date(anfrage.datum).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      anfrage.ausgefuehrt ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {anfrage.ausgefuehrt ? "Ausgeführt" : "Offen"}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400">Keine Anfragen gefunden</p>
            )}

            {recentAnfragen.length > 0 && (
              <div className="mt-4 text-center">
                <Link
                  href="/anfragen"
                  className="text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline"
                >
                  Alle Anfragen anzeigen
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
