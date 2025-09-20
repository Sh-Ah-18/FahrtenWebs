"use client";

import { supabase } from "@/lib/simple-auth";

// --- Schicht-Logik-Helper ---
export type Schicht = "Tag" | "Nacht";

function invertSchicht(s: Schicht): Schicht {
  return s === "Tag" ? "Nacht" : "Tag";
}

// Hilfsfunktion: YYYY-MM-DD um n Tage verschieben (UTC-sicher)
function shiftDateUTC(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Ermittelt das Datum der Gegenfahrt anhand der QUELLE (Hinfahrt/Rückfahrt + Schicht)
function computePartnerDate(
  sourceZweck: "Arbeit" | "Nachhause",
  sourceSchicht: Schicht,
  sourceDatum: string
): string {
  if (sourceZweck === "Arbeit") {
    return sourceSchicht === "Tag" ? sourceDatum : shiftDateUTC(sourceDatum, 1);
  } else {
    return sourceSchicht === "Nacht" ? sourceDatum : shiftDateUTC(sourceDatum, -1);
  }
}


// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id || null
  } catch (error) {
    console.error("Error getting user ID:", error)
    return null
  }
}

// Database types
export type Anfrage = {
  id: number
  schicht: string
  zweck: string
  von: string
  nach: string
  mitarbeiter_id: number
  kostenstelle_id: number
  unternehmen_id: number
  ausgefuehrt: boolean
  kunde: string
  datum: string
  uhrzeit: string
  preis: number
  mehrwertsteuer: string
  fahrtinfo: string
  gruppe_id: string
  user_id?: string
  info?: string
  ks_real?: string
  mitarbeiter?: Mitarbeiter
  kostenstelle?: Kostenstelle
  unternehmen?: Unternehmen
}

export type Mitarbeiter = {
  id: number
  name: string
  handynummer: string
  kunde: string
  user_id?: string
  hausanschrift: string
}

export type Kostenstelle = {
  id: number
  adresse: string
  nummer: string
  kunde: string
  user_id?: string
}

export type Unternehmen = {
  id: number
  name: string
  user_id?: string
  nr?: number | null
}

// Simple database operations
export const simpleDb = {
  // Anfragen
  anfragen: {
    async getAll(): Promise<Anfrage[]> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) return []

        const { data, error } = await supabase
          .from("anfrageNew")
          .select(`
            *,
            mitarbeiter:mitarbeiter_id(id, name),
            kostenstelle:kostenstelle_id(id, adresse, nummer, kunde),
            unternehmen:unternehmen_id(id, name)
          `)
          .eq("user_id", userId)
          .order("datum", { ascending: false })

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error fetching anfragen:", error)
        return []
      }
    },

    async create(anfrage: Omit<Anfrage, "id">): Promise<Anfrage | null> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) throw new Error("Not authenticated")

        const { data, error } = await supabase
          .from("anfrageNew")
          .insert({ ...anfrage, user_id: userId })
          .select()
          .single()

        if (error) throw error
        return data
      } catch (error) {
        console.error("Error creating anfrage:", error)
        throw error
      }
    },

    async update(id: number, updates: Partial<Omit<Anfrage, "id">>): Promise<Anfrage | null> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) throw new Error("Not authenticated")

        const { data, error } = await supabase
          .from("anfrageNew")
          .update(updates)
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) throw error
        return data
      } catch (error) {
        console.error("Error updating anfrage:", error)
        throw error
      }
    },

    // Neue syncGroupTrips-Logik gemäß Vorgabe
    async syncGroupTrips(
      gruppeId: string,
      sourceId: number, // ehemals excludeId – ist die aktualisierte Fahrt
      updates: Partial<Omit<Anfrage, "id">>
    ): Promise<number> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) throw new Error("Not authenticated")

        // 1) Quellfahrt laden
        const { data: sourceTrip, error: srcErr } = await supabase
          .from("anfrageNew")
          .select("id, zweck, von, nach, datum, schicht")
          .eq("id", sourceId)
          .eq("user_id", userId)
          .single()

        if (srcErr) throw srcErr
        if (!sourceTrip) return 0

        // 2) Effektive Werte der Quelle (DB-Zustand mit den übergebenen Updates überblenden)
        const sourceZweck = (updates.zweck ?? sourceTrip.zweck) as "Arbeit" | "Nachhause"
        const sourceSchicht = (updates.schicht ?? sourceTrip.schicht) as Schicht
        const sourceDatum = updates.datum ?? sourceTrip.datum
        const sourceVon = updates.von ?? sourceTrip.von
        const sourceNach = updates.nach ?? sourceTrip.nach

        // 3) Alle Gegenfahrten in der Gruppe holen (außer Quelle)
        const { data: relatedTrips, error: fetchError } = await supabase
          .from("anfrageNew")
          .select("id, zweck, datum, schicht")
          .eq("gruppe_id", gruppeId)
          .neq("id", sourceId)
          .eq("user_id", userId)

        if (fetchError) throw fetchError
        if (!relatedTrips || relatedTrips.length === 0) return 0

        // 4) Zielwerte für Partner berechnen (aus der QUELLE, nicht aus der Ziel-Fahrt!)
        const partnerSchicht = invertSchicht(sourceSchicht)
        const partnerDatum = computePartnerDate(sourceZweck, sourceSchicht, sourceDatum)

        // 5) Updates auf jede Gegenfahrt anwenden
        for (const trip of relatedTrips) {
          const syncUpdates: Partial<Omit<Anfrage, "id">> = {}

          // a) Stammdaten-Sync wie bisher
          if (updates.mitarbeiter_id !== undefined) syncUpdates.mitarbeiter_id = updates.mitarbeiter_id
          if (updates.kostenstelle_id !== undefined) syncUpdates.kostenstelle_id = updates.kostenstelle_id
          if (updates.unternehmen_id !== undefined) syncUpdates.unternehmen_id = updates.unternehmen_id
          if (updates.mehrwertsteuer !== undefined) syncUpdates.mehrwertsteuer = updates.mehrwertsteuer
          if (updates.kunde !== undefined) syncUpdates.kunde = updates.kunde

          // b) Zweck: nur invertieren, wenn der Caller den Zweck explizit geändert hat
          if (updates.zweck !== undefined) {
            syncUpdates.zweck = sourceZweck === "Arbeit" ? "Nachhause" : "Arbeit"
          }

          // c) Schicht/Datum IMMER aus der Quelle ableiten, sobald entweder Schicht ODER Datum
          //    an der Quelle geändert wurde (oder natürlich beides).
          if (updates.schicht !== undefined || updates.datum !== undefined || updates.zweck !== undefined) {
            syncUpdates.schicht = partnerSchicht
            syncUpdates.datum = partnerDatum
          } else {
            // Falls nur andere Felder geändert wurden, nichts an Schicht/Datum der Gegenfahrt anfassen.
          }

          // d) von/nach (nur wenn vom Caller beides gesetzt wurde):
          if (updates.von !== undefined && updates.nach !== undefined) {
            // Wenn Gegenfahrt wirklich die "andere Richtung" ist, dann tauschen
            if (trip.zweck !== sourceZweck) {
              syncUpdates.von = sourceNach
              syncUpdates.nach = sourceVon
            } else {
              // gleicher Zweck (seltener Fall) → 1:1 übernehmen
              syncUpdates.von = sourceVon
              syncUpdates.nach = sourceNach
            }
          }

          const { error: updateError } = await supabase
            .from("anfrageNew")
            .update(syncUpdates)
            .eq("id", trip.id)
            .eq("user_id", userId)

          if (updateError) throw updateError
        }

        return relatedTrips.length
      } catch (error) {
        console.error("Error syncing group trips:", error)
        throw error
      }
    },

    async delete(id: number): Promise<boolean> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) throw new Error("Not authenticated")

        const { error } = await supabase.from("anfrageNew").delete().eq("id", id).eq("user_id", userId)

        if (error) throw error
        return true
      } catch (error) {
        console.error("Error deleting anfrage:", error)
        throw error
      }
    },
  },

  // Mitarbeiter
  mitarbeiter: {
    async getAll(): Promise<Mitarbeiter[]> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) return []

        const { data, error } = await supabase.from("mitarbeiter").select("*").eq("user_id", userId).order("name")

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error fetching mitarbeiter:", error)
        return []
      }
    },

    async create(mitarbeiter: Omit<Mitarbeiter, "id">): Promise<Mitarbeiter | null> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) throw new Error("Not authenticated")

        const { data, error } = await supabase
          .from("mitarbeiter")
          .insert({ ...mitarbeiter, user_id: userId })
          .select()
          .single()

        if (error) throw error
        return data
      } catch (error) {
        console.error("Error creating mitarbeiter:", error)
        throw error
      }
    },
  },

  // Kostenstellen
  kostenstellen: {
    async getAll(): Promise<Kostenstelle[]> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) return []

        const { data, error } = await supabase.from("kostenstelle").select("*").eq("user_id", userId).order("adresse")

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error fetching kostenstellen:", error)
        return []
      }
    },
  },

  // Unternehmen
  unternehmen: {
    async getAll(): Promise<Unternehmen[]> {
      try {
        const userId = await getCurrentUserId()
        if (!userId) return []

        const { data, error } = await supabase.from("unternehmen").select("*").eq("user_id", userId).order("name")

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error fetching unternehmen:", error)
        return []
      }
    },
  },
}
