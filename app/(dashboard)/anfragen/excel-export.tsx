import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { db } from "@/lib/supabase"
import { createGoogleRouteLink } from "./createGoogleRouteLink" // ⬅️ Falls dort definiert

function removeIDs(obj: any, keepFields: string[] = []) {
  const clone = { ...obj }
  for (const key of ["id", "user_id", "mitarbeiter_id", "kostenstelle_id", "unternehmen_id"]) {
    if (!keepFields.includes(key)) delete clone[key]
  }
  return clone
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("de-DE") // DD.MM.YYYY
}

export async function exportExcel() {
  // Debug: Check unternehmen object structure and nr type
  // Remove or comment this out after debugging
  // (must be after unternehmen is assigned)
  type Mitarbeiter = { name?: string; [key: string]: any }
  type Kostenstelle = { id?: number; nummer?: string; [key: string]: any }
  type Unternehmen = { nr?: number; name?: string; [key: string]: any }
  type Anfrage = {
    datum: string
    von?: string
    nach?: string
    kostenstelle?: Kostenstelle
    unternehmen?: Unternehmen
    mehrwertsteuer?: string
    fahrtinfo?: string
    mitarbeiter?: Mitarbeiter
    kunde?: string
    [key: string]: any
  }



  const [mitarbeiter, kostenstellen, unternehmen, anfragen]: [
    Mitarbeiter[],
    Kostenstelle[],
    Unternehmen[],
    Anfrage[]
  ] = await Promise.all([
    db.mitarbeiter.getAll(),
    db.kostenstellen.getAll(),
    db.unternehmen.getAll(),
    db.anfragen.getAll(),
  ])

  // Debug-Ausgabe 1: Unternehmen-Sample
  console.log("[DBG] unternehmen sample (3):",
    unternehmen.slice(0,3).map(u => ({
      id: u?.id,
      keys: Object.keys(u || {}),
      nr: (u as any)?.nr,
      nummer: (u as any)?.nummer,
      tai_su: (u as any)?.tai_su,
      tai_su_nr: (u as any)?.tai_su_nr,
      typeof_nr: typeof (u as any)?.nr
    }))
  );

  // Helper
  const keyOf = (v: any) => (v == null ? "" : String(v));

  // Maps
  const mitarbeiterById  = new Map(mitarbeiter.map(m => [keyOf(m.id), m]));
  const kostenstelleById = new Map(kostenstellen.map(k => [keyOf(k.id), k]));
  const unternehmenById  = new Map(unternehmen.map(u => [keyOf(u.id), u]));

  // Falls 'nr' anders heißt → hier ergänzen
  const getUnternehmenNr = (u: any) =>
    u?.nr ?? u?.nummer ?? u?.tai_su ?? u?.tai_su_nr ?? null;

  // **NEU**: robustes Auflösen – funktioniert bei Objekt ODER ID
  // NEU: immer versuchen, das vollständige Unternehmen per ID zu holen und ggf. mergen
  function resolveUnternehmen(a: any) {
    const maybeObj = a?.unternehmen && typeof a.unternehmen === "object" ? a.unternehmen : undefined;
    // mögliche ID-Quellen
    const idCandidate =
      (typeof a?.unternehmen !== "object" ? a?.unternehmen : undefined) ??
      maybeObj?.id ?? a?.unternehmen_id ?? a?.unternehmens_id ?? a?.firma_id;
    const full = idCandidate != null ? unternehmenById.get(keyOf(idCandidate)) : undefined;
    // Wenn es sowohl ein „dünnes“ eingebettetes Objekt als auch ein „volles“ in der Map gibt:
    // -> mergen, aber Werte aus dem vollen Objekt (inkl. nr) haben Priorität.
    if (full || maybeObj) return { ...(maybeObj || {}), ...(full || {}) };
    return undefined;
  }

  const anfragenEnriched = anfragen.map((a) => ({
    ...a,
    mitarbeiter:  a.mitarbeiter  ?? (a.mitarbeiter_id   ? mitarbeiterById.get(keyOf(a.mitarbeiter_id))  : undefined),
    kostenstelle: a.kostenstelle ?? (a.kostenstelle_id  ? kostenstelleById.get(keyOf(a.kostenstelle_id)): undefined),
    unternehmen:  resolveUnternehmen(a),
  }));

  // Debug-Ausgabe 2: Enrichment-Stats und Beispiele
  const stats = {
    total: anfragenEnriched.length,
    withUnternehmenObj: anfragenEnriched.filter(a => a.unternehmen && typeof a.unternehmen === "object").length,
    withUnternehmenIdOnly: anfragenEnriched.filter(a => a.unternehmen && typeof a.unternehmen !== "object").length,
    withNr: anfragenEnriched.filter(a => {
      const nr = getUnternehmenNr(a.unternehmen);
      return nr != null && nr !== "";
    }).length
  };
  console.log("[DBG] anfragenEnriched stats:", stats);
  console.log("[DBG] first 5 anfragenEnriched (u.id, u.name, nr):",
    anfragenEnriched.slice(0,5).map(a => ({
      u_type: typeof a.unternehmen,
      u_id: (a.unternehmen as any)?.id ?? a.unternehmen,
      u_name: (a.unternehmen as any)?.name,
      nr: getUnternehmenNr(a.unternehmen)
    }))
  );

  mitarbeiter.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  kostenstellen.sort((a, b) => (a.id || 0) - (b.id || 0))
  unternehmen.sort((a, b) => String(getUnternehmenNr(a) ?? "").localeCompare(String(getUnternehmenNr(b) ?? ""), "de", { numeric: true }))
  anfragenEnriched.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())

  const mitarbeiterSheet = XLSX.utils.json_to_sheet(mitarbeiter.map((m) => removeIDs(m)))
  const kostenstellenSheet = XLSX.utils.json_to_sheet(kostenstellen.map((k) => removeIDs(k, ["id"])))
  // Unternehmen-Sheet: nr als String
  const unternehmenSheet = XLSX.utils.json_to_sheet(
    unternehmen.map((u) => ({
      ...removeIDs(u),
      nr: getUnternehmenNr(u) != null ? String(getUnternehmenNr(u)) : ""
    }))
  )

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, mitarbeiterSheet, "Mitarbeiter")
  XLSX.utils.book_append_sheet(wb, kostenstellenSheet, "Kostenstellen")
  XLSX.utils.book_append_sheet(wb, unternehmenSheet, "Unternehmen")

  const kundenMap: Record<string, any[]> = {}
  const sonderkunden = ["bipgVO", "Bipg"]



  anfragenEnriched.forEach((a) => {
    const k = a.kunde?.trim() || "Unbekannt"
    ;(kundenMap[k] ||= []).push(a)
  })

  const rawSheetRows: any[] = []
  const summaryRows: any[] = []

  // Einheitliche Spaltenübersicht
  const COLUMNS = [
    "Datum","Von","Nach","Ks-real","Ausgeführt","Tai-SU",
    "Mwst","Route","Info","Mitarbeiter","Kostenstelle","Kunde"
  ];

  // Helper: Excel-Spalte auf Text forcieren
  function forceTextColumn(ws: XLSX.WorkSheet, headerName: string) {
    const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[] | undefined;
    if (!headerRow) return;
    const colIndex = headerRow.indexOf(headerName);
    if (colIndex === -1) return;
    const range = XLSX.utils.decode_range(ws['!ref'] as string);
    for (let r = 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: colIndex });
      const cell = ws[addr];
      if (cell && cell.v != null) cell.t = 's';
    }
  }



  Object.entries(kundenMap).forEach(([kunde, fahrten], idx) => {
    const normalized = kunde.toLowerCase();

    const rawRows = fahrten.map((f) => {
      const u = f.unternehmen;
      const nr = getUnternehmenNr(u);
      return {
        Datum: formatDate(f.datum),
        Von: f.von || "",
        Nach: f.nach || "",
        "Ks-real": f.kostenstelle?.nummer || "",
        Ausgeführt: u?.name || "",
        "Tai-SU": (nr != null && nr !== "") ? String(nr) : "",
        Mwst: f.mehrwertsteuer || "",
        Route: f.von && f.nach ? createGoogleRouteLink(f.von, f.nach) : "",
        Info: f.fahrtinfo || "",
        Mitarbeiter: f.mitarbeiter?.name || "",
        Kostenstelle: f.kostenstelle?.id || "",
        Kunde: f.kunde || "",
      };
    });

    // Debug-Ausgabe 3: Sheet-Check (nur für ersten Kunden)
    if (idx === 0 && typeof window !== "undefined" && !(window as any).__dbgDone) {
      (window as any).__dbgDone = true;
      console.log("[DBG] rawRows first 8 (Tai-SU, Ausgeführt):",
        rawRows.slice(0,8).map(r => ({ tai_su: r["Tai-SU"], ausgefuehrt: r["Ausgeführt"] }))
      );

      const tmp = XLSX.utils.json_to_sheet(rawRows, { header: COLUMNS });
      const headerRow = XLSX.utils.sheet_to_json(tmp, { header: 1 })[0];
      const first5 = XLSX.utils.sheet_to_json(tmp, { defval: "" }).slice(0,5);
      console.log("[DBG] sheet header:", headerRow);
      console.log("[DBG] sheet first5 Tai-SU:", first5.map((r:any) => r["Tai-SU"]));
    }

    const summaryRowsKunde = [...rawRows];

    if (sonderkunden.map((k) => k.toLowerCase()).includes(normalized)) {
      const rawSheet = XLSX.utils.json_to_sheet(rawRows, { header: COLUMNS });
      forceTextColumn(rawSheet, "Tai-SU");
      const summarySheet = XLSX.utils.json_to_sheet(summaryRowsKunde, { header: COLUMNS });
      forceTextColumn(summarySheet, "Tai-SU");
      XLSX.utils.book_append_sheet(wb, rawSheet, `RAW_${kunde}`);
      XLSX.utils.book_append_sheet(wb, summarySheet, `ZUSAMMENFASSUNG_${kunde}`);
    } else {
      rawSheetRows.push({ __Kunde: `Kunde: ${kunde}` });
      rawSheetRows.push(...rawRows);
      rawSheetRows.push({});

      summaryRows.push({ __Kunde: `Kunde: ${kunde}` });
      summaryRows.push(...summaryRowsKunde);
      summaryRows.push({});
    }
  });




  if (rawSheetRows.length > 0) {
    const fahrtenRawSheet = XLSX.utils.json_to_sheet(rawSheetRows, { header: COLUMNS, skipHeader: false });
    forceTextColumn(fahrtenRawSheet, "Tai-SU");
    XLSX.utils.book_append_sheet(wb, fahrtenRawSheet, "Fahrten RAW");
  }

  if (summaryRows.length > 0) {
    const fahrtenSummarySheet = XLSX.utils.json_to_sheet(summaryRows, { header: COLUMNS, skipHeader: false });
    forceTextColumn(fahrtenSummarySheet, "Tai-SU");
    XLSX.utils.book_append_sheet(wb, fahrtenSummarySheet, "Fahrten ZUSAMMENFASSUNG");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Fahrten-Export-${Date.now()}.xlsx`)
}
