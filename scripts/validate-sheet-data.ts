// Run with: npx tsx scripts/validate-sheet-data.ts

import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

const REQUIRED_SEGMENT_HEADERS = ["id", "name", "startX", "startY", "endX", "endY", "length", "maxSpeed"]
const REQUIRED_CONTROL_POINT_HEADERS = ["id", "name", "x", "y", "type"]
const VALID_CONTROL_POINT_TYPES = ["station", "signal", "switch", "staging"]

async function validateSheetData() {
  console.log("Validating Google Sheets data...")

  const auth = new JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_SPREADSHEET_ID!, auth)

  try {
    await doc.loadInfo()
    console.log("✅ Connected to spreadsheet:", doc.title)

    // Validate Segments sheet
    const segmentsSheet = doc.sheetsByTitle["Segments"]
    if (segmentsSheet) {
      console.log("\n📊 Validating Segments sheet...")

      // Check headers
      const missingHeaders = REQUIRED_SEGMENT_HEADERS.filter((h) => !segmentsSheet.headerValues?.includes(h))
      if (missingHeaders.length > 0) {
        console.log("❌ Missing required headers:", missingHeaders.join(", "))
      } else {
        console.log("✅ All required headers present")
      }

      // Check data
      const rows = await segmentsSheet.getRows()
      console.log(`Found ${rows.length} rows`)

      rows.forEach((row, i) => {
        const rowNum = i + 2 // Account for header row
        console.log(`\nValidating row ${rowNum}:`)

        // Check required fields
        REQUIRED_SEGMENT_HEADERS.forEach((field) => {
          const value = row.get(field)
          if (!value && value !== 0) {
            console.log(`❌ Row ${rowNum}: Missing ${field}`)
          }
        })

        // Check number fields
        const numberFields = ["startX", "startY", "endX", "endY", "length", "maxSpeed"]
        numberFields.forEach((field) => {
          const value = Number(row.get(field))
          if (isNaN(value)) {
            console.log(`❌ Row ${rowNum}: Invalid number for ${field}: ${row.get(field)}`)
          }
        })
      })
    } else {
      console.log("❌ Segments sheet not found")
    }

    // Validate ControlPoints sheet
    const controlPointsSheet = doc.sheetsByTitle["ControlPoints"]
    if (controlPointsSheet) {
      console.log("\n📍 Validating ControlPoints sheet...")

      // Check headers
      const missingHeaders = REQUIRED_CONTROL_POINT_HEADERS.filter((h) => !controlPointsSheet.headerValues?.includes(h))
      if (missingHeaders.length > 0) {
        console.log("❌ Missing required headers:", missingHeaders.join(", "))
      } else {
        console.log("✅ All required headers present")
      }

      // Check data
      const rows = await controlPointsSheet.getRows()
      console.log(`Found ${rows.length} rows`)

      rows.forEach((row, i) => {
        const rowNum = i + 2 // Account for header row
        console.log(`\nValidating row ${rowNum}:`)

        // Check required fields
        REQUIRED_CONTROL_POINT_HEADERS.forEach((field) => {
          const value = row.get(field)
          if (!value && value !== 0) {
            console.log(`❌ Row ${rowNum}: Missing ${field}`)
          }
        })

        // Check number fields
        const numberFields = ["x", "y"]
        numberFields.forEach((field) => {
          const value = Number(row.get(field))
          if (isNaN(value)) {
            console.log(`❌ Row ${rowNum}: Invalid number for ${field}: ${row.get(field)}`)
          }
        })

        // Check type field
        const type = row.get("type")
        if (!VALID_CONTROL_POINT_TYPES.includes(type)) {
          console.log(
            `❌ Row ${rowNum}: Invalid type: ${type}. Must be one of: ${VALID_CONTROL_POINT_TYPES.join(", ")}`,
          )
        }
      })
    } else {
      console.log("❌ ControlPoints sheet not found")
    }
  } catch (error) {
    console.error("❌ Error validating sheets:", error)
  }
}

validateSheetData().catch(console.error)

