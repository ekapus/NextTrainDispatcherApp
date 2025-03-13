import { NextResponse } from "next/server"
import { listSharedSpreadsheets } from "@/lib/google-drive-client"

export async function GET() {
  try {
    console.log("API: Checking for shared spreadsheets")

    // Check if required environment variables are set
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required environment variables",
          count: 0,
          spreadsheets: [],
        },
        { status: 400 },
      )
    }

    // Try to list shared spreadsheets
    const spreadsheets = await listSharedSpreadsheets()

    console.log(`API: Found ${spreadsheets.length} shared spreadsheets`)

    // Return basic info about the spreadsheets
    return NextResponse.json({
      success: true,
      count: spreadsheets.length,
      spreadsheets: spreadsheets.map((sheet) => ({
        id: sheet.id,
        name: sheet.name,
        createdTime: sheet.createdTime,
        modifiedTime: sheet.modifiedTime,
        owner: sheet.owners?.[0]?.emailAddress || "Unknown",
      })),
    })
  } catch (error) {
    console.error("API error checking shared spreadsheets:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        count: 0,
        spreadsheets: [],
      },
      { status: 500 },
    )
  }
}

