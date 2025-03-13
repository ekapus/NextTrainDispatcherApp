// Run with: npx tsx scripts/check-train-symbols.ts

import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { formatPrivateKey } from "../lib/google-utils"

async function checkTrainSymbols() {
  console.log("Checking TrainSymbols sheet setup...")

  const auth = new JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || ""),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  // Get spreadsheet ID from environment or command line
  const spreadsheetId = process.argv[2] || process.env.GOOGLE_SHEETS_SPREADSHEET_ID

  if (!spreadsheetId) {
    console.error("❌ No spreadsheet ID provided. Please set GOOGLE_SHEETS_SPREADSHEET_ID or pass ID as argument")
    process.exit(1)
  }

  console.log(`Checking spreadsheet: ${spreadsheetId}`)
  const doc = new GoogleSpreadsheet(spreadsheetId, auth)

  try {
    await doc.loadInfo()
    console.log("✅ Successfully connected to spreadsheet:", doc.title)

    // List all sheets
    console.log("\n📋 Available sheets:")
    Object.keys(doc.sheetsByTitle).forEach((title) => {
      console.log(`- ${title}`)
    })

    // Check for TrainSymbols sheet
    const trainSymbolsSheet = doc.sheetsByTitle["TrainSymbols"]
    if (trainSymbolsSheet) {
      console.log("\n✅ TrainSymbols sheet found")

      // Check headers
      console.log("\n📊 Headers:")
      console.log(trainSymbolsSheet.headerValues)

      // Check data
      const rows = await trainSymbolsSheet.getRows()
      console.log(`\n📊 Found ${rows.length} train symbols`)

      if (rows.length > 0) {
        console.log("\n📊 Sample data:")
        rows.slice(0, 3).forEach((row, i) => {
          const symbol = row.get("symbol") || row.get("trainSymbol") || row.get("train") || row.get("name")
          const description = row.get("description") || row.get("desc")
          console.log(`${i + 1}. Symbol: ${symbol}, Description: ${description}`)
        })
      } else {
        console.log("❌ No data found in TrainSymbols sheet")
      }
    } else {
      console.log("\n❌ TrainSymbols sheet not found")

      // Look for alternative sheets that might contain train symbols
      console.log("\n🔍 Looking for alternative sheets...")
      const possibleSheets = Object.keys(doc.sheetsByTitle).filter(
        (name) => name.toLowerCase().includes("train") || name.toLowerCase().includes("symbol"),
      )

      if (possibleSheets.length > 0) {
        console.log("Possible alternative sheets found:", possibleSheets.join(", "))

        // Check the first possible sheet
        if (possibleSheets.length > 0) {
          const altSheet = doc.sheetsByTitle[possibleSheets[0]]
          console.log(`\n📊 Checking ${possibleSheets[0]} sheet:`)
          console.log("Headers:", altSheet.headerValues)

          const rows = await altSheet.getRows()
          console.log(`Found ${rows.length} rows`)

          if (rows.length > 0) {
            console.log(
              "Sample row:",
              Object.fromEntries((altSheet.headerValues || []).map((header) => [header, rows[0].get(header)])),
            )
          }
        }
      } else {
        console.log("No alternative sheets found that might contain train symbols")
      }

      console.log("\n📝 Would you like to create a TrainSymbols sheet? Run: npm run setup-train-symbols-sheet")
    }
  } catch (error) {
    console.error("❌ Error checking train symbols:", error)
  }
}

checkTrainSymbols().catch(console.error)

