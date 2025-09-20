import { supabase } from "@/lib/supabase-browser"

// Define types for our database tables
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
  rueckfahrt?: boolean
  info?: string
  ks_real?: string
  user_id?: string
  // Joined data
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

export type Unternehmen = {
  id: number
  name: string
  user_id?: string
  nr?: number | null
}

export type Kostenstelle = {
  id: number
  adresse: string
  nummer: string
  kunde: string
  getbipg?: string
  user_id?: string
}

export type Profile = {
  id: string
  email: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

// Type aliases for backward compatibility
export type Address = Kostenstelle
export type Employee = Mitarbeiter
export type Place = Unternehmen
export type Ticket = Anfrage

// Helper function to get the current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error("Fehler beim Abrufen der User ID:", error)
      return null
    }
    if (!data.user) return null
    return data.user.id
  } catch (e) {
    console.error("Fehler bei getCurrentUserId:", e)
    return null
  }
}

// Einfache Error-Behandlung ohne komplexe Retry-Logik
const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Fehler bei ${operation}:`, error)
  
  // Bei Auth-Fehlern Session-Status prüfen
  if (error?.status === 401 || error?.message?.includes('JWT') || error?.message?.includes('token')) {
    console.warn(`Auth-Fehler bei ${operation}, Session könnte abgelaufen sein`)
  }
  
  throw error
}

// Add debugging wrapper for database operations
const debugOperation = async <T>(operation: () => Promise<T>, operationName: string): Promise<T> => {
  const startTime = Date.now()
  
  
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    throw error
  }
}

export const db = {
  anfragen: {
    getAll: async () => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            console.warn("anfragen.getAll: Kein User gefunden")
            return []
          }

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

          if (error) {
            handleSupabaseError(error, "anfragen.getAll")
          }
          
          return data || []
        } catch (error) {
          console.error("Fehler in anfragen.getAll:", error)
          return []
        }
      }, "anfragen.getAll")
    },
    
    getByMid: async (mitarbeiter_id: number) => {
      return debugOperation(async () => {
        try {
          const { data, error } = await supabase
            .from("anfrageNew")
            .select(`
              *,
              mitarbeiter:mitarbeiter_id(id, name, hausanschrift, handynummer),
              kostenstelle:kostenstelle_id(id, adresse, nummer, kunde),
              unternehmen:unternehmen_id(id, name)
            `)
            .eq("mitarbeiter_id", mitarbeiter_id)

          if (error) {
            handleSupabaseError(error, "anfragen.getByMid")
          }
          
          return data || []
        } catch (error) {
          console.error("Fehler in anfragen.getByMid:", error)
          return []
        }
      }, "anfragen.getByMid")
    },

    getById: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            console.warn("anfragen.getById: Kein User gefunden")
            return null
          }

          const { data, error } = await supabase
            .from("anfrageNew")
            .select(`
              *,
              mitarbeiter:mitarbeiter_id(id, name),
              kostenstelle:kostenstelle_id(id, adresse, nummer, kunde),
              unternehmen:unternehmen_id(id, name)
            `)
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (error) {
            handleSupabaseError(error, "anfragen.getById")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in anfragen.getById:", error)
          return null
        }
      }, "anfragen.getById")
    },

    create: async (anfrage: Omit<Anfrage, "id">) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("anfrageNew")
            .insert({ ...anfrage, user_id: userId })
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "anfragen.create")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in anfragen.create:", error)
          throw error
        }
      }, "anfragen.create")
    },

    update: async (id: number, updates: Partial<Omit<Anfrage, "id">>) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          // First verify the record belongs to the current user
          const { data: existingData, error: fetchError } = await supabase
            .from("anfrageNew")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (fetchError || !existingData) {
            throw new Error("Record not found or access denied")
          }

          // Ensure user_id isn't changed during update
          const { user_id, ...safeUpdates } = updates as any

          const { data, error } = await supabase
            .from("anfrageNew")
            .update(safeUpdates)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "anfragen.update")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in anfragen.update:", error)
          throw error
        }
      }, "anfragen.update")
    },

    delete: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { error } = await supabase
            .from("anfrageNew")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)

          if (error) {
            handleSupabaseError(error, "anfragen.delete")
          }
          
          return true
        } catch (error) {
          console.error("Fehler in anfragen.delete:", error)
          throw error
        }
      }, "anfragen.delete")
    },

    syncByGruppe: async (gruppe_id: string, excludeId: number, updates: Partial<Omit<Anfrage, "id">>) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          // 1. Finde alle Anfragen mit der gleichen Gruppe_id außer der aktuellen
          const { data, error } = await supabase
            .from("anfrageNew")
            .select("id")
            .eq("gruppe_id", gruppe_id)
            .neq("id", excludeId)
            .eq("user_id", userId)

          if (error) {
            handleSupabaseError(error, "anfragen.syncByGruppe")
          }
          
          if (!data || data.length === 0) {
            console.log("[syncByGruppe] Keine weiteren Datensätze gefunden.")
            return 0
          }

          const ids = data.map(d => d.id)

          // 2. Update auf alle gefundenen IDs anwenden
          const { error: updateError } = await supabase
            .from("anfrageNew")
            .update(updates)
            .in("id", ids)
            .eq("user_id", userId)

          if (updateError) {
            handleSupabaseError(updateError, "anfragen.syncByGruppe")
          }

          return ids.length
        } catch (error) {
          console.error("Fehler in anfragen.syncByGruppe:", error)
          throw error
        }
      }, "anfragen.syncByGruppe")
    },
  },

  // Mitarbeiter
  mitarbeiter: {
    getAll: async () => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            console.warn("mitarbeiter.getAll: Kein User gefunden")
            return []
          }

          const { data, error } = await supabase
            .from("mitarbeiter")
            .select("*")
            .eq("user_id", userId)
            .order("name")

          if (error) {
            handleSupabaseError(error, "mitarbeiter.getAll")
          }
          
          return data || []
        } catch (error) {
          console.error("Fehler in mitarbeiter.getAll:", error)
          return []
        }
      }, "mitarbeiter.getAll")
    },

    getById: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("mitarbeiter")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (error) {
            handleSupabaseError(error, "mitarbeiter.getById")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in mitarbeiter.getById:", error)
          throw error
        }
      }, "mitarbeiter.getById")
    },

    create: async (mitarbeiter: Omit<Mitarbeiter, "id">) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("mitarbeiter")
            .insert({ ...mitarbeiter, user_id: userId })
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "mitarbeiter.create")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in mitarbeiter.create:", error)
          throw error
        }
      }, "mitarbeiter.create")
    },

    update: async (id: number, updates: Partial<Omit<Mitarbeiter, "id">>) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          // First verify the record belongs to the current user
          const { data: existingData, error: fetchError } = await supabase
            .from("mitarbeiter")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (fetchError || !existingData) {
            throw new Error("Record not found or access denied")
          }

          // Ensure user_id isn't changed during update
          const { user_id, ...safeUpdates } = updates as any

          const { data, error } = await supabase
            .from("mitarbeiter")
            .update(safeUpdates)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "mitarbeiter.update")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in mitarbeiter.update:", error)
          throw error
        }
      }, "mitarbeiter.update")
    },

    delete: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { error } = await supabase
            .from("mitarbeiter")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)

          if (error) {
            handleSupabaseError(error, "mitarbeiter.delete")
          }
          
          return true
        } catch (error) {
          console.error("Fehler in mitarbeiter.delete:", error)
          throw error
        }
      }, "mitarbeiter.delete")
    },
  },

  // Unternehmen
  unternehmen: {
    getAll: async () => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            console.warn("unternehmen.getAll: Kein User gefunden")
            return []
          }

          const { data, error } = await supabase
            .from("unternehmen")
            .select("*")
            .eq("user_id", userId)
            .order("name")

          if (error) {
            handleSupabaseError(error, "unternehmen.getAll")
          }
          
          return data || []
        } catch (error) {
          console.error("Fehler in unternehmen.getAll:", error)
          throw error
        }
      }, "unternehmen.getAll")
    },

    getById: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("unternehmen")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (error) {
            handleSupabaseError(error, "unternehmen.getById")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in unternehmen.getById:", error)
          throw error
        }
      }, "unternehmen.getById")
    },

    create: async (unternehmen: Omit<Unternehmen, "id">) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("unternehmen")
            .insert({ ...unternehmen, user_id: userId })
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "unternehmen.create")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in unternehmen.create:", error)
          throw error
        }
      }, "unternehmen.create")
    },

    update: async (id: number, updates: Partial<Omit<Unternehmen, "id">>) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          // First verify the record belongs to the current user
          const { data: existingData, error: fetchError } = await supabase
            .from("unternehmen")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (fetchError || !existingData) {
            throw new Error("Record not found or access denied")
          }

          // Ensure user_id isn't changed during update
          const { user_id, ...safeUpdates } = updates as any

          const { data, error } = await supabase
            .from("unternehmen")
            .update(safeUpdates)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "unternehmen.update")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in unternehmen.update:", error)
          throw error
        }
      }, "unternehmen.update")
    },

    delete: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { error } = await supabase
            .from("unternehmen")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)

          if (error) {
            handleSupabaseError(error, "unternehmen.delete")
          }
          
          return true
        } catch (error) {
          console.error("Fehler in unternehmen.delete:", error)
          throw error
        }
      }, "unternehmen.delete")
    },
  },

  // Kostenstelle
  kostenstellen: {
    getAll: async () => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            console.warn("kostenstellen.getAll: Kein User gefunden")
            return []
          }

          const { data, error } = await supabase
            .from("kostenstelle")
            .select("*")
            .eq("user_id", userId)
            .order("adresse")

          if (error) {
            handleSupabaseError(error, "kostenstellen.getAll")
          }
          
          return data || []
        } catch (error) {
          console.error("Fehler in kostenstellen.getAll:", error)
          throw error
        }
      }, "kostenstellen.getAll")
    },

    getById: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("kostenstelle")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (error) {
            handleSupabaseError(error, "kostenstellen.getById")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in kostenstellen.getById:", error)
          throw error
        }
      }, "kostenstellen.getById")
    },

    create: async (kostenstelle: Omit<Kostenstelle, "id">) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { data, error } = await supabase
            .from("kostenstelle")
            .insert({ ...kostenstelle, user_id: userId })
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "kostenstellen.create")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in kostenstellen.create:", error)
          throw error
        }
      }, "kostenstellen.create")
    },

    update: async (id: number, updates: Partial<Omit<Kostenstelle, "id">>) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          // First verify the record belongs to the current user
          const { data: existingData, error: fetchError } = await supabase
            .from("kostenstelle")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single()

          if (fetchError || !existingData) {
            throw new Error("Record not found or access denied")
          }

          // Ensure user_id isn't changed during update
          const { user_id, ...safeUpdates } = updates as any

          const { data, error } = await supabase
            .from("kostenstelle")
            .update(safeUpdates)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "kostenstellen.update")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in kostenstellen.update:", error)
          throw error
        }
      }, "kostenstellen.update")
    },

    delete: async (id: number) => {
      return debugOperation(async () => {
        try {
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new Error("Nicht angemeldet")
          }

          const { error } = await supabase
            .from("kostenstelle")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)

          if (error) {
            throw new Error("Record not found or access denied")
          }
          
          return true
        } catch (error) {
          console.error("Fehler in kostenstellen.delete:", error)
          throw error
        }
      }, "kostenstellen.delete")
    },
  },

  // Profiles
  profiles: {
    getAll: async () => {
      return debugOperation(async () => {
        try {
          const { data, error } = await supabase.from("profiles").select("*")

          if (error) {
            handleSupabaseError(error, "profiles.getAll")
          }
          
          return data || []
        } catch (error) {
          console.error("Fehler in profiles.getAll:", error)
          return []
        }
      }, "profiles.getAll")
    },

    getById: async (id: string) => {
      return debugOperation(async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single()

          if (error) {
            handleSupabaseError(error, "profiles.getById")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in profiles.getById:", error)
          throw error
        }
      }, "profiles.getById")
    },

    update: async (id: string, updates: Partial<Omit<Profile, "id">>) => {
      return debugOperation(async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", id)
            .select()
            .single()

          if (error) {
            handleSupabaseError(error, "profiles.update")
          }
          
          return data
        } catch (error) {
          console.error("Fehler in profiles.update:", error)
          throw error
        }
      }, "profiles.update")
    },
  },
}
