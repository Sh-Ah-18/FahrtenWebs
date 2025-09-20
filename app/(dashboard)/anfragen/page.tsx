"use client"

import type React from "react"

import { v4 as uuidv4 } from "uuid"
import { exportExcel } from "./excel-export"
import { MultiDayRebookDialog } from "./multibook"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, ChevronRight, Copy, Edit, Plus } from "lucide-react"
import { subDays } from "date-fns"
import { startOfDay, endOfDay } from "date-fns"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { simpleDb, type Anfrage, type Mitarbeiter, type Unternehmen, type Kostenstelle } from "@/lib/simple-db"
import { auth } from "@/lib/simple-auth"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO, isWithinInterval } from "date-fns"
import { de } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { SearchAutocomplete } from "./SearchAutocomplete"
import {
  useAnfragen,
  useUpdateAnfrage,
  useMitarbeiter,
  useUnternehmen,
  useKostenstellen,
} from "@/hooks/use-query-hooks"

type GroupedAnfragen = Record<string, Anfrage[]>

function copyToClipboard(text: string) {
  const hasNative = !!navigator.clipboard?.writeText
  const isSecure = typeof window !== "undefined" && window.isSecureContext
  const isApple = /iP(ad|hone|od)/i.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // 1) Native API wo möglich
  if (isSecure && hasNative && !(isApple || isSafari)) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Kopiert", description: "Fahrt in Zwischenablage" }))
      .catch(() => legacyCopy(text))
    return
  }

  // 2) iOS/Safari/unsicher → Fallback
  legacyCopy(text)
}

function legacyCopy(text: string) {
  try {
    // 2a) "copy"-Event-Trick (kein Fokus nötig)
    let ok = false
    const handler = (e: ClipboardEvent) => {
      e.clipboardData?.setData("text/plain", text)
      e.preventDefault()
      ok = true
    }
    document.addEventListener("copy", handler)
    const executed = document.execCommand("copy")
    document.removeEventListener("copy", handler)

    if (executed && ok) {
      toast({ title: "Kopiert", description: "Fahrt in Zwischenablage" })
      return
    }
  } catch (_) {
    /* weiter zu 2b */
  }

  try {
    // 2b) textarea **im Dialog** (nicht am body → Focus-Trap freundlich)
    const host = (document.querySelector("[data-copy-host]") as HTMLElement) ?? document.body
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    host.appendChild(ta)

    ta.select()
    ta.setSelectionRange(0, ta.value.length) // iOS

    const ok = document.execCommand("copy")
    host.removeChild(ta)

    if (!ok) throw new Error("execCommand failed")
    toast({ title: "Kopiert", description: "Fahrt in Zwischenablage" })
  } catch (err) {
    console.warn("Copy failed:", err)
    toast({ title: "Fehler", description: "Kopieren fehlgeschlagen", variant: "destructive" })
  }
}

function groupByDate(list: Anfrage[]): GroupedAnfragen {
  return list.reduce((groups, item) => {
    const day = format(parseISO(item.datum), "dd.MM.yyyy, EEEE", { locale: de })
    ;(groups[day] ||= []).push(item)
    return groups
  }, {} as GroupedAnfragen)
}

export default function AnfragenPage() {
  const router = useRouter()

  // Client-side guard: redirect if not authenticated
  useEffect(() => {
    let mounted = true
    auth.isAuthenticated().then((ok) => {
      if (!ok && mounted) router.replace("/login")
    })
    return () => {
      mounted = false
    }
  }, [router])
  // const { refreshSession } = useAuth()

  // React Query hooks for proper state management
  const { data: anfragenData, isLoading: anfragenLoading, refetch: refetchAnfragen } = useAnfragen()
  const { data: mitarbeiterData, isLoading: mitarbeiterLoading } = useMitarbeiter()
  const { data: unternehmenData, isLoading: unternehmenLoading } = useUnternehmen()
  const { data: kostenstellenData, isLoading: kostenstellenLoading } = useKostenstellen()

  const updateAnfrageMutation = useUpdateAnfrage()

  // oberhalb aller useEffects

  const [routeLink, setRouteLink] = useState<string>("")

  const [isRoundTripDialogOpen, setIsRoundTripDialogOpen] = useState(false)

  // Use React Query data instead of local state
  const mitarbeiter: Mitarbeiter[] = mitarbeiterData || []
  const unternehmen: Unternehmen[] = unternehmenData || []
  const kostenstellen: Kostenstelle[] = kostenstellenData || []
  const [currentAnfrage, setCurrentAnfrage] = useState<Anfrage | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)



  const [showError, setShowError] = useState(false)

  const [loading, setLoading] = useState(false)

  const [selectedTrips, setSelectedTrips] = useState<Set<number>>(new Set())
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)
  const [shakeTripId, setShakeTripId] = useState<number | null>(null)

  // Helper oben in der Datei oder utils
  const shortAddr = (s: string | null | undefined) => s?.split(",").pop()?.trim() ?? "—"

  // Truncate zwei Strings auf eine gemeinsame Länge (nur das Paar)
function allocateTruncatedPair(left: string, right: string, maxTotal = 19): { left: string; right: string } {
  const safe = (s: string | null | undefined) => (s ?? "")
  const srcLeft = safe(left)
  const srcRight = safe(right)

  const ellipsize = (s: string, cap: number): string => {
    if (cap <= 0) return ""
    if (s.length <= cap) return s
    if (cap <= 3) return "...".slice(0, cap)
    return s.slice(0, cap - 3) + "..."
  }

  const base = Math.floor(maxTotal / 2)
  let leftCap = base
  let rightCap = maxTotal - base

  if (srcLeft.length < leftCap) {
    const surplus = leftCap - srcLeft.length
    leftCap -= surplus
    rightCap += surplus
  }
  if (srcRight.length < rightCap) {
    const surplus = rightCap - srcRight.length
    rightCap -= surplus
    leftCap += surplus
  }

  return { left: ellipsize(srcLeft, leftCap), right: ellipsize(srcRight, rightCap) }
}

function renderShortRoute(left: string, right: string, maxTotal = 20): React.ReactNode {
  const joiner = " → "                    // 3 Zeichen
  const budgetForPair = Math.max(0, maxTotal - joiner.length)
  const pair = allocateTruncatedPair(left, right, budgetForPair)
  return <>{pair.left}{joiner}{pair.right}</>
}

  // Use React Query data instead of local state
  const anfragen: Anfrage[] = (anfragenData as Anfrage[] | undefined) ?? []

  const [displayDays, setDisplayDays] = useState<number>(3)

  const visibleAnfragen: Anfrage[] = useMemo(() => {
    if (!anfragen) return []
    if (displayDays === Number.POSITIVE_INFINITY) return anfragen

    const today = new Date()
    const intervalStart = subDays(startOfDay(today), displayDays - 1)
    const intervalEnd = endOfDay(today)

    return anfragen.filter((a: Anfrage) => {
      const d = parseISO(a.datum)
      return isWithinInterval(d, { start: intervalStart, end: intervalEnd })
    })
  }, [anfragen, displayDays])


  // 1. Neue States
  const [allVisible, setAllVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")


  // 3. Filtere Anfragen abhängig vom Suchfeld und Datumsbereich
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const filteredAnfragen: Anfrage[] = useMemo(() => {
    let result = allVisible ? anfragen : visibleAnfragen
    // Standard: nur offene anzeigen, außer wenn alle sichtbar
    if (!allVisible) {
      result = result.filter((a: Anfrage) => !a.ausgefuehrt)
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (a: Anfrage) =>
          (a.von ?? "").toLowerCase().includes(lower) ||
          (a.nach ?? "").toLowerCase().includes(lower) ||
          (a.mitarbeiter?.name ?? "").toLowerCase().includes(lower) ||
          a.kostenstelle_id.toString().includes(lower),
      )
    }

    if (startDate || endDate) {
      result = result.filter((a: Anfrage) => {
        const anfrageDate = parseISO(a.datum)
        const from = startDate ? parseISO(startDate) : new Date(0)
        const to = endDate ? parseISO(endDate) : new Date(9999, 11, 31)

        return isWithinInterval(anfrageDate, { start: from, end: to })
      })
    }

    return result.sort((a: Anfrage, b: Anfrage) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
  }, [searchTerm, anfragen, visibleAnfragen, allVisible, startDate, endDate])

  // 4. Suggestions logic handled in `SearchAutocomplete`


  // 1. States

  const [searchMitarbeiter, setSearchMitarbeiter] = useState(() => {
    const m = mitarbeiter.find((m) => m.id === currentAnfrage?.mitarbeiter_id)
    return m ? `${m.name} – ${m.hausanschrift}` : ""
  })
  const [debouncedSearchMitarbeiter, setDebouncedSearchMitarbeiter] = useState("")

  const [searchKostenstelle, setSearchKostenstelle] = useState(() => {
    const k = kostenstellen.find((k) => k.id === currentAnfrage?.kostenstelle_id)
    return k ? `ID ${k.id} – ${k.adresse}` : ""
  })
  const [debouncedSearchKostenstelle, setDebouncedSearchKostenstelle] = useState("")

  const [searchUnternehmen, setSearchUnternehmen] = useState(() => {
    const u = unternehmen.find((u) => u.id === currentAnfrage?.unternehmen_id)
    return u ? u.name : ""
  })

  const [debouncedSearchUnternehmen, setDebouncedSearchUnternehmen] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchKostenstelle(searchKostenstelle), 200)
    return () => clearTimeout(t)
  }, [searchKostenstelle])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchUnternehmen(searchUnternehmen), 200)
    return () => clearTimeout(t)
  }, [searchUnternehmen])

  const [showUnternehmenList, setShowUnternehmenList] = useState<boolean>(false)

  const filteredUnternehmen = useMemo(() => {
    const lower = debouncedSearchUnternehmen.toLowerCase()
    return unternehmen.filter((u) => u.name.toLowerCase().includes(lower)).slice(0, 10)
  }, [debouncedSearchUnternehmen, unternehmen])

  // 1. State Hooks

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchMitarbeiter(searchMitarbeiter), 200)
    return () => clearTimeout(t)
  }, [searchMitarbeiter])

  const filteredMitarbeiter = useMemo(() => {
    const lower = debouncedSearchMitarbeiter.toLowerCase()
    return mitarbeiter
      .filter((m) => m.name.toLowerCase().includes(lower) || m.hausanschrift.toLowerCase().includes(lower))
      .slice(0, 10)
  }, [debouncedSearchMitarbeiter, mitarbeiter])

  const filteredKostenstellen = useMemo(() => {
    const lower = debouncedSearchKostenstelle.toLowerCase()
    return kostenstellen
      .filter((k) => k.adresse.toLowerCase().includes(lower) || k.id.toString().includes(lower))
      .slice(0, 10)
  }, [debouncedSearchKostenstelle, kostenstellen])

  const [isFilterOpen, setIsFilterOpen] = useState(false)


  const [selected, setSelected] = useState<Anfrage | null>(null)

  // removed local isLoading; rely on React Query loading flags


  type NewAnfragePayload = Omit<Anfrage, "id" | "mitarbeiter" | "unternehmen" | "kostenstelle">
  const [newAnfrage, setNewAnfrage] = useState<NewAnfragePayload>({
    schicht: "",
    zweck: "",
    von: "",
    nach: "",
    mitarbeiter_id: 0,
    kostenstelle_id: 0,
    unternehmen_id: 0,
    ausgefuehrt: false,
    datum: new Date().toISOString().split("T")[0],
    preis: 0,
    kunde: "",
    uhrzeit: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mehrwertsteuer: "",
    fahrtinfo: "",
    gruppe_id: "",
    info: "",
    ks_real: "",

    // alle weiteren Pflicht-Felder hier
  })

  const [includeReturnTrip, setIncludeReturnTrip] = useState(true)
  const [returnTripTime, setReturnTripTime] = useState(newAnfrage.uhrzeit)

  const [returnTripInfo, setReturnTripInfo] = useState("")

  const [roundTripTime1, setRoundTripTime1] = useState(newAnfrage.uhrzeit)
  const [roundTripTime2, setRoundTripTime2] = useState(newAnfrage.uhrzeit)

  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [returnTime, setReturnTime] = useState(newAnfrage.uhrzeit)




  useEffect(() => {
    if (!isEditDialogOpen || !currentAnfrage) return
    const { von, nach } = calcAdressen(
      currentAnfrage.zweck,
      currentAnfrage.mitarbeiter_id,
      currentAnfrage.kostenstelle_id,
      mitarbeiter,
      kostenstellen,
    )

    setCurrentAnfrage((prev) => {
      if (!prev) return prev
      if (prev.von === von && prev.nach === nach) return prev
      return { ...prev, von, nach }
    })
  }, [isEditDialogOpen, currentAnfrage?.zweck, currentAnfrage?.mitarbeiter_id, currentAnfrage?.kostenstelle_id, mitarbeiter, kostenstellen])

  // Auto-fill 'von'/'nach' bei Änderung von Zweck, Mitarbeiter oder Kostenstelle
  useEffect(() => {
    const { zweck, mitarbeiter_id, kostenstelle_id } = newAnfrage
    if (!zweck || !mitarbeiter_id || !kostenstelle_id) return

    const { von, nach } = calcAdressen(zweck, mitarbeiter_id, kostenstelle_id, mitarbeiter, kostenstellen)

    // Only update if addresses actually changed to prevent infinite loops
    if (von !== newAnfrage.von || nach !== newAnfrage.nach) {
      setNewAnfrage((prev) => ({ ...prev, von, nach }))
    }
  }, [newAnfrage, mitarbeiter, kostenstellen])


  function calcAdressen(
    zweck: Anfrage["zweck"],
    mitarbeiterId: number,
    kostenstelleId: number,
    mitarbeiter: Mitarbeiter[],
    kostenstellen: Kostenstelle[],
  ): { von: string; nach: string } {
    const m = mitarbeiter.find((m) => m.id === mitarbeiterId)
    const k = kostenstellen.find((k) => k.id === kostenstelleId)

    const maAddr = m?.hausanschrift ?? ""
    const ksAddr = k?.adresse ?? ""

    if (zweck === "Arbeit") {
      // Hin-Fahrt: Mitarbeiter → Kostenstelle
      return { von: maAddr, nach: ksAddr }
    } else if (zweck === "Nachhause") {
      // Rück-Fahrt: Kostenstelle → Mitarbeiter
      return { von: ksAddr, nach: maAddr }
    } else {
      return { von: "", nach: "" }
    }
  }

  const handleEditAnfrage = async () => {
    if (!currentAnfrage) return

    try {
      if (!currentAnfrage.datum) {
        toast({
          title: "Fehler",
          description: "Bitte füllen Sie alle erforderlichen Felder aus.",
          variant: "destructive",
        })
        return
      }

      await handleApiCall(async () => {
        // Use React Query mutation for proper state management
        await updateAnfrageMutation.mutateAsync({
          id: currentAnfrage.id,
          data: {
            schicht: currentAnfrage.schicht,
            zweck: currentAnfrage.zweck,
            von: currentAnfrage.von,
            nach: currentAnfrage.nach,
            mitarbeiter_id: currentAnfrage.mitarbeiter_id,
            kostenstelle_id: currentAnfrage.kostenstelle_id,
            unternehmen_id: currentAnfrage.unternehmen_id,
            ausgefuehrt: currentAnfrage.ausgefuehrt,
            datum: currentAnfrage.datum,
            uhrzeit: currentAnfrage.uhrzeit,
            preis: currentAnfrage.preis,
            mehrwertsteuer: currentAnfrage.mehrwertsteuer,
            fahrtinfo: currentAnfrage.fahrtinfo,
            kunde: currentAnfrage.kunde,
          },
        })

        // Sync paired trips in same group with inverse rules
        await simpleDb.anfragen.syncGroupTrips(currentAnfrage.gruppe_id, currentAnfrage.id, {
          mitarbeiter_id: currentAnfrage.mitarbeiter_id,
          kostenstelle_id: currentAnfrage.kostenstelle_id,
          unternehmen_id: currentAnfrage.unternehmen_id,
          kunde: currentAnfrage.kunde,
          zweck: currentAnfrage.zweck,
          schicht: currentAnfrage.schicht,
          von: currentAnfrage.von,
          nach: currentAnfrage.nach,
        })

        // React Query will automatically update the cache, but we can also refetch
        await refetchAnfragen()

        setIsEditDialogOpen(false)
        setSelected(null)
        setCurrentAnfrage(null)

        toast({
          title: "Erfolg",
          description: "Anfrage erfolgreich aktualisiert",
        })
      }, "Anfrage konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.")
    } catch (error) {
      console.error("Error updating anfrage:", error)
      // Error wird bereits von handleApiCall behandelt
    }
  }

  const createFahrten = async (entries?: Array<Omit<typeof newAnfrage, "id">>) => {
    const toCreate = entries && entries.length > 0 ? entries : [newAnfrage]

    // 1) Validierung
    for (const entry of toCreate) {
      if (!entry.datum?.trim()) {
        setShowError(true)
        setLoading(true)
        setTimeout(() => {
          setLoading(false)
          setTimeout(() => setShowError(false), 1000)
        }, 3000)
        return
      }
    }

    try {
      await handleApiCall(async () => {
        // 2) Anlegen
        await Promise.all(toCreate.map(async (entry) => {
          const { id, ...rest } = entry as any

          const payload = {
            datum: rest.datum,
            schicht: rest.schicht || null,
            zweck: rest.zweck || null,
            uhrzeit: rest.uhrzeit || null,
            preis: rest.preis || null,
            mitarbeiter_id: rest.mitarbeiter_id || null,
            unternehmen_id: rest.unternehmen_id || null,
            kostenstelle_id: rest.kostenstelle_id || null,
            von: rest.von || null,
            nach: rest.nach || null,
            kunde: rest.kunde || null,
            mehrwertsteuer: rest.mehrwertsteuer || null,
            ausgefuehrt: rest.ausgefuehrt || false,
            fahrtinfo: rest.fahrtinfo || null,
            rueckfahrt: rest.rueckfahrt || false,
            gruppe_id: rest.gruppe_id || false,
          }

          await simpleDb.anfragen.create(payload)
        }))

        // 3) Die aufrufende Aktion aktualisiert die React-Query-Liste einmalig.
        // Ein zusätzlicher getAll-Aufruf hier würde die Erstellung unnötig verdoppeln.
        toast({
          title: "Erfolg",
          description: toCreate.length > 1 ? "Fahrten erfolgreich erstellt" : "Fahrt erfolgreich erstellt",
        })

        // 4) Formular zurücksetzen, nur bei Einzelanlage
        if (!entries) {
          setNewAnfrage({
            schicht: "",
            zweck: "",
            von: "",
            nach: "",
            mitarbeiter_id: 0,
            kostenstelle_id: 0,
            unternehmen_id: 0,
            ausgefuehrt: false,
            datum: "",
            uhrzeit: "",
            preis: 0,
            mehrwertsteuer: "",
            fahrtinfo: "",
            gruppe_id: "",
            info: "",
            ks_real: "",
            kunde: "",
          })

          setSearchMitarbeiter("")
          setSearchKostenstelle("")
          setSearchUnternehmen("")
        }
      }, "Erstellung fehlgeschlagen")
    } catch (err) {
      console.error("Fehler bei Erstellung:", err instanceof Error ? err.message : JSON.stringify(err))
      // Error wird bereits von handleApiCall behandelt
    }
  }

  useEffect(() => {
    if (selected && selected.von && selected.nach) {
      setRouteLink(createGoogleRouteLink(selected.von, selected.nach))
    } else {
      setRouteLink("")
    }
  }, [selected])

  // React Query already loads data; remove redundant manual loader

  // React Query already loads data; remove redundant manual loader


  const toggleTripSelection = (tripId: number) => {
    const newSelected = new Set(selectedTrips)
    if (newSelected.has(tripId)) {
      newSelected.delete(tripId)
    } else {
      newSelected.add(tripId)
    }
    setSelectedTrips(newSelected)
  }

  const selectAllTrips = () => {
    const allTripIds = new Set(filteredAnfragen.map((trip) => trip.id))
    setSelectedTrips(allTripIds)
  }

  const deselectAllTrips = () => {
    setSelectedTrips(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedTrips.size === 0) return

    try {
      await handleApiCall(async () => {
        // Delete selected trips in parallel instead of waiting for each request.
        await Promise.all([...selectedTrips].map((tripId) => simpleDb.anfragen.delete(tripId)))
        await refetchAnfragen()
        setSelectedTrips(new Set())
        setIsBulkDeleteDialogOpen(false)
        setDeleteMode(false)

        toast({
          title: "Erfolg",
          description: `${selectedTrips.size} Fahrten erfolgreich gelöscht`,
        })
      }, "Fahrten konnten nicht gelöscht werden. Bitte versuchen Sie es erneut.")
    } catch (error) {
      console.error("Error deleting trips:", error)
    }
  }

  useEffect(() => {
    const mit = mitarbeiter.find((m) => m.id === newAnfrage.mitarbeiter_id)
    const ks = kostenstellen.find((k) => k.id === newAnfrage.kostenstelle_id)

    // Nur automatisch setzen, wenn es wirklich einen Wert gibt:
    const autoKunde = mit?.kunde ?? ks?.kunde
    if (autoKunde && autoKunde !== newAnfrage.kunde) {
      setNewAnfrage((prev) => ({ ...prev, kunde: autoKunde }))
    }
    // WICHTIG: newAnfrage.kunde NICHT in die deps aufnehmen, sonst überschreibst du Benutzereingaben.
  }, [newAnfrage.mitarbeiter_id, newAnfrage.kostenstelle_id, mitarbeiter, kostenstellen])

  // local loading UI removed; handled by anfragenLoading below

  const applyDateFilter = () => {
    // Filter is now applied automatically through useMemo
    // Just close the dialog
    setIsFilterOpen(false)
  }

  const handleCreates = async () => {
    try {
      if (!newAnfrage.datum.trim()) {
        // Fehlermeldung anzeigen
        setShowError(true)
        setLoading(true)

        // Nach 2 Sekunden Ladebalken beenden und Banner ausblenden
        setTimeout(() => {
          setLoading(false)
          // Banner nach weiterer Sekunde verschwinden lassen
          setTimeout(() => setShowError(false), 1000)
        }, 3000)

        return
      }

      const entries = []

      const gruppeId = uuidv4()

      newAnfrage.gruppe_id = gruppeId
      if (newAnfrage.kostenstelle_id) {
        const selectedKostenstelle = kostenstellen.find((k) => k.id === newAnfrage.kostenstelle_id)
        if (selectedKostenstelle) {
          newAnfrage.ks_real = selectedKostenstelle.nummer
        }
      }

      // 1) Hinfahrt
      const entry1 = { ...newAnfrage }
      entries.push(entry1)

      if (includeReturnTrip) {
        // 2) Rückfahrt
        const newDate = new Date(newAnfrage.datum)
        if (newAnfrage.schicht === "Nacht") {
          newDate.setDate(newDate.getDate() + 1)
        } else {
          // For day shift, return trip is also next day
          newDate.setDate(newDate.getDate())
        }
        const returnEntry = {
          ...newAnfrage,
          zweck: newAnfrage.zweck === "Arbeit" ? "Nachhause" : "Arbeit",
          schicht: newAnfrage.schicht === "Nacht" ? "Tag" : "Nacht",
          datum: newDate.toISOString().split("T")[0],
          uhrzeit: returnTripTime,
          von: newAnfrage.nach,
          nach: newAnfrage.von,
          mehrwertsteuer: newAnfrage.mehrwertsteuer,
          rueckfahrt: true,
          gruppe_id: gruppeId,
          fahrtinfo: returnTripInfo,
          info: newAnfrage.info,
          ks_real: newAnfrage.ks_real,
        }
        entries.push(returnEntry)
      }

      await createFahrten(entries)
      await refetchAnfragen()

      setIsCreateDialogOpen(false)
      toast({ title: "Erfolg", description: "Fahrt erstellt" })

      setNewAnfrage({
        schicht: "",
        zweck: "",
        von: "",
        nach: "",
        mitarbeiter_id: 0,
        kostenstelle_id: 0,
        unternehmen_id: 0,
        ausgefuehrt: false,
        datum: "",
        uhrzeit: "",
        preis: 0,
        mehrwertsteuer: "",
        fahrtinfo: "",
        gruppe_id: "",
        info: "",
        ks_real: "",
        kunde: "",
      })
      setIncludeReturnTrip(false)
      setReturnTripTime("")
      setReturnTripInfo("")
      setSearchMitarbeiter("")
      setSearchUnternehmen("")
      setSearchKostenstelle("")
    } catch (err) {
      console.error("Fehler bei Erstellung:", err)
      toast({ title: "Fehler", description: "Erstellung fehlgeschlagen", variant: "destructive" })
    }
  }

  if (anfragenLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-amber-400" />
        <span className="ml-2 text-white">Lade Anfragen...</span>
      </div>
    )
  }

  async function handleToggleAusgefuehrt(anfrage: Anfrage) {
    try {
      await handleApiCall(async () => {
        // Wert umkehren
        const neuesAusgefuehrt = !anfrage.ausgefuehrt

        // Use React Query mutation for proper state management
        await updateAnfrageMutation.mutateAsync({
          id: anfrage.id,
          data: { ausgefuehrt: neuesAusgefuehrt },
        })

        toast({ title: "Aktualisiert", description: `Fahrt ist jetzt ${neuesAusgefuehrt ? "ausgeführt" : "offen"}` })

        // Refetch data to ensure UI is in sync
        await refetchAnfragen()
      }, "Status konnte nicht geändert werden")
    } catch (err) {
      console.error(err)
      // Error wird bereits von handleApiCall behandelt
    }
  }

  // Verbesserte Error-Behandlung für API-Calls
  const handleApiCall = async (apiCall: () => Promise<any>, errorMessage: string) => {
    try {
      return await apiCall()
    } catch (error: any) {
      console.error("API-Fehler:", error)

      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    }
  }

  const handlePressStart = (tripId: number) => {
    longPressTriggeredRef.current = false
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      setDeleteMode(true)
      setSelectedTrips(new Set([tripId]))
      setShakeTripId(tripId)
      setTimeout(() => setShakeTripId(null), 1000)
    }, 500)
  }

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Such- und Filterbereich */}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-2 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-gray-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-400">Fahrtverwaltung</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Fahrten</h1>
            <p className="mt-1 text-sm text-gray-400">Anfragen planen, prüfen und verwalten</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full bg-amber-400 text-gray-950 hover:bg-amber-300 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Fahrt erstellen
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={exportExcel} variant="outline" className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Excel herunterladen</Button>
          {deleteMode && (
            <>
              {selectedTrips.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {selectedTrips.size} Fahrten löschen
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteMode(false)
                  setSelectedTrips(new Set())
                }}
                className="border-gray-700 text-black hover:bg-gray-800"
              >
                Löschmodus beenden
              </Button>
            </>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
          <SearchAutocomplete
            anfragen={anfragen}
            allVisible={allVisible}
            setAllVisible={setAllVisible}
            onSearch={setSearchTerm}
          />

          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-white border-gray-700 bg-gray-800 hover:bg-gray-700">
                Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Datumsbereich</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-800 text-white"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-800 text-white"
                />
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    applyDateFilter()
                  }}
                  className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 w-full"
                >
                  Anwenden
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate("")
                    setEndDate("")
                    setIsFilterOpen(false)
                  }}
                  className="text-black border-gray-700 hover:bg-gray-800 w-full"
                >
                  Zurücksetzen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {deleteMode && filteredAnfragen.length > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllTrips}
              className="border-gray-600 text-black hover:bg-gray-800"
            >
              Alle auswählen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllTrips}
              className="border-gray-600 text-black hover:bg-gray-800"
            >
              Keine auswählen
            </Button>
          </div>
        )}
      </div>

      {/* Liste der Fahrten */}
      <div className="mx-auto mb-20 mt-8 w-full max-w-7xl space-y-8 px-2 sm:px-4 lg:px-8">
        {Object.entries(groupByDate(filteredAnfragen)).map(([day, items]) => (
          <section key={day} className="text-left">
            <h2 className="text-lg font-semibold text-white mb-3">{day}</h2>
            <div className="flex flex-col space-y-2">
              {items.map((a) => (
                <div
                  className={`flex min-w-0 items-center justify-between rounded-xl border border-gray-700/80 bg-gray-900 px-4 py-3 shadow-sm transition-colors hover:border-gray-600 hover:bg-gray-800 ${deleteMode && a.id === shakeTripId ? 'shake' : ''}`}
                  key={a.id}
                  onMouseDown={() => handlePressStart(a.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(a.id)}
                  onTouchEnd={handlePressEnd}
                  onTouchCancel={handlePressEnd}
                >
                  <div className="flex items-center gap-3 w-full">
                    {deleteMode && (
                      <Checkbox
                        checked={selectedTrips.has(a.id)}
                        onCheckedChange={() => toggleTripSelection(a.id)}
                        className="border-gray-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-gray-900"
                      />
                    )}
                    <button
                      onClick={() => {
                        if (longPressTriggeredRef.current) return
                        setSelected(a)
                      }}
                      className="flex items-center justify-between w-full bg-gray-800 px-2 sm:px-4 py-2 hover:bg-gray-700 rounded focus:outline-none focus:ring-0"
                    >
                      <div className="flex flex-col text-left overflow-hidden">
                        <div className="flex flex-row items-center gap-2 sm:gap-4">
                          <span className="font-medium text-white truncate max-w-[40vw] sm:max-w-none">{a.mitarbeiter?.name}</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              a.ausgefuehrt ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {a.ausgefuehrt ? "Ausgeführt" : "Offen"}
                          </span>
                        </div>
                        <span className="text-sm text-green-400">{formatUhrzeit(a.uhrzeit)}</span>

                        <span className="text-sm text-white truncate">
                          {renderShortRoute(shortAddr(a.von), shortAddr(a.nach))}
                        </span>
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </button>
                  </div>
                  <div className="flex space-x-2 border-l border-gray-700 pl-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-black hover:bg-gray-800 focus:outline-none focus:ring-0 active:opacity-90"
                      onClick={() => handleToggleAusgefuehrt(a)}
                    >
                      {a.ausgefuehrt ? "offen" : "Ausgeführt"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Button: 3 Tage mehr laden */}
      <div className="flex justify-center space-x-4 mt-6 mb-12 px-4">
        <Button variant="outline" onClick={() => { setDisplayDays(Number.POSITIVE_INFINITY); setAllVisible(true); }} className="border-gray-700 text-black hover:bg-gray-800">
          Alle Fahrten anzeigen
        </Button>
      </div>

      {/* Fullscreen-Popup */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {/* Overlay */}

        {/* Content */}
        <DialogContent
          data-copy-host
          className="border-gray-800 bg-gray-900 sm:max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Fahrtinformationen – {selected?.zweck === "Arbeit" ? "Hinfahrt" : "Rückfahrt"}</DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          {selected && (
            <div className="p-4 flex flex-col gap-4">
              {/* Origin and Destination */}
              <div className="max-w-md mx-auto p-6">
                <h1 className="text-lg font-semibold mb-2 text-white underline">Fahrt-Detail</h1>

                <div className="space-y-3 text-white">
                  <p>
                    <strong>Von:</strong> {selected.von}
                  </p>
                  <p>
                    <strong>Nach:</strong> {selected.nach}
                  </p>
                  <p>
                    <strong>Datum:</strong> {selected.datum}
                  </p>
                  <p>
                    <strong>Uhrzeit:</strong> {selected.uhrzeit}
                  </p>
                  <p>
                    <strong>Zweck:</strong> {selected.zweck}
                  </p>
                  <p>
                    <strong>Preis:</strong> {selected.preis}
                  </p>
                  <a href={routeLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 ">
                    <p>
                      <strong>Route in Google Maps anzeigen</strong>
                    </p>
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button className="w-full" onClick={() => setIsRoundTripDialogOpen(true)}>
                  Hin & Rückfahrt bestellen
                </Button>

                <Button className="w-full mt-2" onClick={() => setIsReturnDialogOpen(true)}>
                  Nur Rückfahrt bestellen
                </Button>

                {/* Multi-Tage Buchung (erneut) */}
                {selected && (
                  <MultiDayRebookDialog
                    base={selected}
                    onComplete={async (entries) => {
                      await createFahrten(entries)
                      await refetchAnfragen()
                      setSelected(null)
                    }}
                  >
                    <Button variant="outline" className="w-full bg-white">
                      Fahrt erneut buchen
                    </Button>
                  </MultiDayRebookDialog>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => {
                      setCurrentAnfrage(selected)
                      setIsEditDialogOpen(true)
                      // Close the details dialog to avoid nested dialogs and focus loops
                      setSelected(null)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Bearbeiten</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!selected) return

                      const text =
                        `Name: ${selected.mitarbeiter?.name ?? ""}\n` +
                        `Handynummer: ${selected.mitarbeiter?.handynummer ?? ""}\n` +
                        `Von: ${selected.von ?? ""}\n` +
                        `Nach: ${selected.nach ?? ""}`

                      copyToClipboard(text)
                    }}
                  >
                    <Copy className="h-5 w-5 text-gray-400" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Neuer Fahrt-Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Neue Anfrage erstellen</DialogTitle>
            <DialogDescription className="text-gray-400">
              Füllen Sie die Details aus, um eine neue Anfrage zu erstellen
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Zweck */}
            <div className="space-y-2">
              <Label htmlFor="zweck" className="text-white">
                Zweck
              </Label>
              <Select value={newAnfrage.zweck} onValueChange={(val) => setNewAnfrage({ ...newAnfrage, zweck: val })}>
                <SelectTrigger id="zweck" className="border-gray-700 bg-gray-800 text-white">
                  <SelectValue placeholder="Zweck auswählen" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800 text-white">
                  <SelectItem value="Arbeit">Arbeit</SelectItem>
                  <SelectItem value="Nachhause">Nachhause</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {/* Schicht */}
              <div className="space-y-2">
                <Label htmlFor="schicht" className="text-white">
                  Schicht
                </Label>
                <Select
                  value={newAnfrage.schicht}
                  onValueChange={(val) => setNewAnfrage({ ...newAnfrage, schicht: val })}
                >
                  <SelectTrigger id="schicht" className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue placeholder="Schicht auswählen" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800 text-white">
                    <SelectItem value="Tag">Tag</SelectItem>
                    <SelectItem value="Nacht">Nacht</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="datum" className="text-white">
                Datum
              </Label>
              <Input
                id="datum"
                type="date"
                value={newAnfrage.datum}
                onChange={(e) => setNewAnfrage({ ...newAnfrage, datum: e.target.value })}
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uhrzeit" className="text-white">
                Uhrzeit
              </Label>
              <Input
                id="uhrzeit"
                type="time"
                value={newAnfrage.uhrzeit}
                onChange={(e) => setNewAnfrage({ ...newAnfrage, uhrzeit: e.target.value })}
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preis" className="text-white">
                Preis
              </Label>
              <Input
                id="preis"
                type="number"
                onChange={(e) => setNewAnfrage({ ...newAnfrage, preis: Number.parseFloat(e.target.value) || 0 })} // Preis aktualisieren
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 appearance-none" // appearance-none entfernt die Spinner
                style={{ MozAppearance: "textfield" }} // Entfernt die Spinner in Firefox
              />
            </div>
            <div className="space-y-2">
              <div className="mb-4">
                <Label htmlFor="mitarbeiter" className="text-white">
                  Mitarbeiter
                </Label>
                <Input
                  id="mitarbeiter-search"
                  value={searchMitarbeiter}
                  onChange={(e) => setSearchMitarbeiter(e.target.value)}
                  placeholder="Name oder Adresse"
                  className="w-full border-gray-700 bg-gray-800 text-white"
                />
                {searchMitarbeiter && filteredMitarbeiter.length > 0 && (
                  <ul className="border rounded bg-white shadow-md max-h-48 overflow-y-auto mt-1">
                    {filteredMitarbeiter.map((m) => (
                      <li
                        key={m.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setNewAnfrage((prev) => ({ ...prev, mitarbeiter_id: m.id, von: m.hausanschrift }))
                          setSearchMitarbeiter(`${m.name} – ${m.hausanschrift}`)
                        }}
                      >
                        <strong>{m.name}</strong> – {m.hausanschrift}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unternehmen" className="text-white">
                Unternehmen
              </Label>
              <Input
                id="unternehmen-search"
                value={searchUnternehmen}
                onChange={(e) => {
                  setSearchUnternehmen(e.target.value)
                  setShowUnternehmenList(true)
                }}
                onBlur={() => setTimeout(() => setShowUnternehmenList(false), 100)}
                placeholder="Unternehmensname"
                className="w-full border-gray-700 bg-gray-800 text-white"
              />
              {showUnternehmenList && searchUnternehmen && filteredUnternehmen.length > 0 && (
                <ul className="border rounded bg-white shadow-md max-h-48 overflow-y-auto mt-1">
                  {filteredUnternehmen.map((u) => (
                    <li
                      key={u.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => {
                        setNewAnfrage((prev) => ({ ...prev, unternehmen_id: u.id }))
                        setSearchUnternehmen(u.name)
                        setShowUnternehmenList(false)
                      }}
                    >
                      {u.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <div className="mb-4">
                <Label htmlFor="kostenstelle-search" className="text-white">
                  Kostenstelle
                </Label>
                <Input
                  id="kostenstelle-search"
                  value={searchKostenstelle}
                  onChange={(e) => setSearchKostenstelle(e.target.value)}
                  placeholder="ID oder Adresse"
                  className="w-full border-gray-700 bg-gray-800 text-white"
                />
                {searchKostenstelle && filteredKostenstellen.length > 0 && (
                  <ul className="border rounded bg-white shadow-md max-h-48 overflow-y-auto mt-1">
                    {filteredKostenstellen.map((k) => (
                      <li
                        key={k.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setNewAnfrage((prev) => ({ ...prev, kostenstelle_id: k.id, nach: k.adresse }))
                          setSearchKostenstelle(`ID ${k.id} – ${k.adresse}`)
                        }}
                      >
                        <strong>ID {k.id}</strong> – {k.adresse}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
              <div className="space-y-2">
                <Label htmlFor="von" className="text-white">
                  Von
                </Label>
                <Input
                  id="von"
                  placeholder="Startort"
                  value={newAnfrage.von}
                  onChange={(e) => setNewAnfrage({ ...newAnfrage, von: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nach" className="text-white">
                  Nach
                </Label>
                <Input
                  id="nach"
                  placeholder="Zielort"
                  value={newAnfrage.nach}
                  onChange={(e) => setNewAnfrage({ ...newAnfrage, nach: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />

              </div>
              <div className="space-y-2">
                <Label htmlFor="kunde-input" className="text-white">
                  Kunde
                </Label>
                <Input
                  id="kunde-input"
                  placeholder="Kunde eingeben"
                  value={newAnfrage.kunde}
                  onChange={(e) => setNewAnfrage({ ...newAnfrage, kunde: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />

                <div className="mt-2">
                  <Label htmlFor="kunde-select" className="text-white text-sm">
                    Oder aus Liste wählen:
                  </Label>
                  <Select
                    value={newAnfrage.kunde}
                    onValueChange={(val) => setNewAnfrage({ ...newAnfrage, kunde: val })}
                  >
                    <SelectTrigger id="kunde-select" className="border-gray-700 bg-gray-800 text-white">
                      <SelectValue placeholder="Kunde auswählen" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800 text-white">
                      <SelectItem value="bipgVO">bipgVO</SelectItem>
                      <SelectItem value="bipg">bipg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ausgefuehrt"
                checked={newAnfrage.ausgefuehrt}
                onCheckedChange={(checked) => setNewAnfrage({ ...newAnfrage, ausgefuehrt: checked as boolean })}
                className="border-gray-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-gray-900 hidden"
              />
              <Label htmlFor="ausgefuehrt" className="text-white hidden">
                Ausgeführt
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mehrwertsteuer" className="text-white">
                Mehrwertsteuer
              </Label>

              <Select
                value={newAnfrage.mehrwertsteuer}
                onValueChange={(val) => setNewAnfrage({ ...newAnfrage, mehrwertsteuer: val })}
              >
                <SelectTrigger id="mehrwertsteuer" className="border-gray-700 bg-gray-800 text-white">
                  <SelectValue placeholder="Mehrwertsteuer auswählen" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800 text-white">
                  <SelectItem value="7%">7%</SelectItem>
                  <SelectItem value="19%">19%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fahrtinfo" className="text-white">
                Fahrtinfo
              </Label>
              <textarea
                id="fahrtinfo"
                value={newAnfrage.fahrtinfo || ""}
                onChange={(e) => setNewAnfrage({ ...newAnfrage, fahrtinfo: e.target.value })}
                className="w-full min-h-[100px] resize-y border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 p-2 rounded-md"
                placeholder="Zusätzliche Informationen zur Fahrt..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-return"
                checked={includeReturnTrip}
                onCheckedChange={(checked) => setIncludeReturnTrip(checked as boolean)}
                className="border-gray-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-gray-900"
              />
              <Label htmlFor="include-return" className="text-white">
                Rückfahrt hinzufügen
              </Label>
            </div>

            {includeReturnTrip && (
              <div className="space-y-2">
                <Label htmlFor="return-time" className="text-white">
                  Rückfahrt-Uhrzeit
                </Label>
                <Input
                  id="return-time"
                  type="time"
                  value={returnTripTime}
                  onChange={(e) => setReturnTripTime(e.target.value)}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rueckfahrtinfo" className="text-white">
                Rückfahrt Fahrtinfo
              </Label>
              <textarea
                id="rueckfahrtinfo"
                value={returnTripInfo}
                onChange={(e) => setReturnTripInfo(e.target.value)}
                className="w-full min-h-[100px] resize-y border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 p-2 rounded-md"
                placeholder="Zusätzliche Informationen zur Rückfahrt..."
              />
            </div>
          </div>

          {/* FIXED BANNER ganz oben im DOM */}
          {showError && (
            <div
              className="
            fixed inset-x-0 top-0 z-50 
            flex flex-col items-center 
            bg-red-600 text-white 
            shadow-lg 
            animate-slideDown
          "
            >
              <div className="w-full max-w-md py-3 px-4 text-center">Nicht alle Felder ausgefüllt!</div>
              {loading && <div className="h-1 w-full bg-white animate-progress" />}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-gray-700 text-black hover:bg-gray-800"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreates}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600 mb-3"
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoundTripDialogOpen} onOpenChange={setIsRoundTripDialogOpen}>
        <DialogContent className="bg-gray-800 max-w-md m-auto">
          <DialogHeader>
            <DialogTitle>Hin & Rückfahrt</DialogTitle>
            <DialogDescription className="text-gray-400">
              Wählen Sie die Uhrzeiten für Hin- und Rückfahrt
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rt-time-1" className="text-white">
                Hin-Fahrt (Arbeit)
              </Label>
              <Input
                id="rt-time-1"
                type="time"
                value={roundTripTime1}
                onChange={(e) => setRoundTripTime1(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-time-2" className="text-white">
                Rück-Fahrt (Nachhause)
              </Label>
              <Input
                id="rt-time-2"
                type="time"
                value={roundTripTime2}
                onChange={(e) => setRoundTripTime2(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoundTripDialogOpen(false)}
              className="border-gray-700 text-black"
            >
              Abbrechen
            </Button>
            <Button
              onClick={async () => {
                if (!selected) return
                const today = new Date().toISOString().split("T")[0]

                // Erster Eintrag: Arbeit
                const entry1 = {
                  zweck: "Arbeit" as const,
                  von: selected.von,
                  nach: selected.nach,
                  schicht: "Tag" as const,
                  datum: today,
                  uhrzeit: roundTripTime1,
                  preis: selected.preis,
                  kunde: selected.kunde,
                  mitarbeiter_id: selected.mitarbeiter_id,
                  kostenstelle_id: selected.kostenstelle_id,
                  unternehmen_id: selected.unternehmen_id,
                  ausgefuehrt: false,
                  mehrwertsteuer: selected.mehrwertsteuer,
                  fahrtinfo: selected.fahrtinfo,
                  rueckfahrt: false,
                  gruppe_id: selected.gruppe_id,
                }

                // Zweiter Eintrag: Nachhause
                const entry2 = {
                  zweck: "Nachhause" as const,
                  von: selected.nach,
                  nach: selected.von,
                  schicht: "Nacht" as const,
                  datum: today,
                  uhrzeit: roundTripTime2,
                  preis: selected.preis,
                  kunde: selected.kunde,
                  mitarbeiter_id: selected.mitarbeiter_id,
                  kostenstelle_id: selected.kostenstelle_id,
                  unternehmen_id: selected.unternehmen_id,
                  ausgefuehrt: false,
                  mehrwertsteuer: selected.mehrwertsteuer,
                  fahrtinfo: selected.fahrtinfo,
                  rueckfahrt: false,
                  gruppe_id: selected.gruppe_id,
                }

                await createFahrten([entry1, entry2])
                await refetchAnfragen()
                setIsRoundTripDialogOpen(false)
                setSelected(null)
              }}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 mb-3"
            >
              Buchen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="bg-gray-800 max-w-md m-auto">
          <DialogHeader>
            <DialogTitle>Rückfahrt</DialogTitle>
            <DialogDescription className="text-gray-400">Wähle die Uhrzeit für die Rückfahrt</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="return-time" className="text-white">
                Rückfahrt Uhrzeit
              </Label>
              <Input
                id="return-time"
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReturnDialogOpen(false)}
              className="border-gray-700 text-black"
            >
              Abbrechen
            </Button>
            <Button
              onClick={async () => {
                if (!selected) return
                // Basis-Werte aus der ausgewählten Fahrt
                const {
                  gruppe_id,
                  mehrwertsteuer,
                  von,
                  nach,
                  zweck,
                  schicht,
                  datum,
                  preis,
                  mitarbeiter_id,
                  kostenstelle_id,
                  unternehmen_id,
                  kunde,
                  fahrtinfo,
                } = selected

                // Tausche Zweck/Schicht
                const newZweck = zweck === "Arbeit" ? "Nachhause" : "Arbeit"
                const newSchicht = schicht === "Nacht" ? "Tag" : "Nacht"

                // Datum ggf. anpassen: wenn vorher Nacht, +1 Tag
                const baseDate = new Date(datum)
                if (schicht === "Nacht") {
                  baseDate.setDate(baseDate.getDate() + 1)
                }
                const newDate = baseDate.toISOString().split("T")[0]

                // Payload zusammenbauen
                const returnEntry = {
                  zweck: newZweck,
                  schicht: newSchicht,
                  datum: newDate,
                  uhrzeit: returnTime,
                  von: nach,
                  nach: von,
                  preis,
                  kunde,
                  mitarbeiter_id,
                  kostenstelle_id,
                  unternehmen_id,
                  ausgefuehrt: false,
                  mehrwertsteuer: mehrwertsteuer,
                  fahrtinfo: fahrtinfo,
                  rueckfahrt: true,
                  gruppe_id,
                }

                // Importiere und rufe Deine createFahrten-Funktion auf
                await createFahrten([returnEntry])
                await refetchAnfragen()

                setIsReturnDialogOpen(false)
                setSelected(null)
              }}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900"
            >
              Rückfahrt buchen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zentrales Bearbeiten-Dialog, außerhalb der Liste, um verschachtelte Dialogs zu vermeiden */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Anfrage bearbeiten</DialogTitle>
            <DialogDescription className="text-gray-400">Aktualisieren Sie die Anfragedaten</DialogDescription>
          </DialogHeader>
          {currentAnfrage && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-zweck" className="text-white">Zweck</Label>
                <Select value={currentAnfrage.zweck} onValueChange={(val) => setCurrentAnfrage({ ...currentAnfrage, zweck: val })}>
                  <SelectTrigger id="edit-zweck" className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue placeholder="Zweck auswählen" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800 text-white">
                    <SelectItem value="Arbeit">Arbeit</SelectItem>
                    <SelectItem value="Nachhause">Nachhause</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-schicht" className="text-white">Schicht</Label>
                <Select value={currentAnfrage.schicht} onValueChange={(val) => setCurrentAnfrage({ ...currentAnfrage, schicht: val })}>
                  <SelectTrigger id="edit-schicht" className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue placeholder="Schicht auswählen" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800 text-white">
                    <SelectItem value="Tag">Tag</SelectItem>
                    <SelectItem value="Nacht">Nacht</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-datum" className="text-white">Datum</Label>
                <Input id="edit-datum" type="date" value={currentAnfrage.datum.split("T")[0]} onChange={(e) => setCurrentAnfrage({ ...currentAnfrage, datum: e.target.value })} className="border-gray-700 bg-gray-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-uhrzeit" className="text-white">Uhrzeit</Label>
                <Input id="edit-uhrzeit" type="time" value={currentAnfrage.uhrzeit} onChange={(e) => setCurrentAnfrage({ ...currentAnfrage, uhrzeit: e.target.value })} className="border-gray-700 bg-gray-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-preis" className="text-white">Preis</Label>
                <Input id="edit-preis" type="number" value={currentAnfrage.preis.toString()} onChange={(e) => setCurrentAnfrage({ ...currentAnfrage, preis: Number.parseFloat(e.target.value) || 0 })} className="border-gray-700 bg-gray-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Mitarbeiter</Label>
                <Input value={searchMitarbeiter} onChange={(e) => setSearchMitarbeiter(e.target.value)} placeholder="Name oder Adresse" className="w-full border-gray-700 bg-gray-800 text-white" />
                {searchMitarbeiter && filteredMitarbeiter.length > 0 && (
                  <ul className="border rounded bg-white shadow-md max-h-48 overflow-y-auto mt-1">
                    {filteredMitarbeiter.map((m) => (
                      <li key={m.id} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => {
                        setCurrentAnfrage((prev) => (prev ? { ...prev, mitarbeiter_id: m.id, von: m.hausanschrift } : prev))
                        setSearchMitarbeiter(`${m.name} – ${m.hausanschrift}`)
                      }}>
                        <strong>{m.name}</strong> – {m.hausanschrift}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white">Unternehmen</Label>
                <Input value={searchUnternehmen} onChange={(e) => setSearchUnternehmen(e.target.value)} placeholder="Unternehmensname" className="w-full border-gray-700 bg-gray-800 text-white" />
                {searchUnternehmen && filteredUnternehmen.length > 0 && (
                  <ul className="border rounded bg-white shadow-md max-h-48 overflow-y-auto mt-1">
                    {filteredUnternehmen.map((u) => (
                      <li key={u.id} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => {
                        setCurrentAnfrage((prev) => (prev ? { ...prev, unternehmen_id: u.id } : prev))
                        setSearchUnternehmen(u.name)
                      }}>
                        {u.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white">Kostenstelle</Label>
                <Input value={searchKostenstelle} onChange={(e) => setSearchKostenstelle(e.target.value)} placeholder="ID oder Adresse" className="w-full border-gray-700 bg-gray-800 text-white" />
                {searchKostenstelle && filteredKostenstellen.length > 0 && (
                  <ul className="border rounded bg-white shadow-md max-h-48 overflow-y-auto mt-1">
                    {filteredKostenstellen.map((k) => (
                      <li key={k.id} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => {
                        setCurrentAnfrage((prev) => (prev ? { ...prev, kostenstelle_id: k.id, nach: k.adresse } : prev))
                        setSearchKostenstelle(`ID ${k.id} – ${k.adresse}`)
                      }}>
                        <strong>ID {k.id}</strong> – {k.adresse}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mehrwertsteuer" className="text-white">Mehrwertsteuer</Label>
                <Select value={currentAnfrage.mehrwertsteuer} onValueChange={(val) => setCurrentAnfrage({ ...currentAnfrage, mehrwertsteuer: val })}>
                  <SelectTrigger id="edit-mehrwertsteuer" className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue placeholder="Mehrwertsteuer auswählen" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800 text-white">
                    <SelectItem value="7%">7%</SelectItem>
                    <SelectItem value="19%">19%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-kunde" className="text-white">Kunde</Label>
                <Input id="edit-kunde" value={currentAnfrage.kunde} onChange={(e) => setCurrentAnfrage({ ...currentAnfrage, kunde: e.target.value })} className="border-gray-700 bg-gray-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fahrtinfo" className="text-white">Fahrtinfo</Label>
                <textarea id="fahrtinfo" value={currentAnfrage.fahrtinfo || ""} onChange={(e) => setCurrentAnfrage({ ...currentAnfrage, fahrtinfo: e.target.value })} className="w-full min-h-[100px] resize-y border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 p-2 rounded-md" placeholder="Zusätzliche Informationen zur Fahrt..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-gray-700 text-black hover:bg-gray-800">Abbrechen</Button>
            <Button onClick={handleEditAnfrage} className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600 mb-3">Änderungen speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed delete toolbar when in delete mode */}
      {deleteMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-gray-900/95 border-t border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-300">{selectedTrips.size} Fahrten ausgewählt</div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)} className="bg-red-600 hover:bg-red-700">Löschen</Button>
            <Button variant="outline" onClick={() => { setDeleteMode(false); setSelectedTrips(new Set()); }} className="border-gray-700 text-black hover:bg-gray-800">Beenden</Button>
          </div>
        </div>
      )}

      {/* Neuer-Fahrt-Button unten */}
      <div className="fixed inset-x-0 bottom-0 p-4 bg-gradient-to-t from-gray-900 to-transparent sm:hidden">
        {/* Nur auf Mobile (sm:hidden) */}
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg shadow-lg mt-5"
        >
          + Fahrt erstellen
        </Button>
      </div>

      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Mehrere Fahrten löschen</DialogTitle>
            <DialogDescription className="text-gray-400">
              Sind Sie sicher, dass Sie {selectedTrips.size} Fahrten löschen möchten? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="border-gray-700 text-black hover:bg-gray-800"
            >
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} className="bg-red-600 text-white hover:bg-red-700">
              {selectedTrips.size} Fahrten löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out 3;
        }
      `}</style>
    </div>
  )
}

// Schicht-Auswahl-Dialog
export function ShiftSelectDialog({
  current,
  onSelect,
}: { current: "Tag" | "Nacht"; onSelect: (s: "Tag" | "Nacht") => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-left bg-transparent">
          {current || "Schicht wählen"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800">
        <DialogHeader>
          <DialogTitle>Schicht auswählen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {(["Tag", "Nacht"] as const).map((s) => (
            <Button
              key={s}
              className={s === current ? "bg-amber-500 text-white" : "bg-gray-700 text-gray-200"}
              onClick={() => {
                onSelect(s)
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const formatUhrzeit = (timeString: string) => {
  // Teile den String in Stunden und Minuten auf
  const [timePart] = timeString.split("+") // Entferne den Zeitzonen-Offset
  const [hours, minutes] = timePart.split(":") // Teile in Stunden und Minuten auf
  return `${hours}:${minutes}` // Rückgabe im Format HH:mm
}

// Zweck-Auswahl-Dialog
export function PurposeSelectDialog({
  current,
  onSelect,
}: { current: "Arbeit" | "Nachhause"; onSelect: (p: "Arbeit" | "Nachhause") => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-left bg-transparent">
          {current || "Zweck wählen"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800">
        <DialogHeader>
          <DialogTitle>Zweck auswählen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {(["Arbeit", "Nachhause"] as const).map((p) => (
            <Button
              key={p}
              className={p === current ? "bg-amber-500 text-white" : "bg-gray-700 text-gray-200"}
              onClick={() => {
                onSelect(p)
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}


export function createGoogleRouteLink(rawOrigin: string, rawDestination: string): string {
  // 1. Raw‑Strings säubern: NBSP entfernen, mehrfachen Whitespace reduzieren, trimmen
  const clean = (s: string) =>
    s
      .replace(/\u00A0/g, " ") // NBSP → space
      .replace(/\s+/g, " ") // multiple spaces → single
      .trim()

  let origin = clean(rawOrigin)
  let destination = clean(rawDestination)

  // 2. Wenn kein Komma zwischen Straße und Ort, dann versuchen einzufügen
  const ensureComma = (addr: string) =>
    addr.includes(",") ? addr : addr.replace(/(\d+)\s+([A-Za-zÄÖÜäöü])/, (_, num, rest) => `${num}, ${rest}`)
  origin = ensureComma(origin)
  destination = ensureComma(destination)

  // 3. Für bessere Treffer “, Germany” anhängen, wenn nicht schon drin
  const appendCountry = (addr: string) => (/germany/i.test(addr) ? addr : `${addr}, Germany`)
  origin = appendCountry(origin)
  destination = appendCountry(destination)

  // 4. URL‑encode und Link zusammenbauen
  const o = encodeURIComponent(origin)
  const d = encodeURIComponent(destination)
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`
}
