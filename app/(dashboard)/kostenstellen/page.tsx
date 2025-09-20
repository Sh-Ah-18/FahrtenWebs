"use client"

import { useState, useEffect } from "react"
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
import { Plus, Search, Edit, Trash2, MapPinned, Loader2 } from "lucide-react"
import { db, type Kostenstelle } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

export default function KostenstellenPage() {
  const [kostenstellen, setKostenstellen] = useState<Kostenstelle[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentKostenstelle, setCurrentKostenstelle] = useState<Kostenstelle | null>(null)
  const [newKostenstelle, setNewKostenstelle] = useState({
    adresse: "",
    nummer: "",
    getbipg: "",
  })

  // Fetch data
  useEffect(() => {
    const fetchKostenstellen = async () => {
      try {
        setIsLoading(true)
        const kostenstellenData = await db.kostenstellen.getAll()
        setKostenstellen(kostenstellenData)
      } catch (error) {
        console.error("Error fetching kostenstellen:", error)
        toast({
          title: "Fehler",
          description: "Kostenstellen konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchKostenstellen()
  }, [])

  const filteredKostenstellen = kostenstellen.filter(
    (k) =>
      k.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.nummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.getbipg.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCreateKostenstelle = async () => {
    try {
      if (!newKostenstelle.adresse || !newKostenstelle.nummer || !newKostenstelle.getbipg) {
        toast({
          title: "Fehler",
          description: "Bitte füllen Sie alle Felder aus.",
          variant: "destructive",
        })
        return
      }

      await db.kostenstellen.create(newKostenstelle)

      // Fetch updated kostenstellen
      const updatedKostenstellen = await db.kostenstellen.getAll()
      setKostenstellen(updatedKostenstellen)

      setNewKostenstelle({ adresse: "", nummer: "", getbipg: "" })
      setIsCreateDialogOpen(false)

      toast({
        title: "Erfolg",
        description: "Kostenstelle erfolgreich erstellt",
      })
    } catch (error) {
      console.error("Error creating kostenstelle:", error)
      toast({
        title: "Fehler",
        description: "Kostenstelle konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleEditKostenstelle = async () => {
    if (!currentKostenstelle) return

    try {
      if (!currentKostenstelle.adresse || !currentKostenstelle.nummer || !currentKostenstelle.getbipg) {
        toast({
          title: "Fehler",
          description: "Bitte füllen Sie alle Felder aus.",
          variant: "destructive",
        })
        return
      }

      await db.kostenstellen.update(currentKostenstelle.id, {
        adresse: currentKostenstelle.adresse,
        nummer: currentKostenstelle.nummer,
        getbipg: currentKostenstelle.getbipg,
      })

      // Fetch updated kostenstellen
      const updatedKostenstellen = await db.kostenstellen.getAll()
      setKostenstellen(updatedKostenstellen)

      setIsEditDialogOpen(false)

      toast({
        title: "Erfolg",
        description: "Kostenstelle erfolgreich aktualisiert",
      })
    } catch (error) {
      console.error("Error updating kostenstelle:", error)
      toast({
        title: "Fehler",
        description: "Kostenstelle konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteKostenstelle = async () => {
    if (!currentKostenstelle) return

    try {
      await db.kostenstellen.delete(currentKostenstelle.id)

      // Update local state
      setKostenstellen(kostenstellen.filter((k) => k.id !== currentKostenstelle.id))

      setIsDeleteDialogOpen(false)

      toast({
        title: "Erfolg",
        description: "Kostenstelle erfolgreich gelöscht",
      })
    } catch (error) {
      console.error("Error deleting kostenstelle:", error)
      toast({
        title: "Fehler",
        description: "Kostenstelle konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <span className="ml-2 text-white">Kostenstellen werden geladen...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Kostenstellen</h1>
          <p className="text-gray-400">Verwalten Sie Ihre Kostenstellen</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600">
              <Plus className="mr-2 h-4 w-4" /> Kostenstelle erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Neue Kostenstelle erstellen</DialogTitle>
              <DialogDescription className="text-gray-400">
                Füllen Sie die Details aus, um eine neue Kostenstelle zu erstellen
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adresse" className="text-white">
                  Adresse
                </Label>
                <Input
                  id="adresse"
                  placeholder="Adresse eingeben"
                  value={newKostenstelle.adresse}
                  onChange={(e) => setNewKostenstelle({ ...newKostenstelle, adresse: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nummer" className="text-white">
                  Nummer
                </Label>
                <Input
                  id="nummer"
                  placeholder="Nummer eingeben"
                  value={newKostenstelle.nummer}
                  onChange={(e) => setNewKostenstelle({ ...newKostenstelle, nummer: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="getbipg" className="text-white">
                  GETBIPG
                </Label>
                <Input
                  id="getbipg"
                  placeholder="GETBIPG eingeben"
                  value={newKostenstelle.getbipg}
                  onChange={(e) => setNewKostenstelle({ ...newKostenstelle, getbipg: e.target.value })}
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
                onClick={handleCreateKostenstelle}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600"
              >
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Kostenstellen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-700 bg-gray-800 pl-9 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Alle Kostenstellen</CardTitle>
          <CardDescription className="text-gray-400">
            Zeige {filteredKostenstellen.length} Kostenstellen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Adresse</TableHead>
                  <TableHead className="text-gray-400">Nummer</TableHead>
                  <TableHead className="text-gray-400">GETBIPG</TableHead>
                  <TableHead className="text-right text-gray-400">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKostenstellen.length > 0 ? (
                  filteredKostenstellen.map((kostenstelle) => (
                    <TableRow key={kostenstelle.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-rose-400" />
                          {kostenstelle.adresse}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{kostenstelle.nummer}</TableCell>
                      <TableCell className="text-gray-300">{kostenstelle.getbipg}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Edit button and dialog */}
                          <Dialog
                            open={isEditDialogOpen && currentKostenstelle?.id === kostenstelle.id}
                            onOpenChange={(open) => {
                              setIsEditDialogOpen(open)
                              if (open) setCurrentKostenstelle(kostenstelle)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-white"
                                onClick={() => setCurrentKostenstelle(kostenstelle)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Bearbeiten</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-white">Kostenstelle bearbeiten</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                  Aktualisieren Sie die Kostenstellendaten
                                </DialogDescription>
                              </DialogHeader>
                              {currentKostenstelle && (
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-adresse" className="text-white">
                                      Adresse
                                    </Label>
                                    <Input
                                      id="edit-adresse"
                                      value={currentKostenstelle.adresse}
                                      onChange={(e) =>
                                        setCurrentKostenstelle({ ...currentKostenstelle, adresse: e.target.value })
                                      }
                                      className="border-gray-700 bg-gray-800 text-white"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-nummer" className="text-white">
                                      Nummer
                                    </Label>
                                    <Input
                                      id="edit-nummer"
                                      value={currentKostenstelle.nummer}
                                      onChange={(e) =>
                                        setCurrentKostenstelle({ ...currentKostenstelle, nummer: e.target.value })
                                      }
                                      className="border-gray-700 bg-gray-800 text-white"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-getbipg" className="text-white">
                                      GETBIPG
                                    </Label>
                                    <Input
                                      id="edit-getbipg"
                                      value={currentKostenstelle.getbipg}
                                      onChange={(e) =>
                                        setCurrentKostenstelle({ ...currentKostenstelle, getbipg: e.target.value })
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
                                  onClick={handleEditKostenstelle}
                                  className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600"
                                >
                                  Änderungen speichern
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Delete button and dialog */}
                          <Dialog
                            open={isDeleteDialogOpen && currentKostenstelle?.id === kostenstelle.id}
                            onOpenChange={(open) => {
                              setIsDeleteDialogOpen(open)
                              if (open) setCurrentKostenstelle(kostenstelle)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                                onClick={() => setCurrentKostenstelle(kostenstelle)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Löschen</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-white">Kostenstelle löschen</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                  Sind Sie sicher, dass Sie diese Kostenstelle löschen möchten? Diese Aktion kann nicht
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
                                  onClick={handleDeleteKostenstelle}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Löschen
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
                    <TableCell colSpan={4} className="h-24 text-center text-gray-400">
                      Keine Kostenstellen gefunden.
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
