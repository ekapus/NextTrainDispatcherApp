import { type NextRequest, NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { formatPrivateKey } from "@/lib/google-utils"

// Improve the metadata setup function to match the format used in the setup scripts
async function setupMetadataSheet(spreadsheetId: string) {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL environment variable is not set")
    }

    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      throw new Error("GOOGLE_SHEETS_PRIVATE_KEY environment variable is not set")
    }

    // Create auth object
    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY)
    const auth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    // Create a new document with auth
    const doc = new GoogleSpreadsheet(spreadsheetId, auth)

    // Load the document properties and worksheets
    await doc.loadInfo()
    console.log(`Setting up metadata sheet for: ${doc.title} (${spreadsheetId})`)

    // Check if Metadata sheet already exists
    let metadataSheet = doc.sheetsByTitle["Metadata"]
    let isNewSheet = false

    if (!metadataSheet) {
      console.log("Creating Metadata sheet...")
      metadataSheet = await doc.addSheet({
        title: "Metadata",
        headerValues: ["name", "value"],
      })
      isNewSheet = true
      console.log("Metadata sheet created")
    } else {
      console.log("Metadata sheet already exists, checking headers...")

      // Check if it has headers
      const headers = metadataSheet.headerValues || []

      // If no headers, add them
      if (headers.length === 0) {
        await metadataSheet.setHeaderRow(["name", "value"])
        console.log("Added headers to existing sheet")
      }
    }

    // Check if there's at least one row of data
    const rows = await metadataSheet.getRows()

    // If it's a new sheet or there's no data, add sample data
    if (isNewSheet || rows.length === 0) {
      console.log("Adding metadata rows...")

      // Add metadata rows
      const metadataRows = [
        { name: "name", value: doc.title },
        { name: "description", value: "Railroad division with tracks and control points" },
        { name: "region", value: "Northeast" },
        { name: "territory", value: "Main Line" },
        { name: "owner", value: "Dispatcher" },
        { name: "color", value: "#3b82f6" }, // blue-500
      ]

      for (const row of metadataRows) {
        await metadataSheet.addRow(row)
      }

      console.log("Metadata rows added")
    } else {
      console.log("Metadata sheet already has data, checking for missing fields...")

      // Check for required fields
      const requiredFields = ["name", "description", "region", "territory", "owner", "color"]
      const existingFields = rows.map((row) => row.get("name")?.toLowerCase())

      // Find missing fields
      const missingFields = requiredFields.filter((field) => !existingFields.includes(field.toLowerCase()))

      // Add any missing fields
      if (missingFields.length > 0) {
        console.log(`Adding missing fields: ${missingFields.join(", ")}`)

        for (const field of missingFields) {
          let defaultValue = ""

          // Set default values for missing fields
          if (field === "name") defaultValue = doc.title
          else if (field === "description") defaultValue = "Railroad division with tracks and control points"
          else if (field === "region") defaultValue = "Northeast"
          else if (field === "territory") defaultValue = "Main Line"
          else if (field === "owner") defaultValue = "Dispatcher"
          else if (field === "color") defaultValue = "#3b82f6"

          await metadataSheet.addRow({ name: field, value: defaultValue })
        }

        console.log("Added missing metadata fields")
      } else {
        console.log("All required metadata fields are present")
      }
    }

    return {
      success: true,
      message: "Metadata sheet setup complete",
      spreadsheetTitle: doc.title,
    }
  } catch (error) {
    console.error("Error setting up metadata sheet:", error)
    throw error
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const spreadsheetId = params.id

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const result = await setupMetadataSheet(spreadsheetId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: `Failed to set up metadata sheet: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

