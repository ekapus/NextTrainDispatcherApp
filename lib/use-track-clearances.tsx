"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import type { Clearance } from "@/lib/types"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { isExpired } from "./auto-annul-service"

interface TrackClearancesContextType {
  clearances: Clearance[]
  addClearance: (clearance: Clearance) => Promise<void>
  annulClearance: (clearanceId: string) => Promise<void>
  completeClearance: (clearanceId: string) => Promise<void>
  checkConflicts: (
    tracks: string[],
    fromLocation: string,
    toLocation: string,
    effectiveDate: string,
    effectiveTimeFrom: string,
    effectiveTimeTo: string | null,
  ) => Promise<{ id: string; issuedTo: string; reason: string }[]>
  loading: boolean
  error: string | null
  refreshClearances: () => Promise<void>
}

const TrackClearancesContext = createContext<TrackClearancesContextType | undefined>(undefined)

export function TrackClearancesProvider({ children }: { children: ReactNode }) {
  const [clearances, setClearances] = useState<Clearance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedInstance } = useSpreadsheetInstance()

  // Use a ref to store the current clearances for comparison without causing re-renders
  const clearancesRef = useRef<Clearance[]>([])

  // Update the ref whenever clearances change
  useEffect(() => {
    clearancesRef.current = clearances
  }, [clearances])

  const loadClearances = useCallback(async () => {
    try {
      // Only set loading to true on initial load, not on refreshes
      if (clearancesRef.current.length === 0) {
        setLoading(true)
      }
      setError(null)

      // Only fetch clearances if we have a selected instance
      if (selectedInstance?.id) {
        console.log(`Client: Loading clearances for instance: ${selectedInstance.id}`)

        // Use the new API endpoint that takes a specific spreadsheet ID
        const response = await fetch(`/api/clearances/${selectedInstance.id}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch clearances: ${response.status}`)
        }

        const data = await response.json()

        // Compare new data with existing data to avoid unnecessary updates
        const dataChanged = JSON.stringify(data) !== JSON.stringify(clearancesRef.current)

        if (dataChanged) {
          console.log(`Client: Loaded ${data.length} clearances, data has changed`)
          setClearances(data)
        } else {
          console.log(`Client: Loaded ${data.length} clearances, no changes detected`)
        }
      } else {
        setClearances([])
        console.log("Client: No instance selected, cleared clearances")
      }
    } catch (err) {
      console.error("Client: Failed to load clearances:", err)
      setError(`Failed to load clearance data: ${err instanceof Error ? err.message : String(err)}`)
      // Don't clear clearances on error to prevent flickering
      if (clearancesRef.current.length === 0) {
        setClearances([])
      }
    } finally {
      setLoading(false)
    }
  }, [selectedInstance]) // Removed clearances from dependencies

  // Check for expired clearances periodically
  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout | undefined

    const checkExpiredClearances = async () => {
      if (!mounted || !selectedInstance?.id) return

      try {
        // Call the auto-annul API endpoint
        const response = await fetch(`/api/auto-annul/${selectedInstance.id}`, {
          method: "POST",
        })

        if (!response.ok) {
          console.error("Failed to check for expired clearances:", response.statusText)
          return
        }

        const result = await response.json()

        if (result.annulledCount > 0) {
          console.log(`Auto-annulled ${result.annulledCount} expired clearances`)
          // Refresh clearances to get the updated list
          await loadClearances()
        }
      } catch (error) {
        console.error("Error checking for expired clearances:", error)
      }
    }

    const fetchData = async () => {
      if (!mounted) return

      // Clear any cached data when the selected instance changes
      setClearances([])

      console.log("Client: Selected instance changed, refreshing clearances...")
      await loadClearances()

      // Check for expired clearances immediately on load
      await checkExpiredClearances()
    }

    fetchData()

    // Set up polling for clearances - increase interval to reduce flickering
    intervalId = setInterval(() => {
      if (mounted) {
        loadClearances()
        // Also check for expired clearances on each interval
        checkExpiredClearances()
      }
    }, 60000) // 1 minute

    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [loadClearances, selectedInstance])

  const addClearance = async (clearance: Clearance) => {
    try {
      // Make sure we have a selected instance
      if (!selectedInstance?.id) {
        throw new Error("No spreadsheet selected")
      }

      // Check for conflicts before saving
      const conflicts = await checkConflicts(
        clearance.tracks,
        clearance.fromLocation,
        clearance.toLocation,
        clearance.effectiveDate,
        clearance.effectiveTimeFrom,
        clearance.effectiveTimeTo,
      )

      if (conflicts.length > 0) {
        const conflictMessages = conflicts
          .map((conflict) => `Form D #${conflict.id} (${conflict.issuedTo}): ${conflict.reason}`)
          .join(", ")
        throw new Error(`Conflict detected with: ${conflictMessages}`)
      }

      console.log(`Saving clearance to spreadsheet: ${selectedInstance.id}`)

      // Make a direct API call to save the clearance
      const response = await fetch(`/api/clearances/${selectedInstance.id}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clearance),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save clearance")
      }

      // Update local state
      setClearances((prev) => [...prev, clearance])

      // Force refresh to get the latest data
      await loadClearances()

      return true
    } catch (err) {
      console.error("Failed to add clearance:", err)
      throw new Error(`Failed to add clearance: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const annulClearance = async (clearanceId: string) => {
    try {
      // Make sure we have a selected instance
      if (!selectedInstance?.id) {
        throw new Error("No spreadsheet selected")
      }

      console.log(`Attempting to annul clearance ${clearanceId} in spreadsheet ${selectedInstance.id}`)

      const updates = {
        status: "annulled" as const,
        completedAt: new Date().toISOString(),
      }

      // Make a direct API call to update the clearance
      const response = await fetch(`/api/clearances/${selectedInstance.id}/update/${clearanceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to annul clearance")
      }

      console.log(`Successfully annulled clearance ${clearanceId}`)

      // Update local state immediately for better UX
      setClearances((prev) => prev.map((c) => (c.id === clearanceId ? { ...c, ...updates } : c)))

      // Force refresh to get the latest data
      await loadClearances()

      return true
    } catch (err) {
      console.error("Failed to annul clearance:", err)
      throw new Error(`Failed to annul clearance: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const completeClearance = async (clearanceId: string) => {
    try {
      // Make sure we have a selected instance
      if (!selectedInstance?.id) {
        throw new Error("No spreadsheet selected")
      }

      console.log(`Attempting to mark clearance ${clearanceId} as completed in spreadsheet ${selectedInstance.id}`)

      const updates = {
        status: "completed" as const,
        completedAt: new Date().toISOString(),
      }

      // Make a direct API call to update the clearance
      const response = await fetch(`/api/clearances/${selectedInstance.id}/update/${clearanceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to complete clearance")
      }

      console.log(`Successfully marked clearance ${clearanceId} as completed`)

      // Update local state immediately for better UX
      setClearances((prev) => prev.map((c) => (c.id === clearanceId ? { ...c, ...updates } : c)))

      // Force refresh to get the latest data
      await loadClearances()

      return true
    } catch (err) {
      console.error("Failed to complete clearance:", err)
      throw new Error(`Failed to complete clearance: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Helper function to check if two time periods overlap
  const doTimePeriodsOverlap = (
    date1: string,
    timeFrom1: string,
    timeTo1: string | null,
    date2: string,
    timeFrom2: string,
    timeTo2: string | null,
  ): boolean => {
    // If either clearance is "until completed" (timeTo is null),
    // we consider it as potentially overlapping
    if (timeTo1 === null || timeTo2 === null) {
      return true
    }

    // Create Date objects for the start and end times of both periods
    const start1 = new Date(`${date1}T${timeFrom1}`)
    const end1 = new Date(`${date1}T${timeTo1}`)
    const start2 = new Date(`${date2}T${timeFrom2}`)
    const end2 = new Date(`${date2}T${timeTo2}`)

    // Check if the periods overlap
    return start1 < end2 && start2 < end1
  }

  const checkConflicts = async (
    tracks: string[],
    fromLocation: string,
    toLocation: string,
    effectiveDate: string,
    effectiveTimeFrom: string,
    effectiveTimeTo: string | null,
  ): Promise<{ id: string; issuedTo: string; reason: string }[]> => {
    const conflictingClearances: { id: string; issuedTo: string; reason: string }[] = []

    // Only check active clearances
    const activeClearances = clearances.filter((c) => c.status === "active")

    // Log for debugging
    console.log(`Checking conflicts for tracks: ${tracks.join(", ")} between ${fromLocation} and ${toLocation}`)
    console.log(`Active clearances: ${activeClearances.length}`)
    console.log(`Time period: ${effectiveDate} ${effectiveTimeFrom} to ${effectiveTimeTo || "completion"}`)

    for (const clearance of activeClearances) {
      // Skip expired clearances
      if (await isExpired(clearance)) {
        continue
      }

      // Check if there's any overlap in the tracks
      const overlappingTracks = clearance.tracks.filter((track) => tracks.includes(track))
      const hasTrackConflict = overlappingTracks.length > 0

      if (hasTrackConflict) {
        // Check if the time periods overlap
        const timeOverlap = doTimePeriodsOverlap(
          effectiveDate,
          effectiveTimeFrom,
          effectiveTimeTo,
          clearance.effectiveDate,
          clearance.effectiveTimeFrom,
          clearance.effectiveTimeTo,
        )

        if (timeOverlap) {
          console.log(
            `Conflict found with Form D #${clearance.id}. Overlapping tracks: ${overlappingTracks.join(", ")}`,
          )

          const reason = `Overlapping tracks (${overlappingTracks.map((t) => t).join(", ")}) during the same time period`

          conflictingClearances.push({
            id: clearance.id,
            issuedTo: clearance.issuedTo,
            reason,
          })
        } else {
          console.log(`No time conflict with Form D #${clearance.id} despite track overlap`)
        }
      }
    }

    return conflictingClearances
  }

  const refreshClearances = async () => {
    await loadClearances()
  }

  const value = {
    clearances,
    addClearance,
    annulClearance,
    completeClearance,
    checkConflicts,
    loading,
    error,
    refreshClearances,
  }

  return <TrackClearancesContext.Provider value={value}>{children}</TrackClearancesContext.Provider>
}

export function useTrackClearances() {
  const context = useContext(TrackClearancesContext)
  if (context === undefined) {
    throw new Error("useTrackClearances must be used within a TrackClearancesProvider")
  }
  return context
}

