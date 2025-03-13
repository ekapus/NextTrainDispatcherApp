"use client"

import { useState, useEffect, useCallback } from "react"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"

// Define an interface for train symbol data
export interface TrainSymbolData {
  symbol: string
  description?: string
}

export function useTrainSymbols() {
  const [symbols, setSymbols] = useState<TrainSymbolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedInstance } = useSpreadsheetInstance()

  const fetchSymbols = useCallback(async () => {
    if (!selectedInstance?.id) {
      console.log("No selected instance, skipping train symbols fetch")
      setSymbols([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log(`Fetching train symbols for spreadsheet: ${selectedInstance.id}`)

      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/train-symbols/${selectedInstance.id}?t=${timestamp}`)

      console.log(`Train symbols API response status: ${response.status}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch train symbols: ${response.status}`)
      }

      const data = await response.json()

      // Check if the response is an error object
      if (data.error) {
        console.error("API returned error:", data.error, data.message)
        throw new Error(data.message || data.error)
      }

      console.log(`Loaded ${data.length} train symbols:`, data)

      setSymbols(data)
    } catch (err) {
      console.error("Failed to load train symbols:", err)
      setError(`Failed to load train symbols: ${err instanceof Error ? err.message : String(err)}`)

      console.log("Setting empty train symbols array due to error")
      setSymbols([])
    } finally {
      setLoading(false)
    }
  }, [selectedInstance])

  useEffect(() => {
    console.log("useTrainSymbols effect running, selectedInstance:", selectedInstance?.id)
    fetchSymbols()
  }, [fetchSymbols])

  return {
    symbols,
    loading,
    error,
    refreshSymbols: fetchSymbols,
  }
}

