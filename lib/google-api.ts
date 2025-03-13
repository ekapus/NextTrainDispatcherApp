import { JWT } from "google-auth-library"
import { type drive_v3, google } from "googleapis"
import { formatPrivateKey } from "./google-utils"
import { GoogleSpreadsheet } from "google-spreadsheet"

/**
 * Fetch metadata from a Google Spreadsheet
 * This function expects a Metadata sheet with name-value pairs
 */
export async function fetchSpreadsheetMetadata(spreadsheetId: string) {
  try {
    console.log(`Fetching metadata for spreadsheet: ${spreadsheetId}`)

    // Check if required environment variables are set
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      console.error("Missing required environment variables for authentication")
      return null
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

    // Load the document info
    await doc.loadInfo()

    // Check if the Metadata sheet exists
    const metadataSheet = doc.sheetsByTitle["Metadata"]

    if (!metadataSheet) {
      console.log(`No Metadata sheet found in spreadsheet: ${spreadsheetId}`)
      return null
    }

    // Fetch the metadata values
    const rows = await metadataSheet.getRows()
    console.log(`Found ${rows.length} rows in Metadata sheet for: ${spreadsheetId}`)

    if (rows.length <= 1) {
      // Only header row or empty
      console.log(`Metadata sheet is empty for: ${spreadsheetId}`)
      return null
    }

    // Convert rows to key-value pairs
    // The format from setup scripts is:
    // Column A: name of the property (e.g., "name", "description")
    // Column B: value of the property
    const metadata: Record<string, string> = {}

    // Skip the header row if it exists
    const startIndex = rows[0].get("name") === "value" ? 1 : 0

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i]
      const name = row.get("name")
      if (name) {
        metadata[name.toLowerCase()] = row.get("value") || ""
      }
    }

    console.log(`Processed metadata for: ${spreadsheetId}`, metadata)

    // Check if we have at least a name in the metadata
    if (!metadata.name) {
      console.log(`No name found in metadata for: ${spreadsheetId}`)
      return null
    }

    return {
      name: metadata.name || "",
      description: metadata.description || "",
      region: metadata.region || "",
      territory: metadata.territory || "",
      owner: metadata.owner || "",
      color: metadata.color || "",
    }
  } catch (error) {
    console.error(`Error fetching metadata for spreadsheet ${spreadsheetId}:`, error)
    return null
  }
}

/**
 * Get a Google Drive client
 */
function getDriveClient(): drive_v3.Drive {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL environment variable is not set")
    }

    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      throw new Error("GOOGLE_SHEETS_PRIVATE_KEY environment variable is not set")
    }

    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY)

    const auth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ],
    })

    return google.drive({ version: "v3", auth })
  } catch (error) {
    console.error("Failed to initialize Drive client:", error)
    throw new Error(
      `Failed to initialize Google Drive client: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Get details about a specific spreadsheet
 */
export async function getSpreadsheetDetails(spreadsheetId: string) {
  try {
    const drive = getDriveClient()
    const response = await drive.files.get({
      fileId: spreadsheetId,
      fields: "id, name, description, createdTime, modifiedTime, owners, sharingUser",
    })

    return response.data
  } catch (error) {
    console.error(`Error getting details for spreadsheet ${spreadsheetId}:`, error)
    throw new Error(`Failed to get spreadsheet details: ${error instanceof Error ? error.message : String(error)}`)
  }
}

