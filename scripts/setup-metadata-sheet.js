import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize auth - get these values from your service account key JSON
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

async function setupMetadataSheet() {
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

  // Create or get Metadata sheet
  let metadataSheet = doc.sheetsByTitle["Metadata"]
  if (!metadataSheet) {
    console.log("Creating Metadata sheet...")
    metadataSheet = await doc.addSheet({
      title: "Metadata",
      headerValues: ["name", "description", "region", "territory", "owner", "color"],
    })
    console.log("✅ Metadata sheet created")
  } else {
    console.log("Metadata sheet already exists, checking headers...")

    // Check if it has the correct headers
    const headers = metadataSheet.headerValues || []
    const requiredHeaders = ["name", "description", "region", "territory", "owner", "color"]
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      console.log("❌ Metadata sheet is missing some headers:", missingHeaders.join(", "))
      console.log("🔄 Updating headers...")

      // Add missing headers
      await metadataSheet.setHeaderRow([...headers, ...missingHeaders])
      console.log("✅ Headers updated")
    } else {
      console.log("✅ Metadata sheet has all required headers")
    }
  }

  // Check if there's at least one row of data
  const rows = await metadataSheet.getRows()

  if (rows.length === 0) {
    console.log("📝 Adding sample metadata row...")

    // Add a sample row
    await metadataSheet.addRow({
      name: doc.title,
      description: "Railroad division with tracks and control points",
      region: "Northeast",
      territory: "Main Line",
      owner: "Dispatcher",
      color: "#3b82f6", // blue-500
    })

    console.log("✅ Sample metadata added")
  } else {
    console.log("✅ Metadata sheet already has data")
  }

  console.log("\n🎉 Metadata sheet setup complete!")
  console.log(
    "\nYou can now edit the values in the Metadata sheet to customize how this spreadsheet appears in the app.",
  )
  console.log("The following fields are supported:")
  console.log("- name: The name of the railroad division")
  console.log("- description: A brief description of the division")
  console.log("- region: The geographic region (e.g., Northeast, Midwest)")
  console.log("- territory: The specific territory or subdivision")
  console.log("- owner: The dispatcher or owner responsible for this division")
  console.log("- color: A hex color code (e.g., #3b82f6) used for styling in the app")
}

setupMetadataSheet().catch((error) => {
  console.error("❌ Error setting up metadata sheet:", error)
  process.exit(1)
})

