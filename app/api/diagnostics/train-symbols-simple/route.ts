import { NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { formatPrivateKey } from "@/lib/google-utils"
import { listSharedSpreadsheets } from "@/lib/google-drive-client"

export async function GET(request: Request) {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      console.error("GOOGLE_SHEETS_CLIENT_EMAIL is not set")
      return NextResponse.json(
        {
          error: "Missing environment variable: GOOGLE_SHEETS_CLIENT_EMAIL",
        },
        { status: 500 },
      )
    }

    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      console.error("GOOGLE_SHEETS_PRIVATE_KEY is not set")
      return NextResponse.json(
        {
          error: "Missing environment variable: GOOGLE_SHEETS_PRIVATE_KEY",
        },
        { status: 500 },
      )
    }

    // Get spreadsheets shared with the service account
    let sharedSpreadsheets = []
    try {
      console.log("Attempting to list shared spreadsheets")
      sharedSpreadsheets = await listSharedSpreadsheets()
      console.log(`Found ${sharedSpreadsheets.length} shared spreadsheets`)
    } catch (error) {
      console.error("Error listing shared spreadsheets:", error)
      return NextResponse.json(
        {
          error: "Failed to list shared spreadsheets",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    if (sharedSpreadsheets.length === 0) {
      return NextResponse.json(
        {
          error: "No shared spreadsheets found",
          message: "Make sure to share your Google Sheets with the service account email.",
          environment: {
            GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ? "Set" : "Not set",
            GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY ? "Set" : "Not set",
          },
        },
        { status: 404 },
      )
    }

    // Check each spreadsheet for train symbols
    const results = []

    // Create auth object once
    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "")
    const auth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "",
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    for (const spreadsheet of sharedSpreadsheets) {
      if (!spreadsheet.id) continue

      try {
        console.log(`Checking spreadsheet: ${spreadsheet.id}`)

        // Create a new document instance for each spreadsheet with auth
        const doc = new GoogleSpreadsheet(spreadsheet.id, auth)

        // Load the document info
        try {
          await doc.loadInfo()

          const sheetNames = Object.keys(doc.sheetsByTitle)
          const hasTrainSymbolsSheet = sheetNames.includes("TrainSymbols")

          let trainSymbolsData = null
          if (hasTrainSymbolsSheet) {
            const sheet = doc.sheetsByTitle["TrainSymbols"]

            // Make sure to load the sheet headers explicitly before accessing them
            await sheet.loadHeaderRow()
            const headers = sheet.headerValues || []

            try {
              const rows = await sheet.getRows()

              trainSymbolsData = {
                rowCount: rows.length,
                headers,
                hasSymbolHeader: headers.includes("symbol"),
                sampleData: rows.slice(0, 3).map((row) => {
                  try {
                    return {
                      symbol:
                        row.get("symbol") || row.get("trainSymbol") || row.get("train") || row.get("name") || "N/A",
                      description: row.get("description") || row.get("desc") || "",
                    }
                  } catch (rowError) {
                    console.error(`Error processing row:`, rowError)
                    return { symbol: "Error processing row", description: "" }
                  }
                }),
              }
            } catch (rowsError) {
              console.error(`Error getting rows from sheet:`, rowsError)
              trainSymbolsData = {
                error: rowsError instanceof Error ? rowsError.message : String(rowsError),
                headers,
                hasSymbolHeader: headers.includes("symbol"),
                rowCount: 0,
                sampleData: [],
              }
            }
          }

          results.push({
            id: spreadsheet.id,
            title: doc.title,
            sheetNames,
            hasTrainSymbolsSheet,
            trainSymbolsData,
          })
        } catch (loadInfoError) {
          console.error(`Error loading info for spreadsheet ${spreadsheet.id}:`, loadInfoError)
          results.push({
            id: spreadsheet.id,
            error: `Failed to load spreadsheet info: ${loadInfoError instanceof Error ? loadInfoError.message : String(loadInfoError)}`,
          })
        }
      } catch (error) {
        console.error(`Error checking spreadsheet ${spreadsheet.id}:`, error)
        results.push({
          id: spreadsheet.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({
      spreadsheetCount: sharedSpreadsheets.length,
      results,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Failed to check train symbols",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

