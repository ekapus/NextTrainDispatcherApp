import { type NextRequest, NextResponse } from "next/server"
import { validateSpreadsheet } from "@/lib/spreadsheet-validator"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const result = await validateSpreadsheet(spreadsheetId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error validating spreadsheet:", error)
    return NextResponse.json({ error: "Failed to validate spreadsheet", details: String(error) }, { status: 500 })
  }
}

