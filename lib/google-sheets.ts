"use server"

import type { Clearance } from "@/lib/types"
import {
  fetchSegments,
  fetchControlPoints,
  fetchActiveClearances,
  addClearance as addClearanceToSheet,
  updateClearanceStatus,
} from "./google-sheets-client"

export async function fetchRailroadData() {
  try {
    const [segments, controlPoints] = await Promise.all([fetchSegments(), fetchControlPoints()])

    return { segments, controlPoints }
  } catch (error) {
    console.error("Error fetching railroad data:", error)
    throw new Error("Failed to fetch railroad data")
  }
}

export async function fetchClearances(): Promise<Clearance[]> {
  try {
    return await fetchActiveClearances()
  } catch (error) {
    console.error("Error fetching clearances:", error)
    throw new Error("Failed to fetch clearances")
  }
}

export async function saveClearance(clearance: Clearance, spreadsheetId: string): Promise<boolean> {
  try {
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID provided")
    }

    console.log(`Saving clearance to spreadsheet: ${spreadsheetId}`)
    await addClearanceToSheet(clearance, spreadsheetId)
    return true
  } catch (error) {
    console.error("Error saving clearance:", error)
    return false
  }
}

export async function updateClearance(
  clearanceId: string,
  updates: Partial<Clearance>,
  spreadsheetId: string,
): Promise<boolean> {
  try {
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID provided")
    }

    console.log(`Updating clearance in spreadsheet: ${spreadsheetId}`)
    await updateClearanceStatus(clearanceId, updates, spreadsheetId)
    return true
  } catch (error) {
    console.error("Error updating clearance:", error)
    return false
  }
}

