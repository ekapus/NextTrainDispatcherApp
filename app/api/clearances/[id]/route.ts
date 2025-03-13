import { NextResponse } from "next/server"
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

async function getSpreadsheetClearances(spreadsheetId: string) {
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

    console.log(`API: Fetching clearances from spreadsheet: ${doc.title} (${spreadsheetId})`)

    // Get clearances
    const clearancesSheet = doc.sheetsByTitle["Clearances"]
    if (!clearancesSheet) {
      throw new Error(`Clearances sheet not found in spreadsheet ${spreadsheetId}`)
    }

    const rows = await clearancesSheet.getRows()
    const clearances: Clearance[] = rows.map((row) => {
      return {
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
    })

    console.log(`API: Found ${clearances.length} clearances`)

    return clearances
  } catch (error) {
    console.error(`API: Error fetching clearances from spreadsheet ${spreadsheetId}:`, error)
    throw error
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const clearances = await getSpreadsheetClearances(spreadsheetId)
    return NextResponse.json(clearances)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: `Failed to fetch clearances: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

