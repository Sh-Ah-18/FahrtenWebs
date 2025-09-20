"use client"

import type React from "react"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Anfrage, Mitarbeiter, Unternehmen, Kostenstelle } from "@/lib/supabase"

// Schicht-Auswahl-Dialog
export function ShiftSelectDialog({
  current,
  onSelect,
}: { current: "Tag" | "Nacht"; onSelect: (s: "Tag" | "Nacht") => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-left bg-transparent">
          {current || "Schicht wählen"}
        </Button>
      </DialogTrigger>
      <DialogOverlay className="fixed inset-0 bg-gray-900 bg-opacity-75" />
      <DialogContent className="bg-gray-800">
        <DialogHeader>
          <DialogTitle>Schicht auswählen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {(["Tag", "Nacht"] as const).map((s) => (
            <Button
              key={s}
              className={s === current ? "bg-amber-500 text-white" : "bg-gray-700 text-gray-200"}
              onClick={() => onSelect(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline">Abbrechen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Zweck-Auswahl-Dialog
export function PurposeSelectDialog({
  current,
  onSelect,
}: { current: "Arbeit" | "Nachhause"; onSelect: (p: "Arbeit" | "Nachhause") => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-left bg-transparent">
          {current || "Zweck wählen"}
        </Button>
      </DialogTrigger>
      <DialogOverlay className="fixed inset-0 bg-gray-900 bg-opacity-75" />
      <DialogContent className="bg-gray-800">
        <DialogHeader>
          <DialogTitle>Zweck auswählen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {(["Arbeit", "Nachhause"] as const).map((p) => (
            <Button
              key={p}
              className={p === current ? "bg-amber-500 text-white" : "bg-gray-700 text-gray-200"}
              onClick={() => onSelect(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline">Abbrechen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Dialog zum Bearbeiten einer Anfrage
export function EditAnfrageDialog({
  anfrage,
  mitarbeiter,
  unternehmen,
  kostenstellen,
  onSave,
}: {
  anfrage: Anfrage
  mitarbeiter: Mitarbeiter[]
  unternehmen: Unternehmen[]
  kostenstellen: Kostenstelle[]
  onSave: (updated: Anfrage) => void
}) {
  const [form, setForm] = useState({ ...anfrage })
  return (
    <Dialog open onOpenChange={() => onSave(anfrage)}>
      <DialogOverlay className="fixed inset-0 bg-gray-900 bg-opacity-75" />
      <DialogContent className="fixed inset-0 flex items-center justify-center m-auto max-w-md bg-gray-800 p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Fahrt bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-white" htmlFor="von">
              Von
            </label>
            <Input
              id="von"
              value={form.von}
              onChange={(e) => setForm({ ...form, von: e.target.value })}
              className="bg-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-white" htmlFor="nach">
              Nach
            </label>
            <Input
              id="nach"
              value={form.nach}
              onChange={(e) => setForm({ ...form, nach: e.target.value })}
              className="bg-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-white" htmlFor="datum">
              Datum
            </label>
            <Input
              type="date"
              id="datum"
              value={format(parseISO(form.datum), "yyyy-MM-dd")}
              onChange={(e) => setForm({ ...form, datum: e.target.value })}
              className="bg-gray-700 text-white"
            />
          </div>
          <ShiftSelectDialog current={form.schicht as any} onSelect={(s) => setForm({ ...form, schicht: s })} />
          <PurposeSelectDialog current={form.zweck as any} onSelect={(p) => setForm({ ...form, zweck: p })} />
          <div className="flex items-center">
            <Checkbox
              id="edit-ausgefuehrt"
              checked={form.ausgefuehrt}
              onCheckedChange={(c) => setForm({ ...form, ausgefuehrt: Boolean(c) })}
            />
            <label htmlFor="edit-ausgefuehrt" className="ml-2 text-white">
              Ausgeführt
            </label>
          </div>
          <Select
            value={form.mitarbeiter_id.toString()}
            onValueChange={(v) => setForm({ ...form, mitarbeiter_id: Number(v) })}
          >
            <SelectTrigger className="w-full bg-gray-700 text-white">
              <SelectValue placeholder="Mitarbeiter" />
            </SelectTrigger>
            <SelectContent>
              {mitarbeiter.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.unternehmen_id.toString()}
            onValueChange={(v) => setForm({ ...form, unternehmen_id: Number(v) })}
          >
            <SelectTrigger className="w-full bg-gray-700 text-white">
              <SelectValue placeholder="Unternehmen" />
            </SelectTrigger>
            <SelectContent>
              {unternehmen.map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.kostenstelle_id.toString()}
            onValueChange={(v) => setForm({ ...form, kostenstelle_id: Number(v) })}
          >
            <SelectTrigger className="w-full bg-gray-700 text-white">
              <SelectValue placeholder="Kostenstelle" />
            </SelectTrigger>
            <SelectContent>
              {kostenstellen.map((k) => (
                <SelectItem key={k.id} value={k.id.toString()}>
                  {k.adresse} ({k.nummer})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => onSave(anfrage)}>
            Abbrechen
          </Button>
          <Button onClick={() => onSave(form)}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Dialog für Mehrtages-Buchung bei erneuter Bestellung
export function MultiDayRebookDialog({
  base,
  children,
  onComplete,
}: {
  base: Anfrage
  children: React.ReactNode
  onComplete: (entries: Omit<Anfrage, "id">[]) => void
}) {
  const [step, setStep] = useState<"count" | "plan">("count")
  const [days, setDays] = useState(1)
  const [dates, setDates] = useState<string[]>([])
  const [plan, setPlan] = useState<Record<string, { schicht: "Tag" | "Nacht"; zweck: "Arbeit" | "Nachhause" }>>({})
  const start = new Date(base.datum)

  const initDates = (n: number) => {
    const arr = Array.from(
      { length: n },
      (_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    )
    setDates(arr)
    setPlan(Object.fromEntries(arr.map((d) => [d, { schicht: base.schicht as any, zweck: base.zweck as any }])))
    setStep("plan")
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogOverlay className="fixed inset-0 bg-gray-900 bg-opacity-75" />
      <DialogContent className="bg-gray-800 max-w-lg m-auto p-4 rounded-lg">
        <DialogHeader>
          <DialogTitle>{step === "count" ? "Für wie viele Tage?" : "Schicht & Zweck pro Tag"}</DialogTitle>
        </DialogHeader>
        {step === "count" ? (
          <div className="py-4">
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-gray-700 text-white"
            />
          </div>
        ) : (
          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            {dates.map((d) => (
              <div key={d} className="flex items-center space-x-2">
                <span className="text-white">{format(new Date(d), "dd.MM.yyyy")}</span>
                <ShiftSelectDialog
                  current={plan[d].schicht}
                  onSelect={(s) => setPlan((p) => ({ ...p, [d]: { ...p[d], schicht: s } }))}
                />
                <PurposeSelectDialog
                  current={plan[d].zweck}
                  onSelect={(z) => setPlan((p) => ({ ...p, [d]: { ...p[d], zweck: z } }))}
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          {step === "count" ? (
            <Button onClick={() => initDates(days)}>Weiter</Button>
          ) : (
            <Button
              onClick={() => {
                const entries: Omit<Anfrage, "id">[] = []
                dates.forEach((d) => {
                  const { schicht, zweck } = plan[d]

                  // Hinfahrt
                  entries.push({
                    ...base,
                    datum: d,
                    schicht,
                    zweck,
                    von:
                      zweck === "Arbeit"
                        ? base.mitarbeiter?.hausanschrift || base.von
                        : base.kostenstelle?.adresse || base.nach,
                    nach:
                      zweck === "Arbeit"
                        ? base.kostenstelle?.adresse || base.nach
                        : base.mitarbeiter?.hausanschrift || base.von,
                  })

                  // Rückfahrt - always next day regardless of shift
                  const returnDate = new Date(d)
                  returnDate.setDate(returnDate.getDate() + 1)
                  const returnDateStr = returnDate.toISOString().split("T")[0]

                  const returnZweck = zweck === "Arbeit" ? "Nachhause" : "Arbeit"
                  const returnSchicht = schicht === "Nacht" ? "Tag" : "Nacht"

                  entries.push({
                    ...base,
                    datum: returnDateStr,
                    schicht: returnSchicht,
                    zweck: returnZweck,
                    von:
                      zweck === "Arbeit"
                        ? base.kostenstelle?.adresse || base.nach
                        : base.mitarbeiter?.hausanschrift || base.von,
                    nach:
                      zweck === "Arbeit"
                        ? base.mitarbeiter?.hausanschrift || base.von
                        : base.kostenstelle?.adresse || base.nach,
                    rueckfahrt: true,
                  })
                })
                onComplete(entries)
              }}
            >
              Buchen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
