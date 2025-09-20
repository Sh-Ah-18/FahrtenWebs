import { Database } from "@/types/supabase"
import { createBrowserClient } from "@supabase/ssr"

// Add debugging for environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (process.env.NODE_ENV === "development") console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV === "development") console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'luxwork-web'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    db: {
      schema: 'public'
    }
  }
)

// Add connection test and monitoring
if (typeof window !== 'undefined') {
  const w = window as any

  // Prevent duplicate setup during Fast Refresh / multiple imports
  if (!w.__luxworkSupabaseInit) {
    w.__luxworkSupabaseInit = true

    let connectionTestCount = 0
    let lastSuccessfulConnection = Date.now()
    let consecutiveFailures = 0

    // Test connection on client side
    const testConnection = async () => {
      connectionTestCount++
      try {
        const startTime = Date.now()
        const { data, error } = await supabase.auth.getSession()
        const duration = Date.now() - startTime

        if (error) {
          consecutiveFailures++
          if (process.env.NODE_ENV === "development") {
            console.warn(`Supabase connection test ${connectionTestCount} failed after ${duration}ms:`, error.message)
            console.warn(`Time since last successful connection: ${Date.now() - lastSuccessfulConnection}ms`)
            console.warn(`Consecutive failures: ${consecutiveFailures}`)
          }
        } else {
          consecutiveFailures = 0
          if (process.env.NODE_ENV === "development") {
            
          }
          lastSuccessfulConnection = Date.now()
        }
      } catch (err) {
        consecutiveFailures++
        if (process.env.NODE_ENV === "development") {
          console.error(`Supabase connection test ${connectionTestCount} exception after ${Date.now() - lastSuccessfulConnection}ms:`, err)
          console.warn(`Consecutive failures: ${consecutiveFailures}`)
        }
      }
    }

    // Initial test
    testConnection()

    // Monitor connection every 10 seconds
    const connectionInterval = setInterval(testConnection, 10000)
    w.__luxworkConnInterval = connectionInterval

    // Add global error handler for fetch requests, wrap only once
    if (!(window.fetch as any).__luxworkWrapped) {
      const originalFetch = window.fetch
      const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const startTime = Date.now()
        try {
          const response = await originalFetch(input as any, init as any)
          const duration = Date.now() - startTime
          if (duration > 5000 && process.env.NODE_ENV === "development") {
            console.warn(`Slow fetch request (${duration}ms):`, input)
          }
          return response
        } catch (error) {
          const duration = Date.now() - startTime
          if (process.env.NODE_ENV === "development") {
            console.error(`Global fetch error after ${duration}ms:`, error)
            console.error('Fetch args:', input, init)
          }
          throw error
        }
      }
      ;(wrappedFetch as any).__luxworkWrapped = true
      window.fetch = wrappedFetch as any
    }

    // Monitor for any network errors (register once)
    if (!w.__luxworkEventsAdded) {
      w.__luxworkEventsAdded = true
      window.addEventListener('error', (event) => {
        const anyEvent = event as any
        if (anyEvent.error && anyEvent.error.message && anyEvent.error.message.includes('fetch')) {
          if (process.env.NODE_ENV === "development") console.error('Network error detected:', anyEvent.error)
        }
      })

      window.addEventListener('unhandledrejection', (event) => {
        const anyEvent = event as any
        if (anyEvent.reason && anyEvent.reason.message && anyEvent.reason.message.includes('fetch')) {
          if (process.env.NODE_ENV === "development") console.error('Unhandled fetch rejection:', anyEvent.reason)
        }
      })
    }

    // Monitor for connection state changes
    let lastConnectionState = 'unknown'
    const checkConnectionState = () => {
      const currentState = navigator.onLine ? 'online' : 'offline'
      if (currentState !== lastConnectionState) {
        if (process.env.NODE_ENV === "development") 
        lastConnectionState = currentState

        if (currentState === 'online') {
          setTimeout(testConnection, 1000)
        }
      }
    }

    const connectionStateInterval = setInterval(checkConnectionState, 5000)
    w.__luxworkStateInterval = connectionStateInterval

    // Cleanup on page unload
    const cleanup = () => {
      try { clearInterval(connectionInterval) } catch {}
      try { clearInterval(connectionStateInterval) } catch {}
    }
    window.addEventListener('beforeunload', cleanup)
  }
}
