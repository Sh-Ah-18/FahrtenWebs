"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2, User, Loader2, MapPinned } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  useMitarbeiter,
  useCreateMitarbeiter,
  useUpdateMitarbeiter,
  useDeleteMitarbeiter,
  useAnfragenByMitarbeiter,
} from "@/hooks/use-query-hooks"
import { useDebounce } from "@/hooks/use-debounce" // We'll create this hook next
import { format, formatDate } from "date-fns"
import { de } from "date-fns/locale"

export default function MitarbeiterPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300) // PERFORMANCE: Debounce search input

  const [isRowDialogOpen, setIsRowDialogOpen] = useState(false)


  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentMitarbeiter, setCurrentMitarbeiter] = useState<{ id: number; name: string,hausanschrift: string, handynummer: string } | null>(null)
  const [newMitarbeiter, setNewMitarbeiter] = useState({
    name: "", hausanschrift: "", handynummer: "", kunde: ""
  })

  const formatDate = (dateString: string) => {
      try {
        return format(new Date(dateString), "dd.MM.yyyy", { locale: de })
      } catch (error) {
        return dateString
      }
    }

  // PERFORMANCE: Use React Query hooks for data fetching and caching
  const { data: mitarbeiter = [], isLoading, error } = useMitarbeiter()
  const createMitarbeiterMutation = useCreateMitarbeiter()
  const updateMitarbeiterMutation = useUpdateMitarbeiter()
  const deleteMitarbeiterMutation = useDeleteMitarbeiter()

   // Hook to fetch multiple anfragen by mitarbeiter ID
  const { data: anfragen = [], isLoading: anfragenLoading } = useAnfragenByMitarbeiter(
    currentMitarbeiter?.id ?? null
  )

  // Filter mitarbeiter based on search term
  const filteredMitarbeiter = mitarbeiter.filter((m) =>
    m.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
  )

  const handleCreateMitarbeiter = async () => {
    try {
      if (!newMitarbeiter.name) {
        toast({
          title: "Fehler",
          description: "Bitte geben Sie einen Namen ein.",
          variant: "destructive",
        })
        return
      }

      // PERFORMANCE: Use mutation hook instead of direct API call
      await createMitarbeiterMutation.mutateAsync(newMitarbeiter)

      setNewMitarbeiter({ name: "", hausanschrift: "", handynummer: "", kunde: "" })
      setIsCreateDialogOpen(false)

      toast({
        title: "Erfolg",
        description: "Mitarbeiter erfolgreich erstellt",
      })
    } catch (error) {
      console.error("Error creating mitarbeiter:", error)
      toast({
        title: "Fehler",
        description: "Mitarbeiter konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleEditMitarbeiter = async () => {
    if (!currentMitarbeiter) return

    try {
      if (!currentMitarbeiter.name) {
        toast({
          title: "Fehler",
          description: "Bitte geben Sie einen Namen ein.",
          variant: "destructive",
        })
        return
      }

      // PERFORMANCE: Use mutation hook instead of direct API call
      await updateMitarbeiterMutation.mutateAsync({
        id: currentMitarbeiter.id,
        data: { name: currentMitarbeiter.name },
      })

      setIsEditDialogOpen(false)

      toast({
        title: "Erfolg",
        description: "Mitarbeiter erfolgreich aktualisiert",
      })
    } catch (error) {
      console.error("Error updating mitarbeiter:", error)
      toast({
        title: "Fehler",
        description: "Mitarbeiter konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMitarbeiter = async () => {
    if (!currentMitarbeiter) return

    try {
      // PERFORMANCE: Use mutation hook instead of direct API call
      await deleteMitarbeiterMutation.mutateAsync(currentMitarbeiter.id)

      setIsDeleteDialogOpen(false)

      toast({
        title: "Erfolg",
        description: "Mitarbeiter erfolgreich gelöscht",
      })
    } catch (error) {
      console.error("Error deleting mitarbeiter:", error)
      toast({
        title: "Fehler",
        description: "Mitarbeiter konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  // PERFORMANCE: Show error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Fehler beim Laden der Daten</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900"
          >
            Neu laden
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <span className="ml-2 text-white">Mitarbeiter werden geladen...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Mitarbeiter</h1>
          <p className="text-gray-400">Verwalten Sie Ihre Mitarbeiter</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600">
              <Plus className="mr-2 h-4 w-4" /> Mitarbeiter erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Neuen Mitarbeiter erstellen</DialogTitle>
              <DialogDescription className="text-gray-400">
                Geben Sie den Namen des neuen Mitarbeiters ein
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Name eingeben"
                  value={newMitarbeiter.name}
                  onChange={(e) => setNewMitarbeiter({ ...newMitarbeiter, name: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hausanschrift" className="text-white">
                  Hausanschrift
                </Label>
                <Input
                  id="hausanschrift"
                  placeholder="Straße Nr., PLZ Stadt"
                  value={newMitarbeiter.hausanschrift}
                  onChange={(e) => setNewMitarbeiter({ ...newMitarbeiter, hausanschrift: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kunde" className="text-white">
                  Kunde (z. B. bipg)
                </Label>
                <Input
                  id="kunde"
                  placeholder="bipg, bipgVO, ..."
                  value={newMitarbeiter.kunde}
                  onChange={(e) => setNewMitarbeiter({ ...newMitarbeiter, kunde: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="border-gray-700 text-black hover:bg-gray-800 hover:text-white"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateMitarbeiter}
                disabled={createMitarbeiterMutation.isPending}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600"
              >
                {createMitarbeiterMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird erstellt...
                  </>
                ) : (
                  "Erstellen"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Mitarbeiter durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-700 bg-gray-800 pl-9 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Dialog: Fahrten des Mitarbeiters als Tabelle */}
      <Dialog open={isRowDialogOpen} onOpenChange={setIsRowDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Fahrten von {currentMitarbeiter?.name}</DialogTitle>
            <DialogDescription>Alle Anfragen aufgelistet</DialogDescription>
          </DialogHeader>

          {anfragenLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Zweck</TableHead>
                  <TableHead className="text-gray-400">Von</TableHead>
                  <TableHead className="text-gray-400">Nach</TableHead>
                  <TableHead className="text-gray-400">Mitarbeiter</TableHead>
                  <TableHead className="text-gray-400">Unternehmen</TableHead>
                  <TableHead className="text-gray-400">Datum</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anfragen.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.zweck}</TableCell>
                      <TableCell >{a.von || "N/A"}</TableCell>
                      <TableCell >{a.nach || "N/A"}</TableCell>
                      <TableCell >{a.mitarbeiter?.name || "N/A"}</TableCell>
                      <TableCell >{a.unternehmen?.name || "N/A"}</TableCell>
                      <TableCell >{formatDate(a.datum) || "N/A"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            a.ausgefuehrt ? "bg-green-500/10 text-black-400" : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {a.ausgefuehrt ? "Ausgeführt" : "Offen"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRowDialogOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Alle Mitarbeiter</CardTitle>
          <CardDescription className="text-gray-400">Zeige {filteredMitarbeiter.length} Mitarbeiter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Hausanschrift</TableHead>
                  <TableHead className="text-gray-400">Handynummer</TableHead>
                  <TableHead className="text-right text-gray-400">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMitarbeiter.length > 0 ? (
                  filteredMitarbeiter.map((mitarbeiter) => (
                    <TableRow 
                    onClick={() => {
                      setCurrentMitarbeiter(mitarbeiter)
                      setIsRowDialogOpen(true)
                    }}
                    className="hover:cursor-pointer"
                    key={mitarbeiter.id} 
                    >
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-400" />
                          {mitarbeiter.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-rose-400" />
                          {mitarbeiter.hausanschrift}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          {mitarbeiter.handynummer}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Edit button and dialog */}
                          <Dialog
                            open={isEditDialogOpen && currentMitarbeiter?.id === mitarbeiter.id}
                            onOpenChange={(open) => {
                              setIsEditDialogOpen(open)
                              if (open) setCurrentMitarbeiter(mitarbeiter)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-white"
                                onClick={() => setCurrentMitarbeiter(mitarbeiter)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Bearbeiten</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-white">Mitarbeiter bearbeiten</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                  Aktualisieren Sie den Namen des Mitarbeiters
                                </DialogDescription>
                              </DialogHeader>
                              {currentMitarbeiter && (
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-name" className="text-white">
                                      Name
                                    </Label>
                                    <Input
                                      id="edit-name"
                                      value={currentMitarbeiter.name}
                                      onChange={(e) =>
                                        setCurrentMitarbeiter({ ...currentMitarbeiter, name: e.target.value })
                                      }
                                      className="border-gray-700 bg-gray-800 text-white"
                                    />
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsEditDialogOpen(false)}
                                  className="border-gray-700 text-black hover:bg-gray-800 hover:text-white"
                                >
                                  Abbrechen
                                </Button>
                                <Button
                                  onClick={handleEditMitarbeiter}
                                  disabled={updateMitarbeiterMutation.isPending}
                                  className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600"
                                >
                                  {updateMitarbeiterMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gespeichert...
                                    </>
                                  ) : (
                                    "Änderungen speichern"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Delete button and dialog */}
                          <Dialog
                            open={isDeleteDialogOpen && currentMitarbeiter?.id === mitarbeiter.id}
                            onOpenChange={(open) => {
                              setIsDeleteDialogOpen(open)
                              if (open) setCurrentMitarbeiter(mitarbeiter)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                                onClick={() => setCurrentMitarbeiter(mitarbeiter)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Löschen</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-white">Mitarbeiter löschen</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                  Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten? Diese Aktion kann nicht
                                  rückgängig gemacht werden.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsDeleteDialogOpen(false)}
                                  className="border-gray-700 text-black hover:bg-gray-800 hover:text-white"
                                >
                                  Abbrechen
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleDeleteMitarbeiter}
                                  disabled={deleteMitarbeiterMutation.isPending}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  {deleteMitarbeiterMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gelöscht...
                                    </>
                                  ) : (
                                    "Löschen"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-gray-400">
                      Keine Mitarbeiter gefunden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
