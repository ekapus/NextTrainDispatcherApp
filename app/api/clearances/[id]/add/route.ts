import { type NextRequest, NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import type { Clearance } from "@/lib/types"

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

async function addClearanceToSheet(clearance: Clearance, spreadsheetId: string): Promise<boolean> {
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

    console.log(`API: Adding clearance to spreadsheet: ${doc.title} (${spreadsheetId})`)

    // Get clearances sheet
    const clearancesSheet = doc.sheetsByTitle["Clearances"]
    if (!clearancesSheet) {
      throw new Error(`Clearances sheet not found in spreadsheet ${spreadsheetId}`)
    }

    // Convert clearance to row format
    const clearanceRow = {
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

    // Add the row to the sheet
    await clearancesSheet.addRow(clearanceRow)
    console.log(`API: Successfully added clearance ${clearance.id} to spreadsheet ${spreadsheetId}`)

    return true
  } catch (error) {
    console.error(`API: Error adding clearance to spreadsheet ${spreadsheetId}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const clearance = (await request.json()) as Clearance

    if (!clearance || !clearance.id) {
      return NextResponse.json({ error: "Invalid clearance data" }, { status: 400 })
    }

    await addClearanceToSheet(clearance, spreadsheetId)

    return NextResponse.json({ success: true, message: `Clearance ${clearance.id} added successfully` })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: `Failed to add clearance: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

