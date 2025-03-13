import { NextResponse } from "next/server"
import { fetchSpreadsheetMetadata } from "@/lib/google-sheets-client"

export async function GET() {
  try {
    // Collect debug information
    const debugInfo = {
      environment: {
        GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ? "✓ Set" : "✗ Not set",
        GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY ? "✓ Set" : "✗ Not set",
        GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "Not set",
        GOOGLE_SHEETS_SPREADSHEET_ID_2: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_2 || "Not set",
        GOOGLE_SHEETS_SPREADSHEET_ID_3: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_3 || "Not set",
        NODE_ENV: process.env.NODE_ENV || "Not set",
        VERCEL_ENV: process.env.VERCEL_ENV || "Not set",
      },
      timestamp: new Date().toISOString(),
      apiRoutes: {
        health: "/api/health",
        spreadsheets: "/api/spreadsheets",
        debug: "/api/spreadsheets/debug",
        setup: "/api/spreadsheets/[id]/setup",
      },
    }

    // Try to list spreadsheets via Drive API
    try {
      const { listSharedSpreadsheets } = await import("@/lib/google-drive-client")
      const files = await listSharedSpreadsheets()

      // Check metadata for each spreadsheet
      const metadataChecks = await Promise.all(
        files.map(async (file) => {
          try {
            const metadata = await fetchSpreadsheetMetadata(file.id || "")
            return {
              id: file.id,
              name: file.name,
              hasMetadata: !!metadata,
              metadata: metadata
                ? {
                    name: metadata.name,
                    description: metadata.description,
                    region: metadata.region,
                    territory: metadata.territory,
                    owner: metadata.owner,
                    color: metadata.color,
                  }
                : null,
            }
          } catch (error) {
            return {
              id: file.id,
              name: file.name,
              hasMetadata: false,
              error: error instanceof Error ? error.message : String(error),
            }
          }
        }),
      )

      debugInfo.driveApi = {
        status: "success",
        spreadsheetCount: files.length,
        spreadsheets: files.map((f) => ({
          id: f.id,
          name: f.name,
          modifiedTime: f.modifiedTime,
        })),
        metadataChecks,
      }
    } catch (error) {
      debugInfo.driveApi = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      }
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate debug information",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

