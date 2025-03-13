import { NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { formatPrivateKey } from "@/lib/google-utils"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    // Initialize auth
    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "")
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL

    if (!privateKey || !clientEmail) {
      return NextResponse.json({ error: "Google Sheets credentials are not configured" }, { status: 500 })
    }

    const jwt = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    // Load the spreadsheet
    const doc = new GoogleSpreadsheet(spreadsheetId, jwt)
    await doc.loadInfo()

    // Try to find the Metadata sheet
    let metadataSheet
    try {
      metadataSheet = doc.sheetsByTitle["Metadata"]
      if (!metadataSheet) {
        // Try to find a sheet with "metadata" in the title (case insensitive)
        metadataSheet = Object.values(doc.sheetsByTitle).find((sheet) => sheet.title.toLowerCase().includes("metadata"))
      }
    } catch (error) {
      console.error("Error finding Metadata sheet:", error)
    }

    if (!metadataSheet) {
      return NextResponse.json(
        {
          name: doc.title,
          error: "Metadata sheet not found",
        },
        { status: 200 },
      )
    }

    // Load the rows from the Metadata sheet
    await metadataSheet.loadHeaderRow()
    const rows = await metadataSheet.getRows()

    if (rows.length === 0) {
      return NextResponse.json(
        {
          name: doc.title,
          error: "No metadata rows found",
        },
        { status: 200 },
      )
    }

    // Create a metadata object from the rows
    const metadata: Record<string, string> = {}

    for (const row of rows) {
      const key = row.get("Key")
      const value = row.get("Value")

      if (key && value) {
        metadata[key.toLowerCase()] = value
      }
    }

    // Return the metadata
    return NextResponse.json({
      name: metadata.name || doc.title,
      description: metadata.description || "",
      region: metadata.region || "",
      territory: metadata.territory || "",
      owner: metadata.owner || "",
      color: metadata.color || "",
      spreadsheetId: spreadsheetId,
      spreadsheetTitle: doc.title,
    })
  } catch (error) {
    console.error("Error fetching metadata:", error)
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 })
  }
}

