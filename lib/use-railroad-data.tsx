"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import type { RailroadSegment, ControlPoint } from "@/lib/types"
import { getSegmentsForPath } from "@/lib/path-utils"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"

interface RailroadDataContextType {
  segments: RailroadSegment[]
  controlPoints: ControlPoint[]
  loading: boolean
  error: string | null
  getTrackName: (trackId: string) => string
  getLocationName: (locationId: string) => string
  getAllTracks: () => { id: string; name: string }[]
  getAllLocations: () => { id: string; name: string }[]
  getTracksForPath: (fromLocation: string, toLocation: string) => string[]
  refreshData: () => Promise<void>
}

const RailroadDataContext = createContext<RailroadDataContextType | undefined>(undefined)

export function RailroadDataProvider({ children }: { children: ReactNode }) {
  const [segments, setSegments] = useState<RailroadSegment[]>([])
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedInstance } = useSpreadsheetInstance()

  const loadRailroadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Only fetch data if we have a selected instance
      if (selectedInstance?.id) {
        console.log(`Client: Loading railroad data for instance: ${selectedInstance.id}`)

        // Use the new API endpoint that takes a specific spreadsheet ID
        const response = await fetch(`/api/railroad-data/${selectedInstance.id}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch railroad data: ${response.status}`)
        }

        const data = await response.json()

        if (!data.segments || !data.controlPoints) {
          throw new Error("Invalid data structure received from API")
        }

        setSegments(data.segments)
        setControlPoints(data.controlPoints)
        console.log(`Client: Loaded ${data.segments.length} segments and ${data.controlPoints.length} control points`)
      } else {
        setSegments([])
        setControlPoints([])
        console.log("Client: No instance selected, cleared data")
      }
    } catch (err) {
      console.error("Client: Failed to load railroad data:", err)
      setError(err instanceof Error ? err.message : "Failed to load railroad data")
      // Set empty arrays to prevent undefined errors
      setSegments([])
      setControlPoints([])
    } finally {
      setLoading(false)
    }
  }, [selectedInstance])

  // Load data when the component mounts or when the selected instance changes
  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      if (!mounted) return

      // Clear any cached data when the selected instance changes
      setSegments([])
      setControlPoints([])

      console.log("Client: Selected instance changed, refreshing railroad data...")
      await loadRailroadData()
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [loadRailroadData, selectedInstance])

  const getTrackName = (trackId: string): string => {
    const segment = segments.find((s) => s.id === trackId)
    return segment ? segment.name : trackId
  }

  const getLocationName = (locationId: string): string => {
    const point = controlPoints.find((p) => p.id === locationId)
    return point ? point.name : locationId
  }

  const getAllTracks = () => {
    return segments.map((segment) => ({
      id: segment.id,
      name: segment.name,
    }))
  }

  const getAllLocations = () => {
    return controlPoints.map((point) => ({
      id: point.id,
      name: point.name,
    }))
  }

  const getTracksForPath = (fromLocation: string, toLocation: string): string[] => {
    return getSegmentsForPath(fromLocation, toLocation, segments, controlPoints)
  }

  const refreshData = async () => {
    await loadRailroadData()
  }

  const value = {
    segments,
    controlPoints,
    loading,
    error,
    getTrackName,
    getLocationName,
    getAllTracks,
    getAllLocations,
    getTracksForPath,
    refreshData,
  }

  return <RailroadDataContext.Provider value={value}>{children}</RailroadDataContext.Provider>
}

export function useRailroadData() {
  const context = useContext(RailroadDataContext)
  if (context === undefined) {
    throw new Error("useRailroadData must be used within a RailroadDataProvider")
  }
  return context
}

