import { NextResponse } from "next/server"
import { checkAndAnnulExpiredClearances } from "@/lib/auto-annul-service"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const result = await checkAndAnnulExpiredClearances(spreadsheetId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: `Failed to check for expired clearances: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
        annulledCount: 0,
      },
      { status: 500 },
    )
  }
}

