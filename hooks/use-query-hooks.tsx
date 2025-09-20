"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { db } from "@/lib/supabase"
import type { Mitarbeiter, Unternehmen, Kostenstelle, Anfrage } from "@/lib/supabase"

// PERFORMANCE: Query keys for caching
const QUERY_KEYS = {
  mitarbeiter: "mitarbeiter",
  unternehmen: "unternehmen",
  kostenstellen: "kostenstellen",
  anfragen: "anfragen",
}

// PERFORMANCE: Custom hooks for Mitarbeiter
export function useMitarbeiter() {
  return useQuery<Mitarbeiter[]>({
    queryKey: [QUERY_KEYS.mitarbeiter],
    queryFn: () => db.mitarbeiter.getAll(),
  })
}

export function useAnfragenByMitarbeiter(mitarbeiterId: number | null) {
  return useQuery<Anfrage[]>({
    queryKey: [QUERY_KEYS.anfragen, mitarbeiterId],
    // nur ausführen, wenn eine ID gesetzt ist
    enabled: !!mitarbeiterId,
    // hier die Funktion wirklich aufrufen
    queryFn: () => db.anfragen.getByMid(mitarbeiterId!),
  })
}


export function useMitarbeiterById(id: number) {
  return useQuery<Mitarbeiter | null>({
    queryKey: [QUERY_KEYS.mitarbeiter, id],
    queryFn: () => db.mitarbeiter.getById(id),
    enabled: !!id, // Only run if id is provided
  })
}

export function useCreateMitarbeiter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Mitarbeiter, "id">) => db.mitarbeiter.create(data),
    onSuccess: () => {
      // PERFORMANCE: Invalidate and refetch mitarbeiter list after creating
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.mitarbeiter] })
    },
  })
}

export function useUpdateMitarbeiter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Mitarbeiter, "id">> }) =>
      db.mitarbeiter.update(id, data),
    onSuccess: (_, variables) => {
      // PERFORMANCE: Invalidate specific mitarbeiter and the list
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.mitarbeiter, variables.id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.mitarbeiter] })
    },
  })
}

export function useDeleteMitarbeiter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => db.mitarbeiter.delete(id),
    onSuccess: () => {
      // PERFORMANCE: Invalidate and refetch mitarbeiter list after deleting
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.mitarbeiter] })
    },
  })
}

// PERFORMANCE: Custom hooks for Unternehmen
export function useUnternehmen() {
  return useQuery<Unternehmen[]>({
    queryKey: [QUERY_KEYS.unternehmen],
    queryFn: () => db.unternehmen.getAll(),
  })
}

export function useUnternehmenById(id: number) {
  return useQuery<Unternehmen | null>({
    queryKey: [QUERY_KEYS.unternehmen, id],
    queryFn: () => db.unternehmen.getById(id),
    enabled: !!id,
  })
}

export function useCreateUnternehmen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Unternehmen, "id">) => db.unternehmen.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.unternehmen] })
    },
  })
}

export function useUpdateUnternehmen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Unternehmen, "id">> }) =>
      db.unternehmen.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.unternehmen, variables.id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.unternehmen] })
    },
  })
}

export function useDeleteUnternehmen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => db.unternehmen.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.unternehmen] })
    },
  })
}

// PERFORMANCE: Custom hooks for Kostenstellen
export function useKostenstellen() {
  return useQuery<Kostenstelle[]>({
    queryKey: [QUERY_KEYS.kostenstellen],
    queryFn: () => db.kostenstellen.getAll(),
  })
}

export function useKostenstelleById(id: number) {
  return useQuery<Kostenstelle | null>({
    queryKey: [QUERY_KEYS.kostenstellen, id],
    queryFn: () => db.kostenstellen.getById(id),
    enabled: !!id,
  })
}

export function useCreateKostenstelle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Kostenstelle, "id">) => db.kostenstellen.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.kostenstellen] })
    },
  })
}

export function useUpdateKostenstelle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Kostenstelle, "id">> }) =>
      db.kostenstellen.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.kostenstellen, variables.id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.kostenstellen] })
    },
  })
}

export function useDeleteKostenstelle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => db.kostenstellen.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.kostenstellen] })
    },
  })
}

// PERFORMANCE: Custom hooks for Anfragen
export function useAnfragen() {
  return useQuery<Anfrage[]>({
    queryKey: [QUERY_KEYS.anfragen],
    queryFn: async () => {
     
      const result = await db.anfragen.getAll()
      
      return result
    }
  })
}

export function useAnfrageById(id: number) {
  return useQuery<Anfrage | null>({
    queryKey: [QUERY_KEYS.anfragen, id],
    queryFn: async () => {
      
      const result = await db.anfragen.getById(id)
      
      return result
    },
    enabled: !!id // Only run if id is provided
  })
}

export function useCreateAnfrage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Anfrage, "id">) => {
      console.log("React Query: Executing anfrage.create with data:", data)
      const result = await db.anfragen.create(data)
      console.log("React Query: anfrage.create completed with result:", result)
      return result
    },
    onSuccess: (data) => {
      console.log("React Query: anfrage.create success, invalidating queries")
      // PERFORMANCE: Invalidate and refetch anfragen list after creating
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.anfragen] })
    },
    onError: (error) => {
      console.error("React Query: anfrage.create error:", error)
    }
  })
}

export function useUpdateAnfrage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<Anfrage, "id">> }) => {
      console.log("React Query: Executing anfrage.update for id:", id, "with data:", data)
      const result = await db.anfragen.update(id, data)
      console.log("React Query: anfrage.update completed for id:", id, "with result:", result)
      return result
    },
    onSuccess: (data, variables) => {
      console.log("React Query: anfrage.update success for id:", variables.id, "invalidating queries")
      // PERFORMANCE: Invalidate specific anfrage and the list
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.anfragen, variables.id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.anfragen] })
    },
    onError: (error, variables) => {
      console.error("React Query: anfrage.update error for id:", variables.id, error)
    }
  })
}

export function useDeleteAnfrage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      console.log("React Query: Executing anfrage.delete for id:", id)
      const result = await db.anfragen.delete(id)
      console.log("React Query: anfrage.delete completed for id:", id, "with result:", result)
      return result
    },
    onSuccess: (data, variables) => {
      console.log("React Query: anfrage.delete success for id:", variables, "invalidating queries")
      // PERFORMANCE: Invalidate and refetch anfragen list after deleting
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.anfragen] })
    },
    onError: (error, variables) => {
      console.error("React Query: anfrage.delete error for id:", variables, error)
    }
  })
}

// PERFORMANCE: Prefetch all data at once for dashboard
export function usePrefetchDashboardData() {
  const queryClient = useQueryClient()

  return async () => {
    // PERFORMANCE: Prefetch all data in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.mitarbeiter],
        queryFn: () => db.mitarbeiter.getAll(),
      }),
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.unternehmen],
        queryFn: () => db.unternehmen.getAll(),
      }),
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.kostenstellen],
        queryFn: () => db.kostenstellen.getAll(),
      }),
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.anfragen],
        queryFn: () => db.anfragen.getAll(),
      }),
    ])
  }
}
function sec() {
  throw new Error("Function not implemented.")
}
