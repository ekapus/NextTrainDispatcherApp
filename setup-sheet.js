import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize auth - get these values from your service account key JSON
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

async function setupSpreadsheet() {
  // Initialize the sheet
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_SPREADSHEET_ID!, serviceAccountAuth)

  console.log("Loading document...")
  await doc.loadInfo()

  // Create or get Segments sheet
  let segmentsSheet = doc.sheetsByTitle["Segments"]
  if (!segmentsSheet) {
    console.log("Creating Segments sheet...")
    segmentsSheet = await doc.addSheet({
      title: "Segments",
      headerValues: ["id", "name", "startX", "startY", "endX", "endY", "length", "maxSpeed"],
    })
  }

  // Create or get ControlPoints sheet
  let controlPointsSheet = doc.sheetsByTitle["ControlPoints"]
  if (!controlPointsSheet) {
    console.log("Creating ControlPoints sheet...")
    controlPointsSheet = await doc.addSheet({ title: "ControlPoints", headerValues: ["id", "name", "x", "y", "type"] })
  }

  // Create or get Clearances sheet
  let clearancesSheet = doc.sheetsByTitle["Clearances"]
  if (!clearancesSheet) {
    console.log("Creating Clearances sheet...")
    clearancesSheet = await doc.addSheet({
      title: "Clearances",
      headerValues: [
        "id",
        "formType",
        "lineSubdivision",
        "fromLocation",
        "toLocation",
        "tracks",
        "effectiveDate",
        "effectiveTimeFrom",
        "effectiveTimeTo",
        "specialInstructions",
        "status",
        "issuedAt",
        "issuedBy",
        "issuedTo",
        "completedAt",
        "speedRestrictions",
      ],
    })
  }

  // Add sample data to Segments
  if ((await segmentsSheet.getRows()).length === 0) {
    console.log("Adding sample segments...")
    await segmentsSheet.addRows([
      {
        id: "1",
        name: "Mainline - MP 0-15",
        startX: 100,
        startY: 200,
        endX: 400,
        endY: 200,
        length: 1,
        maxSpeed: 60,
      },
      // Add more sample segments as needed
    ])
  }

  // Add sample data to ControlPoints
  if ((await controlPointsSheet.getRows()).length === 0) {
    console.log("Adding sample control points...")
    await controlPointsSheet.addRows([
      {
        id: "cp-1",
        name: "West Staging",
        x: 100,
        y: 200,
        type: "staging",
      },
      // Add more sample control points as needed
    ])
  }

  console.log("Setup complete!")
}

setupSpreadsheet().catch(console.error)

