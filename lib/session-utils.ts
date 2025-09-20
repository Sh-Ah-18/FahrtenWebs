import { supabase } from "./supabase-browser"

export interface SessionStatus {
  isValid: boolean
  expiresAt: number | null
  timeUntilExpiry: number | null
  needsRefresh: boolean
}

/**
 * Prüft den aktuellen Session-Status
 */
export const checkSessionStatus = async (): Promise<SessionStatus> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: true
      }
    }

    const expiresAt = session.expires_at || null
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt ? expiresAt - now : null
    
    // Token läuft in den nächsten 10 Minuten ab
    const needsRefresh = timeUntilExpiry !== null && timeUntilExpiry < 600

    return {
      isValid: true,
      expiresAt,
      timeUntilExpiry,
      needsRefresh
    }
  } catch (error) {
    console.error("Fehler beim Prüfen des Session-Status:", error)
    return {
      isValid: false,
      expiresAt: null,
      timeUntilExpiry: null,
      needsRefresh: true
    }
  }
}

/**
 * Versucht die Session zu erneuern
 */
export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error("Session-Refresh fehlgeschlagen:", error.message)
      return false
    }
    
    if (data.session) {
      console.log("Session erfolgreich erneuert")
      return true
    }
    
    return false
  } catch (error) {
    console.error("Fehler beim Session-Refresh:", error)
    return false
  }
}

/**
 * Führt eine API-Operation mit automatischem Session-Refresh aus
 */
export const withSessionRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string = "API-Operation"
): Promise<T> => {
  try {
    return await operation()
  } catch (error: any) {
    // Prüfe ob es ein Auth-Fehler ist
    if (isAuthError(error)) {
      console.log(`Auth-Fehler bei ${operationName}, versuche Session zu erneuern...`)
      
      const refreshSuccess = await refreshSession()
      if (refreshSuccess) {
        // Versuche Operation nochmal
        try {
          return await operation()
        } catch (retryError) {
          console.error(`Wiederholung von ${operationName} fehlgeschlagen:`, retryError)
          throw retryError
        }
      } else {
        throw new Error("Session konnte nicht erneuert werden")
      }
    }
    
    throw error
  }
}

/**
 * Prüft ob ein Fehler ein Auth-Fehler ist
 */
export const isAuthError = (error: any): boolean => {
  if (!error) return false
  
  const errorMessage = error.message || error.toString()
  const errorStatus = error.status || error.statusCode
  
  return (
    errorStatus === 401 ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('token') ||
    errorMessage.includes('Session') ||
    errorMessage.includes('Nicht angemeldet') ||
    errorMessage.includes('unauthorized')
  )
}

/**
 * Setzt einen Timer für automatischen Session-Refresh
 */
export const setupSessionRefreshTimer = (
  onRefreshNeeded: () => void,
  checkInterval: number = 5 * 60 * 1000 // 5 Minuten
): (() => void) => {
  const interval = setInterval(async () => {
    const status = await checkSessionStatus()
    
    if (status.needsRefresh) {
      console.log("Session läuft bald ab, erneuere...")
      onRefreshNeeded()
    }
  }, checkInterval)

  // Cleanup-Funktion zurückgeben
  return () => clearInterval(interval)
}
