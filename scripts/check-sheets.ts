// Run with: npx tsx scripts/check-sheets.ts

import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

async function checkSheets() {
  console.log("Checking Google Sheets setup...")

  const auth = new JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_SPREADSHEET_ID!, auth)

  try {
    await doc.loadInfo()
    console.log("✅ Successfully connected to spreadsheet:", doc.title)

    // Check Segments sheet
    const segmentsSheet = doc.sheetsByTitle["Segments"]
    if (segmentsSheet) {
      const rows = await segmentsSheet.getRows()
      console.log("\n📊 Segments sheet:")
      console.log("- Row count:", rows.length)
      if (rows.length > 0) {
        console.log("- Sample row:", rows[0].toObject())
      }
    } else {
      console.log("❌ Segments sheet not found")
    }

    // Check ControlPoints sheet
    const controlPointsSheet = doc.sheetsByTitle["ControlPoints"]
    if (controlPointsSheet) {
      const rows = await controlPointsSheet.getRows()
      console.log("\n📍 ControlPoints sheet:")
      console.log("- Row count:", rows.length)
      if (rows.length > 0) {
        console.log("- Sample row:", rows[0].toObject())
      }
    } else {
      console.log("❌ ControlPoints sheet not found")
    }
  } catch (error) {
    console.error("❌ Error checking sheets:", error)
  }
}

checkSheets().catch(console.error)

