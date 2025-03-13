import type { RailroadSegment, ControlPoint, Clearance } from "./types"
import { getLoadedDoc } from "./google-sheets-loader"
import { JWT } from "google-auth-library"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { formatPrivateKey } from "./google-utils"

// Create a JWT auth client
export function createJwtClient() {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL environment variable is not set")
    }

    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      throw new Error("GOOGLE_SHEETS_PRIVATE_KEY environment variable is not set")
    }

    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY)

    return new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
  } catch (error) {
    console.error("Failed to initialize JWT client:", error)
    throw new Error(`Failed to initialize JWT client: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Fetch metadata from a Google Spreadsheet
export async function fetchSpreadsheetMetadata(spreadsheetId: string) {
  try {
    console.log(`Fetching metadata for spreadsheet: ${spreadsheetId}`)

    // Create auth object
    const auth = createJwtClient()

    // Create a new document with auth
    const doc = new GoogleSpreadsheet(spreadsheetId, auth)

    // Load the document info
    await doc.loadInfo()
    console.log(`Loaded spreadsheet info: ${doc.title}`)

    // Check if the Metadata sheet exists
    const metadataSheet = doc.sheetsByTitle["Metadata"]

    if (!metadataSheet) {
      console.log(`No Metadata sheet found in spreadsheet: ${spreadsheetId}`)
      return {
        name: doc.title,
        description: "",
      }
    }

    // Fetch the metadata values
    await metadataSheet.loadHeaderRow()
    const rows = await metadataSheet.getRows()
    console.log(`Found ${rows.length} rows in Metadata sheet for: ${spreadsheetId}`)

    if (rows.length === 0) {
      // Only header row or empty
      console.log(`Metadata sheet is empty for: ${spreadsheetId}`)
      return {
        name: doc.title,
        description: "",
      }
    }

    // Convert rows to key-value pairs
    const metadata: Record<string, string> = {}

    // Check if we have a Key/Value format or name/value format
    const hasKeyColumn = metadataSheet.headerValues.includes("Key")
    const hasNameColumn = metadataSheet.headerValues.includes("name")

    if (hasKeyColumn) {
      // Format: Key | Value
      for (const row of rows) {
        const key = row.get("Key")
        const value = row.get("Value")

        if (key && value) {
          metadata[key.toLowerCase()] = value
        }
      }
    } else if (hasNameColumn) {
      // Format: name | value
      for (const row of rows) {
        const name = row.get("name")
        const value = row.get("value")

        if (name && value) {
          metadata[name.toLowerCase()] = value
        }
      }
    } else {
      console.log(`Metadata sheet has unexpected format: ${metadataSheet.headerValues.join(", ")}`)
      return {
        name: doc.title,
        description: "",
      }
    }

    console.log(`Processed metadata for: ${spreadsheetId}`, metadata)

    return {
      name: metadata.name || doc.title,
      description: metadata.description || "",
      region: metadata.region || "",
      territory: metadata.territory || "",
      owner: metadata.owner || "",
      color: metadata.color || "",
    }
  } catch (error) {
    console.error(`Error fetching metadata for spreadsheet ${spreadsheetId}:`, error)
    return null
  }
}

// Re-export the fetchSpreadsheetMetadata function
// export const fetchSpreadsheetMetadata = fetchMetadata

// Get the selected spreadsheet ID from localStorage or use the default
function getSpreadsheetId(): string {
  let spreadsheetId = ""

  if (typeof window !== "undefined") {
    const selectedId = localStorage.getItem("selectedSpreadsheetId")
    if (selectedId) {
      spreadsheetId = selectedId
      console.log("Using spreadsheet ID from localStorage:", spreadsheetId)
      return spreadsheetId
    }
  }

  // Fallback to default ID
  spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ""
  console.log("Using default spreadsheet ID:", spreadsheetId)
  return spreadsheetId
}

export async function fetchSegments(): Promise<RailroadSegment[]> {
  try {
    const spreadsheetId = getSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID available")
    }

    console.log(`[${new Date().toISOString()}] Fetching segments from spreadsheet: ${spreadsheetId}`)
    const doc = await getLoadedDoc(spreadsheetId)
    console.log(`Connected to spreadsheet: ${doc.title}`)

    const sheet = doc.sheetsByTitle["Segments"]
    if (!sheet) {
      throw new Error(`Segments sheet not found in spreadsheet ${spreadsheetId}`)
    }

    const rows = await sheet.getRows()
    console.log(`Found ${rows.length} segments in spreadsheet ${spreadsheetId}`)
    return rows.map((row, index) => {
      try {
        return parseSegment(row)
      } catch (error) {
        console.error(`Error parsing segment at row ${index + 2}:`, error)
        throw error
      }
    })
  } catch (error) {
    console.error("Error fetching segments:", error)
    throw error
  }
}

function parseSegment(row: any): RailroadSegment {
  const segment = {
    id: row.get("id"),
    name: row.get("name"),
    startX: Number(row.get("startX")),
    startY: Number(row.get("startY")),
    endX: Number(row.get("endX")),
    endY: Number(row.get("endY")),
    length: Number(row.get("length")),
    maxSpeed: Number(row.get("maxSpeed")),
    type: row.get("type") || undefined,
    // First connection information
    connectsToSegmentId: row.get("connectsToSegmentId") || undefined,
    connectionStartX: row.get("connectionStartX") ? Number(row.get("connectionStartX")) : undefined,
    connectionStartY: row.get("connectionStartY") ? Number(row.get("connectionStartY")) : undefined,
    connectionEndX: row.get("connectionEndX") ? Number(row.get("connectionEndX")) : undefined,
    connectionEndY: row.get("connectionEndY") ? Number(row.get("connectionEndY")) : undefined,
    // Second connection information
    connectsToSegmentId2: row.get("connectsToSegmentId2") || undefined,
    connection2StartX: row.get("connection2StartX") ? Number(row.get("connection2StartX")) : undefined,
    connection2StartY: row.get("connection2StartY") ? Number(row.get("connection2StartY")) : undefined,
    connection2EndX: row.get("connection2EndX") ? Number(row.get("connection2EndX")) : undefined,
    connection2EndY: row.get("connection2EndY") ? Number(row.get("connection2EndY")) : undefined,
  }

  // Validate the parsed data
  if (!segment.id || !segment.name) {
    throw new Error(`Invalid segment data: Missing required fields for row ${row.rowIndex}`)
  }

  if (
    isNaN(segment.startX) ||
    isNaN(segment.startY) ||
    isNaN(segment.endX) ||
    isNaN(segment.endY) ||
    isNaN(segment.length) ||
    isNaN(segment.maxSpeed)
  ) {
    throw new Error(`Invalid segment data: Invalid numbers for row ${row.rowIndex}`)
  }

  // Validate first connection coordinates if connectsToSegmentId is provided
  if (segment.connectsToSegmentId) {
    if (
      segment.connectionStartX === undefined ||
      segment.connectionStartY === undefined ||
      segment.connectionEndX === undefined ||
      segment.connectionEndY === undefined ||
      isNaN(segment.connectionStartX) ||
      isNaN(segment.connectionStartY) ||
      isNaN(segment.connectionEndX) ||
      isNaN(segment.connectionEndY)
    ) {
      console.warn(`Warning: Segment ${segment.id} has connectsToSegmentId but incomplete connection coordinates`)
    }
  }

  // Validate second connection coordinates if connectsToSegmentId2 is provided
  if (segment.connectsToSegmentId2) {
    if (
      segment.connection2StartX === undefined ||
      segment.connection2StartY === undefined ||
      segment.connection2EndX === undefined ||
      segment.connection2EndY === undefined ||
      isNaN(segment.connection2StartX) ||
      isNaN(segment.connection2StartY) ||
      isNaN(segment.connection2EndX) ||
      isNaN(segment.connection2EndY)
    ) {
      console.warn(`Warning: Segment ${segment.id} has connectsToSegmentId2 but incomplete connection coordinates`)
    }
  }

  return segment
}

export async function fetchControlPoints(): Promise<ControlPoint[]> {
  try {
    const spreadsheetId = getSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID available")
    }

    console.log(`[${new Date().toISOString()}] Fetching control points from spreadsheet: ${spreadsheetId}`)
    const doc = await getLoadedDoc(spreadsheetId)
    console.log(`Connected to spreadsheet: ${doc.title}`)
    const sheet = doc.sheetsByTitle["ControlPoints"]
    if (!sheet) {
      throw new Error(`ControlPoints sheet not found in spreadsheet ${spreadsheetId}`)
    }

    const rows = await sheet.getRows()
    console.log(`Found ${rows.length} control points in spreadsheet ${spreadsheetId}`)
    return rows.map((row, index) => {
      try {
        return parseControlPoint(row)
      } catch (error) {
        console.error(`Error parsing control point at row ${index + 2}:`, error)
        throw error
      }
    })
  } catch (error) {
    console.error("Error fetching control points:", error)
    throw error
  }
}

export async function fetchActiveClearances(): Promise<Clearance[]> {
  try {
    const spreadsheetId = getSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID available")
    }

    console.log(`[${new Date().toISOString()}] Fetching clearances from spreadsheet: ${spreadsheetId}`)
    const doc = await getLoadedDoc(spreadsheetId)
    console.log(`Connected to spreadsheet: ${doc.title}`)
    const sheet = doc.sheetsByTitle["Clearances"]
    if (!sheet) {
      throw new Error(`Clearances sheet not found in spreadsheet ${spreadsheetId}`)
    }

    const rows = await sheet.getRows()
    console.log(`Found ${rows.length} clearances in spreadsheet ${spreadsheetId}`)
    return rows.map((row, index) => {
      try {
        return parseClearance(row)
      } catch (error) {
        console.error(`Error parsing clearance at row ${index + 2}:`, error)
        throw error
      }
    })
  } catch (error) {
    console.error("Error fetching clearances:", error)
    throw error
  }
}

function parseControlPoint(row: any): ControlPoint {
  const point = {
    id: row.get("id"),
    name: row.get("name"),
    x: Number(row.get("x")),
    y: Number(row.get("y")),
    type: row.get("type") as "station" | "signal" | "switch" | "staging",
  }

  // Validate the parsed data
  if (!point.id || !point.name) {
    throw new Error(`Invalid control point data: Missing required fields for row ${row.rowIndex}`)
  }

  if (isNaN(point.x) || isNaN(point.y)) {
    throw new Error(`Invalid control point data: Invalid coordinates for row ${row.rowIndex}`)
  }

  if (!["station", "signal", "switch", "staging"].includes(point.type)) {
    throw new Error(`Invalid control point data: Invalid type "${point.type}" for row ${row.rowIndex}`)
  }

  return point
}

function parseClearance(row: any): Clearance {
  const clearance = {
    id: row.get("id"),
    formType: row.get("formType") as "C" | "G" | "R" | "W",
    lineSubdivision: row.get("lineSubdivision"),
    fromLocation: row.get("fromLocation"),
    toLocation: row.get("toLocation"),
    tracks: JSON.parse(row.get("tracks") || "[]"),
    effectiveDate: row.get("effectiveDate"),
    effectiveTimeFrom: row.get("effectiveTimeFrom"),
    effectiveTimeTo: row.get("effectiveTimeTo") || null,
    specialInstructions: row.get("specialInstructions") || undefined,
    status: row.get("status"),
    issuedAt: row.get("issuedAt"),
    issuedBy: row.get("issuedBy"),
    issuedTo: row.get("issuedTo"),
    completedAt: row.get("completedAt") || undefined,
    speedRestrictions: row.get("speedRestrictions") ? JSON.parse(row.get("speedRestrictions")) : undefined,
    trainSymbol: row.get("trainSymbol") || undefined,
  }

  // Validate the parsed data
  if (!clearance.id || !clearance.formType || !clearance.status) {
    throw new Error(`Invalid clearance data: Missing required fields for row ${row.rowIndex}`)
  }

  return clearance
}

function clearanceToRow(clearance: Clearance): any {
  return {
    id: clearance.id,
    formType: clearance.formType,
    lineSubdivision: clearance.lineSubdivision,
    fromLocation: clearance.fromLocation,
    toLocation: clearance.toLocation,
    tracks: JSON.stringify(clearance.tracks),
    effectiveDate: clearance.effectiveDate,
    effectiveTimeFrom: clearance.effectiveTimeFrom,
    effectiveTimeTo: clearance.effectiveTimeTo || "",
    specialInstructions: clearance.specialInstructions || "",
    status: clearance.status,
    issuedAt: clearance.issuedAt,
    issuedBy: clearance.issuedBy,
    issuedTo: clearance.issuedTo,
    completedAt: clearance.completedAt || "",
    speedRestrictions: clearance.speedRestrictions ? JSON.stringify(clearance.speedRestrictions) : "",
    trainSymbol: clearance.trainSymbol || "",
  }
}

export async function addClearance(clearance: Clearance, spreadsheetId: string): Promise<boolean> {
  try {
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID available")
    }

    console.log(`Adding clearance to spreadsheet: ${spreadsheetId}`)
    const doc = await getLoadedDoc(spreadsheetId)
    const sheet = doc.sheetsByTitle["Clearances"]
    if (!sheet) {
      throw new Error("Clearances sheet not found")
    }

    // Convert clearance to row format
    const row = clearanceToRow(clearance)

    // Add the row to the sheet
    await sheet.addRow(row)
    console.log(`Successfully added clearance ${clearance.id} to spreadsheet ${spreadsheetId}`)

    return true
  } catch (error) {
    console.error("Error adding clearance:", error)
    return false
  }
}

export async function updateClearanceStatus(
  clearanceId: string,
  updates: Partial<Clearance>,
  spreadsheetId: string,
): Promise<boolean> {
  try {
    if (!spreadsheetId) {
      throw new Error("No spreadsheet ID available")
    }

    console.log(`Updating clearance ${clearanceId} in spreadsheet: ${spreadsheetId}`)
    console.log(`Updates to apply:`, updates)

    const doc = await getLoadedDoc(spreadsheetId)
    const sheet = doc.sheetsByTitle["Clearances"]
    if (!sheet) {
      throw new Error("Clearances sheet not found")
    }

    const rows = await sheet.getRows()
    const row = rows.find((r) => r.get("id") === clearanceId)

    if (!row) {
      console.error(`Clearance with ID ${clearanceId} not found in spreadsheet ${spreadsheetId}`)
      return false
    }

    console.log(`Found clearance ${clearanceId}, applying updates...`)

    // Apply all provided updates
    Object.entries(updates).forEach(([key, value]) => {
      if (key === "tracks" || key === "speedRestrictions") {
        // These fields need to be stringified
        row.set(key, JSON.stringify(value))
      } else if (value !== undefined) {
        row.set(key, value === null ? "" : value)
      }
    })

    await row.save()
    console.log(`Successfully saved updates to clearance ${clearanceId}`)

    return true
  } catch (error) {
    console.error(`Error updating clearance ${clearanceId}:`, error)
    return false
  }
}

export interface SpreadsheetMetadata {
  name: string
  description: string
  region: string
  territory: string
  owner: string
  color: string
}

// Add this function to fetch train symbols from the spreadsheet
export async function fetchTrainSymbols(spreadsheetId: string): Promise<{ symbol: string; description?: string }[]> {
  try {
    if (!spreadsheetId) {
      console.log("No spreadsheet ID provided for fetchTrainSymbols")
      return []
    }

    console.log(`[${new Date().toISOString()}] Fetching train symbols from spreadsheet: ${spreadsheetId}`)

    // Get auth credentials
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      console.error("Missing required environment variables for authentication")
      return []
    }

    // Create auth object
    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY)
    const auth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    // Create a new document with auth
    const doc = new GoogleSpreadsheet(spreadsheetId, auth)

    // Load the document info
    await doc.loadInfo()
    console.log(`Connected to spreadsheet: ${doc.title}`)

    // Log all available sheets for debugging
    console.log(`Available sheets in spreadsheet: ${Object.keys(doc.sheetsByTitle).join(", ")}`)

    // Try to find the TrainSymbols sheet
    const sheet = doc.sheetsByTitle["TrainSymbols"]
    if (!sheet) {
      console.log(`TrainSymbols sheet not found in spreadsheet ${spreadsheetId}, returning empty list`)

      // Try alternative sheet names (case-insensitive search)
      const sheetNames = Object.keys(doc.sheetsByTitle)
      const trainSymbolsSheetName = sheetNames.find(
        (name) =>
          name.toLowerCase() === "trainsymbols" ||
          name.toLowerCase() === "train_symbols" ||
          name.toLowerCase() === "train-symbols" ||
          name.toLowerCase() === "trains",
      )

      if (trainSymbolsSheetName) {
        console.log(`Found alternative sheet name: ${trainSymbolsSheetName}, trying to use it instead`)
        const alternativeSheet = doc.sheetsByTitle[trainSymbolsSheetName]
        return extractTrainSymbols(alternativeSheet, spreadsheetId)
      }

      return []
    }

    return extractTrainSymbols(sheet, spreadsheetId)
  } catch (error) {
    console.error("Error fetching train symbols:", error)
    return []
  }
}

// Helper function to extract train symbols from a sheet
async function extractTrainSymbols(
  sheet: any,
  spreadsheetId: string,
): Promise<{ symbol: string; description?: string }[]> {
  try {
    const rows = await sheet.getRows()
    console.log(`Found ${rows.length} rows in train symbols sheet for: ${spreadsheetId}`)

    // Log the headers to debug column name issues
    console.log(`Sheet headers: ${sheet.headerValues?.join(", ") || "No headers found"}`)

    if (rows.length === 0) {
      return []
    }

    // Log the first row for debugging
    if (rows.length > 0) {
      const firstRow = rows[0]
      console.log(
        "First row data:",
        Object.fromEntries((sheet.headerValues || []).map((header) => [header, firstRow.get(header)])),
      )
    }

    // Extract train symbols and descriptions from the rows
    const symbols = rows
      .map((row) => {
        // Try different possible column names
        const symbol = row.get("symbol") || row.get("trainSymbol") || row.get("train") || row.get("name") || ""
        const description = row.get("description") || row.get("desc") || row.get("notes") || ""

        if (!symbol) {
          console.log("Skipping row with no symbol")
          return null
        }

        console.log(`Found train symbol: ${symbol}, description: ${description}`)
        return {
          symbol,
          description,
        }
      })
      .filter(Boolean) // Remove any null values

    console.log(`Returning ${symbols.length} train symbols`)
    return symbols
  } catch (error) {
    console.error("Error extracting train symbols:", error)
    return []
  }
}

