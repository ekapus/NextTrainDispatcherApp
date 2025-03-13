import { NextResponse } from "next/server"
import { getLoadedDoc } from "@/lib/google-sheets-loader"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    // Get the request body to see if we're using an alternative sheet
    const body = await request.json()
    const { useAlternativeSheet, alternativeSheetName, symbolColumn, descriptionColumn } = body

    console.log(`API: Fixing train symbols for spreadsheet: ${spreadsheetId}`)

    // Load the document
    const doc = await getLoadedDoc(spreadsheetId)

    // Check if TrainSymbols sheet exists
    let trainSymbolsSheet = doc.sheetsByTitle["TrainSymbols"]
    let created = false
    let updated = false
    let copied = false
    let addedSampleData = false

    // If we need to use an alternative sheet
    if (useAlternativeSheet && alternativeSheetName && symbolColumn) {
      const sourceSheet = doc.sheetsByTitle[alternativeSheetName]
      if (!sourceSheet) {
        return NextResponse.json({ error: `Sheet ${alternativeSheetName} not found` }, { status: 400 })
      }

      // Create TrainSymbols sheet if it doesn't exist
      if (!trainSymbolsSheet) {
        trainSymbolsSheet = await doc.addSheet({
          title: "TrainSymbols",
          headerValues: ["symbol", "description", "type"],
        })
        created = true
      }

      // Copy data from alternative sheet
      const sourceRows = await sourceSheet.getRows()

      for (const row of sourceRows) {
        const symbol = row.get(symbolColumn)
        const description = descriptionColumn ? row.get(descriptionColumn) : ""

        if (symbol) {
          await trainSymbolsSheet.addRow({
            symbol,
            description,
            type: description.toLowerCase().includes("passenger")
              ? "passenger"
              : description.toLowerCase().includes("maintenance")
                ? "maintenance"
                : "freight",
          })
        }
      }

      copied = true
    } else {
      // Create or update the TrainSymbols sheet
      if (!trainSymbolsSheet) {
        trainSymbolsSheet = await doc.addSheet({
          title: "TrainSymbols",
          headerValues: ["symbol", "description", "type"],
        })
        created = true
      } else {
        // Check if it has the correct headers
        const headers = trainSymbolsSheet.headerValues || []
        const requiredHeaders = ["symbol", "description", "type"]
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

        if (missingHeaders.length > 0) {
          // Add missing headers
          await trainSymbolsSheet.setHeaderRow([...headers, ...missingHeaders])
          updated = true
        }
      }

      // Check if there's data and add sample data if needed
      const rows = await trainSymbolsSheet.getRows()

      if (rows.length === 0) {
        // Add sample train symbols
        const sampleSymbols = [
          { symbol: "AMTK 20", description: "Amtrak Northeast Regional", type: "passenger" },
          { symbol: "AMTK 171", description: "Amtrak Acela Express", type: "passenger" },
          { symbol: "CSX Q410", description: "CSX Intermodal", type: "freight" },
          { symbol: "NS 202", description: "Norfolk Southern Manifest", type: "freight" },
          { symbol: "UP 4371", description: "Union Pacific Mixed Freight", type: "freight" },
          { symbol: "BNSF 7890", description: "BNSF Intermodal", type: "freight" },
          { symbol: "KCS 4512", description: "Kansas City Southern", type: "freight" },
          { symbol: "CN 5623", description: "Canadian National", type: "freight" },
          { symbol: "CP 8721", description: "Canadian Pacific", type: "freight" },
          { symbol: "EIC Smith", description: "Employee in Charge - Track Maintenance", type: "maintenance" },
          { symbol: "EIC Jones", description: "Employee in Charge - Signal Work", type: "maintenance" },
          { symbol: "MOW 101", description: "Maintenance of Way", type: "maintenance" },
        ]

        for (const symbol of sampleSymbols) {
          await trainSymbolsSheet.addRow(symbol)
        }

        addedSampleData = true
      }
    }

    // Get the updated sheet info
    const updatedRows = await trainSymbolsSheet.getRows()

    return NextResponse.json({
      success: true,
      message: "Train symbols sheet fixed successfully",
      details: {
        created,
        updated,
        copied,
        addedSampleData,
        rowCount: updatedRows.length,
      },
    })
  } catch (error) {
    console.error("API error fixing train symbols:", error)
    return NextResponse.json(
      {
        error: "Failed to fix train symbols",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

