// app/(deinPfad)/unternehmen/page.tsx  (oder wo deine Seite liegt)
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Building2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// 👉 nur dieser Import:
import { db, type Unternehmen } from "@/lib/db-client";

type NewUnternehmenForm = { name: string; nr: string };

export default function UnternehmenPage() {
  const [unternehmen, setUnternehmen] = useState<Unternehmen[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState<NewUnternehmenForm>({ name: "", nr: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [current, setCurrent] = useState<Unternehmen | null>(null);

  const fetchUnternehmen = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await db.unternehmen.getAll();
      setUnternehmen(data);
    } catch (error: any) {
      console.error("Error fetching unternehmen:", error);
      toast({
        title: "Fehler",
        description: error?.message ?? "Unternehmen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnternehmen();
  }, [fetchUnternehmen]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return unternehmen;
    return unternehmen.filter((u) => u.name.toLowerCase().includes(q));
  }, [unternehmen, searchTerm]);

  // CREATE
  const handleCreate = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isSaving) return;

      const name = createForm.name.trim();
      const nrStr = createForm.nr.trim();
      const nrParsed = Number.parseInt(nrStr, 10);

      console.log("[Create] submit", { name, nrParsed });

      if (!name || Number.isNaN(nrParsed)) {
        setCreateError("Bitte gültigen Namen und eine Nummer (Ganzzahl) eingeben.");
        return;
      }

      try {
        setIsSaving(true);
        await db.unternehmen.create({ name, nr: nrParsed });
        await fetchUnternehmen();
        setCreateForm({ name: "", nr: "" });
        setIsCreateOpen(false);
        toast({ title: "Erfolg", description: "Unternehmen erfolgreich erstellt" });
      } catch (error: any) {
        console.error("Error creating unternehmen:", error);
        setCreateError(error?.message ?? "Unternehmen konnte nicht erstellt werden.");
        toast({ title: "Fehler", description: error?.message ?? "Unternehmen konnte nicht erstellt werden.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [createForm, isSaving, fetchUnternehmen]
  );

  // UPDATE
  const handleEdit = useCallback(async () => {
    if (!current) return;
    const name = current.name.trim();
    if (!name) {
      toast({ title: "Fehler", description: "Bitte geben Sie einen Namen ein.", variant: "destructive" });
      return;
    }
    try {
      await db.unternehmen.update(current.id, { name });
      await fetchUnternehmen();
      setEditOpen(false);
      toast({ title: "Erfolg", description: "Unternehmen erfolgreich aktualisiert" });
    } catch (error: any) {
      console.error("Error updating unternehmen:", error);
      toast({ title: "Fehler", description: error?.message ?? "Unternehmen konnte nicht aktualisiert werden.", variant: "destructive" });
    }
  }, [current, fetchUnternehmen]);

  // DELETE
  const handleDelete = useCallback(async () => {
    if (!current) return;
    try {
      await db.unternehmen.delete(current.id);
      setUnternehmen((prev) => prev.filter((u) => u.id !== current.id)); // optimistisch
      setDeleteOpen(false);
      toast({ title: "Erfolg", description: "Unternehmen erfolgreich gelöscht" });
    } catch (error: any) {
      console.error("Error deleting unternehmen:", error);
      toast({ title: "Fehler", description: error?.message ?? "Unternehmen konnte nicht gelöscht werden.", variant: "destructive" });
    }
  }, [current]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <span className="ml-2 text-white">Unternehmen werden geladen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Unternehmen</h1>
          <p className="text-gray-400">Verwalten Sie Ihre Unternehmen</p>
        </div>

        {/* CREATE */}
        <Dialog
          open={isCreateOpen}
          onOpenChange={(o) => {
            setIsCreateOpen(o);
            if (!o) {
              setCreateError(null);
              setCreateForm({ name: "", nr: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600">
              <Plus className="mr-2 h-4 w-4" /> Unternehmen erstellen
            </Button>
          </DialogTrigger>

          <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-white">Neues Unternehmen erstellen</DialogTitle>
                <DialogDescription className="text-gray-400">Name und Nummer des neuen Unternehmens eingeben</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    className="border-gray-700 bg-gray-800 text-white"
                    placeholder="Name eingeben"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nr" className="text-white">Nummer</Label>
                  <Input
                    id="nr"
                    inputMode="numeric"
                    pattern="\d*"
                    value={createForm.nr}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nr: e.target.value }))}
                    className="border-gray-700 bg-gray-800 text-white"
                    placeholder="z. B. 1001"
                  />
                </div>

                {createError && <div className="text-sm text-red-400">{createError}</div>}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-gray-700 text-black hover:bg-gray-800 hover:text-white">
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Speichern...
                    </>
                  ) : (
                    "Erstellen"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Unternehmen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-700 bg-gray-800 pl-9 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Alle Unternehmen</CardTitle>
          <CardDescription className="text-gray-400">Zeige {filtered.length} Unternehmen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-right text-gray-400">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((u) => (
                    <TableRow key={u.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-green-400" />
                          {u.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() => {
                              setCurrent(u);
                              setEditOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => {
                              setCurrent(u);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Löschen</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-gray-400">
                      Keine Unternehmen gefunden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* EDIT */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setCurrent(null); }}>
        <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Unternehmen bearbeiten</DialogTitle>
            <DialogDescription className="text-gray-400">Aktualisieren Sie den Namen des Unternehmens</DialogDescription>
          </DialogHeader>
          {current && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-white">Name</Label>
                <Input
                  id="edit-name"
                  value={current.name}
                  onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-700 text-black hover:bg-gray-800 hover:text-white">
              Abbrechen
            </Button>
            <Button onClick={handleEdit} className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 hover:from-amber-500 hover:to-yellow-600">
              Änderungen speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setCurrent(null); }}>
        <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Unternehmen löschen</DialogTitle>
            <DialogDescription className="text-gray-400">
              Sind Sie sicher, dass Sie dieses Unternehmen löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-700 text-black hover:bg-gray-800 hover:text-white">
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
