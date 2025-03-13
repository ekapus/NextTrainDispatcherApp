import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize auth - get these values from your service account key JSON
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

async function setupMetadataForSpreadsheet(spreadsheetId, index) {
  if (!spreadsheetId) {
    console.log(`⚠️ Spreadsheet ID #${index} is not set, skipping...`)
    return false
  }

  try {
    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)

    console.log(`\n📊 Loading spreadsheet #${index} with ID: ${spreadsheetId}...`)
    await doc.loadInfo()
    console.log(`Working with: ${doc.title}`)

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

      // Add a sample row with different values based on index
      const regions = ["Northeast", "Midwest", "Southeast", "West", "Northwest"]
      const territories = ["Main Line", "Branch Line", "Mountain Division", "Coastal Division", "Desert Division"]
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] // blue, green, amber, red, purple

      await metadataSheet.addRow({
        name: `${doc.title}`,
        description: `Railroad division #${index} with tracks and control points`,
        region: regions[index % regions.length],
        territory: territories[index % territories.length],
        owner: "Dispatcher",
        color: colors[index % colors.length],
      })

      console.log("✅ Sample metadata added")
    } else {
      console.log("✅ Metadata sheet already has data")
    }

    return true
  } catch (error) {
    console.error(`❌ Error setting up metadata for spreadsheet #${index} (${spreadsheetId}):`, error)
    return false
  }
}

async function setupAllMetadata() {
  console.log("🚂 Setting up metadata for all configured spreadsheets...")

  // Get all spreadsheet IDs from environment variables
  const spreadsheetIds = [
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID_2,
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID_3,
  ]

  let successCount = 0
  let failCount = 0

  // Process each spreadsheet
  for (let i = 0; i < spreadsheetIds.length; i++) {
    const success = await setupMetadataForSpreadsheet(spreadsheetIds[i], i + 1)
    if (success) {
      successCount++
    } else if (spreadsheetIds[i]) {
      failCount++
    }
  }

  console.log("\n🎉 Metadata setup complete!")
  console.log(`✅ Successfully set up metadata for ${successCount} spreadsheet(s)`)
  if (failCount > 0) {
    console.log(`❌ Failed to set up metadata for ${failCount} spreadsheet(s)`)
  }

  console.log(
    "\nYou can now edit the values in the Metadata sheets to customize how each spreadsheet appears in the app.",
  )
  console.log("The following fields are supported:")
  console.log("- name: The name of the railroad division")
  console.log("- description: A brief description of the division")
  console.log("- region: The geographic region (e.g., Northeast, Midwest)")
  console.log("- territory: The specific territory or subdivision")
  console.log("- owner: The dispatcher or owner responsible for this division")
  console.log("- color: A hex color code (e.g., #3b82f6) used for styling in the app")
}

setupAllMetadata().catch((error) => {
  console.error("❌ Error setting up metadata:", error)
  process.exit(1)
})

