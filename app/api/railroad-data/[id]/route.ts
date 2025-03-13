import { NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import type { RailroadSegment, ControlPoint } from "@/lib/types"

// Helper function to properly format the private key
function formatPrivateKey(key: string): string {
  if (!key) {
    throw new Error("Private key is required")
  }

  // First, try to detect if the key is base64 encoded
  let formattedKey = key
  if (key.indexOf(" ") === -1 && key.indexOf("\n") === -1) {
    try {
      formattedKey = Buffer.from(key, "base64").toString()
    } catch (error) {
      console.error("Failed to decode base64 key, attempting to process as raw key")
    }
  }

  // Clean up the key by removing any existing formatting
  formattedKey = formattedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, "")
    .trim()

  // Format the key body into 64-character lines
  const keyLines: string[] = []
  for (let i = 0; i < formattedKey.length; i += 64) {
    keyLines.push(formattedKey.slice(i, i + 64))
  }

  // Construct the final PEM format with proper spacing
  const pemKey = ["-----BEGIN PRIVATE KEY-----", ...keyLines, "-----END PRIVATE KEY-----"].join("\n")

  return pemKey
}

async function getSpreadsheetData(spreadsheetId: string) {
  try {
    // Initialize auth
    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "")
    const auth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    // Initialize the sheet
    const doc = new GoogleSpreadsheet(spreadsheetId, auth)
    await doc.loadInfo()

    console.log(`API: Fetching data from spreadsheet: ${doc.title} (${spreadsheetId})`)

    // Get segments
    const segmentsSheet = doc.sheetsByTitle["Segments"]
    if (!segmentsSheet) {
      throw new Error(`Segments sheet not found in spreadsheet ${spreadsheetId}`)
    }

    const segmentRows = await segmentsSheet.getRows()
    const segments: RailroadSegment[] = segmentRows.map((row) => ({
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
    }))

    // Get control points
    const controlPointsSheet = doc.sheetsByTitle["ControlPoints"]
    if (!controlPointsSheet) {
      throw new Error(`ControlPoints sheet not found in spreadsheet ${spreadsheetId}`)
    }

    const controlPointRows = await controlPointsSheet.getRows()
    const controlPoints: ControlPoint[] = controlPointRows.map((row) => ({
      id: row.get("id"),
      name: row.get("name"),
      x: Number(row.get("x")),
      y: Number(row.get("y")),
      type: row.get("type") as "station" | "signal" | "switch" | "staging",
    }))

    console.log(`API: Found ${segments.length} segments and ${controlPoints.length} control points`)

    return { segments, controlPoints }
  } catch (error) {
    console.error(`API: Error fetching data from spreadsheet ${spreadsheetId}:`, error)
    throw error
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const data = await getSpreadsheetData(spreadsheetId)
    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: `Failed to fetch railroad data: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

