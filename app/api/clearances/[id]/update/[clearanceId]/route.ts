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

async function updateClearanceInSheet(
  clearanceId: string,
  updates: Partial<Clearance>,
  spreadsheetId: string,
): Promise<boolean> {
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

    console.log(`API: Updating clearance ${clearanceId} in spreadsheet: ${doc.title} (${spreadsheetId})`)

    // Get clearances sheet
    const clearancesSheet = doc.sheetsByTitle["Clearances"]
    if (!clearancesSheet) {
      throw new Error(`Clearances sheet not found in spreadsheet ${spreadsheetId}`)
    }

    // Get all rows
    const rows = await clearancesSheet.getRows()

    // Find the row with the matching clearance ID
    const row = rows.find((r) => r.get("id") === clearanceId)

    if (!row) {
      throw new Error(`Clearance with ID ${clearanceId} not found in spreadsheet ${spreadsheetId}`)
    }

    console.log(`API: Found clearance ${clearanceId}, applying updates...`)

    // Apply updates to the row
    if (updates.status) row.set("status", updates.status)
    if (updates.completedAt) row.set("completedAt", updates.completedAt)
    if (updates.tracks) row.set("tracks", JSON.stringify(updates.tracks))
    if (updates.effectiveDate) row.set("effectiveDate", updates.effectiveDate)
    if (updates.effectiveTimeFrom) row.set("effectiveTimeFrom", updates.effectiveTimeFrom)
    if (updates.effectiveTimeTo !== undefined) row.set("effectiveTimeTo", updates.effectiveTimeTo || "")
    if (updates.specialInstructions !== undefined) row.set("specialInstructions", updates.specialInstructions || "")
    if (updates.issuedTo) row.set("issuedTo", updates.issuedTo)
    if (updates.trainSymbol !== undefined) row.set("trainSymbol", updates.trainSymbol || "")

    // Save the changes
    await row.save()
    console.log(`API: Successfully updated clearance ${clearanceId} in spreadsheet ${spreadsheetId}`)

    return true
  } catch (error) {
    console.error(`API: Error updating clearance in spreadsheet ${spreadsheetId}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string; clearanceId: string } }) {
  try {
    const { id: spreadsheetId, clearanceId } = params

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    if (!clearanceId) {
      return NextResponse.json({ error: "Clearance ID is required" }, { status: 400 })
    }

    const updates = (await request.json()) as Partial<Clearance>

    if (!updates) {
      return NextResponse.json({ error: "Invalid update data" }, { status: 400 })
    }

    await updateClearanceInSheet(clearanceId, updates, spreadsheetId)

    return NextResponse.json({
      success: true,
      message: `Clearance ${clearanceId} updated successfully`,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: `Failed to update clearance: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

