// src/lib/db-client.ts
"use client";

import { supabase } from "@/lib/supabase-browser";

/** Minimaler Typ für die Tabelle `unternehmen` */
export type Unternehmen = {
  id: number;
  name: string;
  nr: number | null;
  user_id: string | null;
};

/** Holt zügig die User-ID (Session), fallback auf getUser mit Timeout */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  // Fallback mit Timeout, damit nichts "still" hängt
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("auth.getUser() timeout")), 6000)
  );
  const req = supabase.auth.getUser();
  const { data } = await Promise.race([req, timeout]);
  return data?.user?.id ?? null;
}

export const db = {
  unternehmen: {
    /** Alle Unternehmen des eingeloggten Users */
    async getAll(): Promise<Unternehmen[]> {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn("[db.unternehmen.getAll] no user id");
        return [];
      }
      const { data, error } = await supabase
        .from("unternehmen")
        .select("id,name,nr,user_id")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) {
        console.error("[db.unternehmen.getAll] supabase error", error);
        throw error;
      }
      return data ?? [];
    },

    /** Unternehmen erstellen (setzt user_id automatisch) */
    async create(input: { name: string; nr: number }): Promise<Unternehmen | null> {
      console.log("[db.unternehmen.create] start", input);
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error("[db.unternehmen.create] no user id");
        throw new Error("Nicht angemeldet – Session fehlt/abgelaufen.");
      }

      const { data, error } = await supabase
        .from("unternehmen")
        .insert({ ...input, user_id: userId })
        .select("id,name,nr,user_id")
        .single();

      if (error) {
        console.error("[db.unternehmen.create] supabase error", error);
        throw error;
      }
      console.log("[db.unternehmen.create] done", data);
      return data ?? null;
    },

    /** Update (Name / nr). Erzwingt Besitzer-Filter über user_id. */
    async update(
      id: number,
      updates: Partial<{ name: string; nr: number }>
    ): Promise<Unternehmen | null> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Nicht angemeldet.");

      const { data, error } = await supabase
        .from("unternehmen")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id,name,nr,user_id")
        .single();

      if (error) {
        console.error("[db.unternehmen.update] supabase error", error);
        throw error;
      }
      return data ?? null;
    },

    /** Delete (nur eigene Datensätze) */
    async delete(id: number): Promise<boolean> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Nicht angemeldet.");

      const { error } = await supabase
        .from("unternehmen")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("[db.unternehmen.delete] supabase error", error);
        throw error;
      }
      return true;
    },
  },
};
