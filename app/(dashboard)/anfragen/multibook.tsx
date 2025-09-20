// 🧾 Komponente: MultiDayRebookDialog mit Hin- und Rückfahrten und bearbeitbarem Datum
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { db, type Anfrage, type Mitarbeiter, type Unternehmen, type Kostenstelle } from "@/lib/supabase"




export function MultiDayRebookDialog({ base, children, onComplete }: {
  base: Anfrage;
  children: React.ReactNode;
  onComplete: (entries: Omit<Anfrage, "id" | "mitarbeiter" | "unternehmen" | "kostenstelle">[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"count" | "plan">("count");
  const [days, setDays] = useState(1);
  const [dates, setDates] = useState<string[]>([]);
  const [plan, setPlan] = useState<Record<string, { schicht: "Tag" | "Nacht"; zweck: "Arbeit" | "Nachhause"; zeit: string; rueckzeit: string; datum: string }>>({});

  const baseDate = new Date(base.datum);

  function initDates(n: number) {
  const now = new Date();
  const defaultTime = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const arr = Array.from({ length: n }, (_, i) => {
    // ⬇️ +1 Tag gegenüber baseDate
    const dt = new Date(baseDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    return dt.toISOString().split("T")[0];
  });

  setDates(arr);
  setPlan(
    Object.fromEntries(
      arr.map((d) => [
        d,
        {
          schicht: base.schicht as any,
          zweck: base.zweck as any,
          zeit: defaultTime,
          rueckzeit: defaultTime,
          datum: d,
        },
      ])
    )
  );
  setStep("plan");
}


  function reset() {
    setStep("count");
    setDays(1);
    setDates([]);
    setPlan({});
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-gray-800 max-w-md mx-auto px-4 py-2">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === "count" ? "Für wie viele Tage?" : "Fahrtdetails pro Tag"}
          </DialogTitle>
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
          <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between text-gray-400 text-sm px-1">
              <span>Datum</span>
              <span>Zweck</span>
              <span>Schicht</span>
              <span>Uhr</span>
              <span>R_Uhr</span>
            </div>
            {dates.map((d) => {
              const { schicht, zweck, zeit, rueckzeit, datum } = plan[d];
              const rueckSchicht = schicht === "Tag" ? "Nacht" : "Tag";
              const rueckZweck = zweck === "Arbeit" ? "Nachhause" : "Arbeit";
              const rueckDatum = new Date(datum);
              if (schicht === "Nacht") rueckDatum.setDate(rueckDatum.getDate() + 1);
              const rueckDatumStr = rueckDatum.toISOString().split("T")[0];

              return (
                <div key={d} className="border border-gray-600 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      type="date"
                      value={datum}
                      onChange={(e) => setPlan((p) => ({ ...p, [d]: { ...p[d], datum: e.target.value } }))}
                      className="bg-gray-700 text-white w-[135px]"
                    />
                    <PurposeSelectDialog
                      current={zweck}
                      onSelect={(z) => setPlan((p) => ({ ...p, [d]: { ...p[d], zweck: z } }))}
                    />
                    <ShiftSelectDialog
                      current={schicht}
                      onSelect={(s) => setPlan((p) => ({ ...p, [d]: { ...p[d], schicht: s } }))}
                    />
                    <Input
                      type="time"
                      value={zeit}
                      onChange={(e) => setPlan((p) => ({ ...p, [d]: { ...p[d], zeit: e.target.value } }))}
                      className="bg-gray-700 text-white w-[90px]"
                    />
                    <Input
                      type="time"
                      value={rueckzeit}
                      onChange={(e) => setPlan((p) => ({ ...p, [d]: { ...p[d], rueckzeit: e.target.value } }))}
                      className="bg-gray-700 text-white w-[90px]"
                    />
                  </div>
                  <div className="text-gray-300 text-sm pt-1">
                    Rückfahrt: {format(new Date(rueckDatumStr), "dd.MM.yyyy")} — {rueckSchicht}, {rueckZweck}, {rueckzeit} Uhr
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="pt-4">
          {step === "count" ? (
            <Button onClick={() => initDates(days)}>Weiter</Button>
          ) : (
            <Button
              onClick={() => {
                let entries: Omit<Anfrage, "id" | "mitarbeiter" | "unternehmen" | "kostenstelle">[] = [];
                dates.forEach((d) => {
                  const { schicht, zweck, zeit, rueckzeit, datum } = plan[d];
                  // Ensure a group id for paired rides
                  const groupId = base.gruppe_id || "";
                  const hinfahrt = {
                    datum,
                    von: base.von,
                    nach: base.nach,
                    schicht: schicht as "Tag" | "Nacht",
                    zweck: zweck as "Arbeit" | "Nachhause",
                    uhrzeit: zeit,
                    preis: base.preis,
                    mitarbeiter_id: base.mitarbeiter_id,
                    kostenstelle_id: base.kostenstelle_id,
                    unternehmen_id: base.unternehmen_id,
                    ausgefuehrt: false,
                    kunde: base.kunde,
                    mehrwertsteuer: base.mehrwertsteuer,
                    fahrtinfo: base.fahrtinfo,
                    gruppe_id: groupId
                  };

                  const rueckDatum = new Date(datum);
                  if (schicht === "Nacht") rueckDatum.setDate(rueckDatum.getDate() + 1);
                  const rueckfahrt = {
                    datum: rueckDatum.toISOString().split("T")[0],
                    von: base.nach,
                    nach: base.von,
                    schicht: (schicht === "Tag" ? "Nacht" : "Tag") as "Tag" | "Nacht",
                    zweck: (zweck === "Arbeit" ? "Nachhause" : "Arbeit") as "Arbeit" | "Nachhause",
                    uhrzeit: rueckzeit,
                    preis: base.preis,
                    mitarbeiter_id: base.mitarbeiter_id,
                    kostenstelle_id: base.kostenstelle_id,
                    unternehmen_id: base.unternehmen_id,
                    ausgefuehrt: false,
                    kunde: base.kunde,
                    mehrwertsteuer: base.mehrwertsteuer,
                    fahrtinfo: base.fahrtinfo,
                    gruppe_id: groupId
                  };

                  entries.push(hinfahrt, rueckfahrt);
                });
                onComplete(entries);
                setOpen(false);
              }}
            >
              Buchung abschließen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Schicht-Auswahl-Dialog
export function ShiftSelectDialog({ current, onSelect }: { current: "Tag" | "Nacht"; onSelect: (s: "Tag" | "Nacht") => void }) {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-left">{current || "Schicht wählen"}</Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800">
        <DialogHeader><DialogTitle>Schicht auswählen</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {(["Tag", "Nacht"] as const).map(s => (
            <Button key={s} className={s === current ? "bg-amber-500 text-white" : "bg-gray-700 text-gray-200"} onClick={() => {
              onSelect(s)
              setOpen(false)
            }}>
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
    const [timePart] = timeString.split('+'); // Entferne den Zeitzonen-Offset
    const [hours, minutes] = timePart.split(':'); // Teile in Stunden und Minuten auf
    return `${hours}:${minutes}`; // Rückgabe im Format HH:mm
};

// Zweck-Auswahl-Dialog
export function PurposeSelectDialog({ current, onSelect }: { current: "Arbeit" | "Nachhause"; onSelect: (p: "Arbeit" | "Nachhause") => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-left">{current || "Zweck wählen"}</Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800">
        <DialogHeader><DialogTitle>Zweck auswählen</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {(["Arbeit", "Nachhause"] as const).map(p => (
            <Button key={p} className={p === current ? "bg-amber-500 text-white" : "bg-gray-700 text-gray-200"} onClick={() => {
              onSelect(p)
              setOpen(false)
            }}>
              {p}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
