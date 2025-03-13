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

    console.log(`API: Running train symbols diagnostics for spreadsheet: ${spreadsheetId}`)

    // Check if required environment variables are set
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      return NextResponse.json({ error: "Missing required environment variables for authentication" }, { status: 500 })
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

    // Get all sheet names
    const sheetNames = Object.keys(doc.sheetsByTitle)

    // Check for TrainSymbols sheet
    const trainSymbolsSheet = doc.sheetsByTitle["TrainSymbols"]
    let trainSymbolsData = null

    if (trainSymbolsSheet) {
      // Make sure to load the sheet headers explicitly before accessing them
      await trainSymbolsSheet.loadHeaderRow()
      const headers = trainSymbolsSheet.headerValues || []

      // Get sample data
      const rows = await trainSymbolsSheet.getRows()
      const sampleData = rows.slice(0, 5).map((row) => {
        const symbol = row.get("symbol") || row.get("trainSymbol") || row.get("train") || row.get("name")
        const description = row.get("description") || row.get("desc") || ""
        const type = row.get("type") || ""
        return { symbol, description, type }
      })

      trainSymbolsData = {
        exists: true,
        rowCount: rows.length,
        headers,
        sampleData,
        missingRequiredHeaders: !headers.includes("symbol"),
      }
    }

    // Return diagnostic data
    return NextResponse.json({
      spreadsheetId,
      spreadsheetTitle: doc.title,
      allSheets: sheetNames,
      trainSymbolsSheet: trainSymbolsData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("API error running train symbols diagnostics:", error)
    return NextResponse.json(
      {
        error: "Failed to run train symbols diagnostics",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

