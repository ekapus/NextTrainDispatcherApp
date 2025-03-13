"use server"

import { fetchActiveClearances, updateClearanceStatus } from "./google-sheets-client"

// Helper function to check if a clearance has expired
export async function isExpired(clearance: any): Promise<boolean> {
  // If the clearance is already completed or annulled, it's not considered expired
  if (clearance.status !== "active") {
    return false
  }

  // If the clearance is set to "until completed" (effectiveTimeTo is null), it doesn't expire automatically
  if (!clearance.effectiveTimeTo) {
    return false
  }

  const now = new Date()

  // Parse the expiration date and time in the user's local time zone
  // Create a date string that will be interpreted in local time
  const expirationDateStr = `${clearance.effectiveDate}T${clearance.effectiveTimeTo}`
  const expirationDate = new Date(expirationDateStr)

  // Log for debugging
  console.log(`Checking expiration for Form D #${clearance.id}:`)
  console.log(`- Current time: ${now.toLocaleString()}`)
  console.log(`- Expiration time: ${expirationDate.toLocaleString()}`)
  console.log(`- Is expired: ${now > expirationDate}`)

  // Check if the current time is past the expiration time
  return now > expirationDate
}

// This function will be called by a server action to check and annul expired clearances
export async function checkAndAnnulExpiredClearances(spreadsheetId: string): Promise<{
  success: boolean
  message: string
  annulledCount: number
}> {
  try {
    console.log(`Server: Checking for expired clearances in spreadsheet ${spreadsheetId}`)

    // Fetch all active clearances
    const clearances = await fetchActiveClearances(spreadsheetId)

    // Filter for expired clearances
    const expiredClearances = []
    for (const clearance of clearances) {
      if (await isExpired(clearance)) {
        expiredClearances.push(clearance)
      }
    }

    if (expiredClearances.length === 0) {
      return {
        success: true,
        message: "No expired clearances found",
        annulledCount: 0,
      }
    }

    console.log(`Server: Found ${expiredClearances.length} expired clearances to annul`)

    // Annul each expired clearance
    let annulledCount = 0
    for (const clearance of expiredClearances) {
      try {
        const updates = {
          status: "annulled",
          completedAt: new Date().toISOString(),
        }

        await updateClearanceStatus(clearance.id, updates, spreadsheetId)
        annulledCount++

        console.log(`Server: Automatically annulled expired clearance: ${clearance.id}`)
      } catch (error) {
        console.error(`Server: Failed to annul clearance ${clearance.id}:`, error)
      }
    }

    return {
      success: true,
      message: `Successfully annulled ${annulledCount} expired clearances`,
      annulledCount,
    }
  } catch (error) {
    console.error("Server: Error checking for expired clearances:", error)
    return {
      success: false,
      message: `Error checking for expired clearances: ${error instanceof Error ? error.message : String(error)}`,
      annulledCount: 0,
    }
  }
}

