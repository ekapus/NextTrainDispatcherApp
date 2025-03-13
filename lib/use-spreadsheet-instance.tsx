"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { SpreadsheetInstance } from "@/lib/types"

interface SpreadsheetContextType {
  instances: SpreadsheetInstance[]
  selectedInstance: SpreadsheetInstance | null
  selectInstance: (instance: SpreadsheetInstance) => void
  loading: boolean
  error: string | null
  refreshInstances: () => Promise<void>
}

const SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(undefined)

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<SpreadsheetInstance[]>([])
  const [selectedInstance, setSelectedInstance] = useState<SpreadsheetInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update the fetchInstances function to also fetch metadata for each instance
  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch spreadsheet instances from API
      console.log("Fetching spreadsheet instances from API...")
      const response = await fetch("/api/spreadsheets")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        const errorMessage = errorData.error || `Failed to fetch spreadsheets: ${response.status}`
        console.error("API error:", errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (data && Array.isArray(data) && data.length > 0) {
        console.log("Fetched spreadsheet instances:", data)

        // Fetch metadata for each instance
        const instancesWithMetadata = await Promise.all(
          data.map(async (instance) => {
            try {
              // Fetch metadata for this instance
              const metadataResponse = await fetch(`/api/spreadsheets/${instance.id}/metadata`)
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json()
                return {
                  ...instance,
                  name: metadata.name || instance.name,
                  description: metadata.description,
                  region: metadata.region,
                  territory: metadata.territory,
                  owner: metadata.owner,
                  color: metadata.color,
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch metadata for ${instance.id}:`, err)
            }
            return instance
          }),
        )

        setInstances(instancesWithMetadata)
        return instancesWithMetadata
      } else {
        console.warn("API returned empty spreadsheet list")
        setInstances([])
        setError("No spreadsheets found. Please check your environment variables.")
        return []
      }
    } catch (err) {
      console.error("Failed to load spreadsheet instances:", err)
      setInstances([])
      setError(`Failed to load spreadsheet instances: ${err instanceof Error ? err.message : String(err)}`)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Load instances and selected instance from API and localStorage
  useEffect(() => {
    let mounted = true

    async function loadInstances() {
      const data = await fetchInstances()

      if (!mounted) return

      // Check if there's a previously selected instance in localStorage
      if (typeof window !== "undefined" && data.length > 0) {
        const savedInstanceId = localStorage.getItem("selectedSpreadsheetId")
        console.log("Saved instance ID from localStorage:", savedInstanceId)

        if (savedInstanceId) {
          // Find the instance in the fetched data
          const savedInstance = data.find((i: SpreadsheetInstance) => i.id === savedInstanceId)
          if (savedInstance) {
            console.log("Setting selected instance from localStorage:", savedInstance)
            setSelectedInstance(savedInstance)
          } else {
            // If the saved instance is not in the fetched data, select the first one
            console.log("Saved instance not found in data, selecting first instance:", data[0])
            setSelectedInstance(data[0])
            localStorage.setItem("selectedSpreadsheetId", data[0].id)
          }
        } else {
          // If no saved instance, select the first one
          console.log("No saved instance, selecting first instance:", data[0])
          setSelectedInstance(data[0])
          localStorage.setItem("selectedSpreadsheetId", data[0].id)
        }
      }
    }

    loadInstances()

    return () => {
      mounted = false
    }
  }, [fetchInstances])

  const selectInstance = useCallback((instance: SpreadsheetInstance) => {
    console.log("Selecting instance:", instance)
    setSelectedInstance(instance)
    if (typeof window !== "undefined") {
      console.log("Saving instance ID to localStorage:", instance.id)

      // First clear the localStorage to ensure a fresh state
      localStorage.removeItem("selectedSpreadsheetId")

      // Then set the new ID
      localStorage.setItem("selectedSpreadsheetId", instance.id)

      // Force a page reload to ensure all components re-fetch data with the new spreadsheet ID
      window.location.href = "/"
    }
  }, [])

  const refreshInstances = async () => {
    return await fetchInstances()
  }

  const value = {
    instances,
    selectedInstance,
    selectInstance,
    loading,
    error,
    refreshInstances,
  }

  return <SpreadsheetContext.Provider value={value}>{children}</SpreadsheetContext.Provider>
}

export function useSpreadsheetInstance() {
  const context = useContext(SpreadsheetContext)
  if (context === undefined) {
    throw new Error("useSpreadsheetInstance must be used within a SpreadsheetProvider")
  }
  return context
}

