import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { type sheets_v4, google } from "googleapis"
import { formatPrivateKey } from "./google-utils"

// Cache for loaded documents to avoid repeated loading
const docCache = new Map<string, GoogleSpreadsheet>()

// Get a loaded Google Spreadsheet document
export async function getLoadedDoc(spreadsheetId: string): Promise<GoogleSpreadsheet> {
  // Check if the document is already in the cache
  if (docCache.has(spreadsheetId)) {
    return docCache.get(spreadsheetId)!
  }

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

    // Add the document to the cache
    docCache.set(spreadsheetId, doc)

    return doc
  } catch (error) {
    console.error(`Error loading spreadsheet ${spreadsheetId}:`, error)
    throw new Error(`Failed to load spreadsheet: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Get a Google Sheets API client
export function getGoogleSheetsClient(): sheets_v4.Sheets {
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
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    return google.sheets({ version: "v4", auth })
  } catch (error) {
    console.error("Failed to initialize Google Sheets client:", error)
    throw new Error(
      `Failed to initialize Google Sheets client: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

