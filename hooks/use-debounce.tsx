"use client"

import { useState, useEffect } from "react"

// PERFORMANCE: Debounce hook to prevent excessive API calls when typing in search fields
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear the timeout if the value changes before the delay expires
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
