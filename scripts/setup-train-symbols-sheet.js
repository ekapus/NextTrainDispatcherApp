import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize auth - get these values from your service account key JSON
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

async function setupTrainSymbolsSheet() {
  // Initialize the sheet
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    console.error("❌ GOOGLE_SHEETS_SPREADSHEET_ID is not set")
    return
  }

  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)

  console.log("Loading document...")
  await doc.loadInfo()
  console.log(`Working with spreadsheet: ${doc.title}`)

  // Create or get TrainSymbols sheet
  let trainSymbolsSheet = doc.sheetsByTitle["TrainSymbols"]
  if (!trainSymbolsSheet) {
    console.log("Creating TrainSymbols sheet...")
    trainSymbolsSheet = await doc.addSheet({
      title: "TrainSymbols",
      headerValues: ["symbol", "description", "type"],
    })
    console.log("✅ TrainSymbols sheet created")
  } else {
    console.log("TrainSymbols sheet already exists, checking headers...")

    // Check if it has the correct headers
    const headers = trainSymbolsSheet.headerValues || []
    const requiredHeaders = ["symbol", "description", "type"]
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      console.log("❌ TrainSymbols sheet is missing some headers:", missingHeaders.join(", "))
      console.log("🔄 Updating headers...")

      // Add missing headers
      await trainSymbolsSheet.setHeaderRow([...headers, ...missingHeaders])
      console.log("✅ Headers updated")
    } else {
      console.log("✅ TrainSymbols sheet has all required headers")
    }
  }

  // Check if there's at least some sample data
  const rows = await trainSymbolsSheet.getRows()

  if (rows.length === 0) {
    console.log("📝 Adding sample train symbols...")

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

    console.log("✅ Sample train symbols added")
  } else {
    console.log(`✅ TrainSymbols sheet already has ${rows.length} symbols`)
  }

  console.log("\n🎉 TrainSymbols sheet setup complete!")
  console.log("\nYou can now add or edit train symbols in the TrainSymbols sheet.")
  console.log("These symbols will be available in the autocomplete dropdown when issuing Form D's.")
}

setupTrainSymbolsSheet().catch((error) => {
  console.error("❌ Error setting up TrainSymbols sheet:", error)
  process.exit(1)
})

