import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize auth - get these values from your service account key JSON
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

async function updateSegmentsSchema() {
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

  // Get Segments sheet
  const segmentsSheet = doc.sheetsByTitle["Segments"]
  if (!segmentsSheet) {
    console.error("❌ Segments sheet not found")
    return
  }

  console.log("Checking Segments sheet headers...")

  // Check if it has the correct headers
  const headers = segmentsSheet.headerValues || []
  const requiredHeaders = [
    "id",
    "name",
    "startX",
    "startY",
    "endX",
    "endY",
    "length",
    "maxSpeed",
    "type",
    // First connection
    "connectsToSegmentId",
    "connectionStartX",
    "connectionStartY",
    "connectionEndX",
    "connectionEndY",
    // Second connection
    "connectsToSegmentId2",
    "connection2StartX",
    "connection2StartY",
    "connection2EndX",
    "connection2EndY",
  ]
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

  if (missingHeaders.length > 0) {
    console.log("❌ Segments sheet is missing some headers:", missingHeaders.join(", "))
    console.log("🔄 Updating headers...")

    // Add missing headers
    await segmentsSheet.setHeaderRow([...headers, ...missingHeaders])
    console.log("✅ Headers updated")
  } else {
    console.log("✅ Segments sheet has all required headers")
  }

  console.log("\n🎉 Segments schema update complete!")
  console.log("\nYou can now add connection information to your segments:")
  console.log("\nFirst connection:")
  console.log("- connectsToSegmentId: The ID of the segment this one connects to")
  console.log("- connectionStartX/Y: The starting point of the connection line (usually one of the segment endpoints)")
  console.log("- connectionEndX/Y: The ending point of the connection line (a point on the connected segment)")
  console.log("\nSecond connection:")
  console.log("- connectsToSegmentId2: The ID of the second segment this one connects to")
  console.log(
    "- connection2StartX/Y: The starting point of the second connection line (usually the other segment endpoint)",
  )
  console.log(
    "- connection2EndX/Y: The ending point of the second connection line (a point on the second connected segment)",
  )
}

updateSegmentsSchema().catch((error) => {
  console.error("❌ Error updating segments schema:", error)
  process.exit(1)
})

