import { NextResponse } from "next/server"
import { fetchTrainSymbols } from "@/lib/google-sheets-client"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      console.log("API: No spreadsheet ID provided")
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    console.log(`API: Fetching train symbols for spreadsheet: ${spreadsheetId}`)

    // Try to fetch train symbols
    const symbols = await fetchTrainSymbols(spreadsheetId)
    console.log(`API: Found ${symbols.length} train symbols`)

    // If no symbols found, return empty array with diagnostic info
    if (symbols.length === 0) {
      console.log("API: No train symbols found, returning empty array")
      return NextResponse.json([])
    }

    return NextResponse.json(symbols)
  } catch (error) {
    console.error("API error fetching train symbols:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch train symbols",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

