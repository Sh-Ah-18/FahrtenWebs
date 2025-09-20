"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, type ReactNode, useEffect } from "react"

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a client with caching configuration
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // PERFORMANCE: Cache data for 5 minutes by default
            staleTime: 5 * 60 * 1000,
            // PERFORMANCE: Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // PERFORMANCE: Retry failed queries 3 times
            retry: (failureCount, error: any) => {
              // Bei Session-Fehlern NICHT wiederholen
              if (error?.message?.includes('Session') || 
                  error?.message?.includes('Nicht angemeldet') || 
                  error?.message?.includes('JWT') ||
                  error?.message?.includes('token') ||
                  error?.status === 401) {
                console.log("React Query: Session-Fehler erkannt, stoppe Retry")
                return false
              }
              // Bei anderen Fehlern maximal 3 mal wiederholen
              return failureCount < 3
            },
            // PERFORMANCE: Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // WICHTIG: Bei Fehlern nicht automatisch neu laden
            refetchOnMount: false,
            refetchOnReconnect: false,
          },
          mutations: {
            // Bei Mutation-Fehlern auch Session-Fehler behandeln
            retry: (failureCount, error: any) => {
              if (error?.message?.includes('Session') || 
                  error?.message?.includes('Nicht angemeldet') || 
                  error?.message?.includes('JWT') ||
                  error?.message?.includes('token') ||
                  error?.status === 401) {
                console.log("React Query Mutation: Session-Fehler erkannt, stoppe Retry")
                return false
              }
              return failureCount < 2
            },
          },
        },
      }),
  )

  // Add debugging for query client state
  useEffect(() => {
    const logQueryClientState = () => {
      const queries = queryClient.getQueryCache().getAll()
      const mutations = queryClient.getMutationCache().getAll()
     
      
      // Log any failed queries
      queries.forEach(query => {
        if (query.state.status === 'error') {
          console.warn(`Failed query: ${query.queryKey.join('.')}`, query.state.error)
        }
      })
    }

    // Log state every 30 seconds
    const interval = setInterval(logQueryClientState, 30000)
    
    return () => clearInterval(interval)
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Add React Query Devtools in development */}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
