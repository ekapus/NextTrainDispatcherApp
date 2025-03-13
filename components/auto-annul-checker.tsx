"use client"

import { useEffect } from "react"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { useTrackClearances } from "@/lib/use-track-clearances"

export function AutoAnnulChecker() {
  const { selectedInstance } = useSpreadsheetInstance()
  const { refreshClearances } = useTrackClearances()

  useEffect(() => {
    // Don't do anything if no instance is selected
    if (!selectedInstance?.id) return

    // Function to check for expired clearances
    const checkExpiredClearances = async () => {
      try {
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
          // Refresh the clearances list if any were annulled
          refreshClearances()
        }
      } catch (error) {
        console.error("Error checking for expired clearances:", error)
      }
    }

    // Check immediately on mount
    checkExpiredClearances()

    // Then set up an interval to check every minute
    const intervalId = setInterval(checkExpiredClearances, 60000)

    return () => clearInterval(intervalId)
  }, [selectedInstance, refreshClearances])

  // This is a utility component that doesn't render anything
  return null
}

