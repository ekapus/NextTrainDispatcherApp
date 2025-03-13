import { JWT } from "google-auth-library"
import { type drive_v3, google } from "googleapis"
import { fetchSpreadsheetMetadata } from "@/lib/google-sheets-client"

// Helper function to properly format the private key
function formatPrivateKey(key: string): string {
  if (!key) {
    throw new Error("Private key is required")
  }

  // First, try to detect if the key is base64 encoded
  let formattedKey = key
  if (key.indexOf(" ") === -1 && key.indexOf("\n") === -1) {
    try {
      formattedKey = Buffer.from(key, "base64").toString()
    } catch (error) {
      console.error("Failed to decode base64 key, attempting to process as raw key")
    }
  }

  // Clean up the key by removing any existing formatting
  formattedKey = formattedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, "")
    .trim()

  // Format the key body into 64-character lines
  const keyLines: string[] = []
  for (let i = 0; i < formattedKey.length; i += 64) {
    keyLines.push(formattedKey.slice(i, i + 64))
  }

  // Construct the final PEM format with proper spacing
  const pemKey = ["-----BEGIN PRIVATE KEY-----", ...keyLines, "-----END PRIVATE KEY-----"].join("\n")

  return pemKey
}

// Initialize auth client with error handling
function getAuthClient() {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL environment variable is not set")
    }

    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      throw new Error("GOOGLE_SHEETS_PRIVATE_KEY environment variable is not set")
    }

    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY)

    return new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ],
    })
  } catch (error) {
    console.error("Failed to initialize auth client:", error)
    throw new Error(`Failed to initialize Google client: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Get a Google Drive client
function getDriveClient(): drive_v3.Drive {
  const auth = getAuthClient()
  return google.drive({ version: "v3", auth })
}

// List all Google Spreadsheets shared with the service account
export async function listSharedSpreadsheets() {
  try {
    console.log("Initializing Drive client with service account:", process.env.GOOGLE_SHEETS_CLIENT_EMAIL)
    const drive = getDriveClient()

    // Query for all Google Spreadsheets with no limit on results
    console.log("Querying Drive API for spreadsheets...")
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: "files(id, name, description, createdTime, modifiedTime, owners, sharingUser)",
      orderBy: "modifiedTime desc",
      pageSize: 100, // Increase page size to get more results
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })

    console.log(`Drive API returned ${response.data.files?.length || 0} spreadsheets`)

    // Log detailed information about each spreadsheet for debugging
    if (response.data.files && response.data.files.length > 0) {
      response.data.files.forEach((file) => {
        console.log(`Found spreadsheet: ${file.name} (${file.id})`)
        console.log(`  Created: ${file.createdTime}, Modified: ${file.modifiedTime}`)
        if (file.owners) {
          console.log(`  Owners: ${file.owners.map((o) => o.emailAddress).join(", ")}`)
        }
        if (file.sharingUser) {
          console.log(`  Shared by: ${file.sharingUser.emailAddress}`)
        }
      })
    }

    const files = response.data.files || []

    // Try to enrich with metadata if possible
    try {
      const enrichedFiles = []
      for (const file of files) {
        if (!file.id) continue

        try {
          // Try to get metadata directly from the Google Sheets API
          const metadata = await fetchSpreadsheetMetadata(file.id)
          if (metadata) {
            enrichedFiles.push({
              ...file,
              name: metadata.name || file.name,
              description: metadata.description || file.description,
              region: metadata.region,
              territory: metadata.territory,
              owner: metadata.owner,
              color: metadata.color,
            })
          } else {
            enrichedFiles.push(file)
          }
        } catch (error) {
          console.error(`Error fetching metadata for file ${file.id}:`, error)
          enrichedFiles.push(file)
        }
      }

      return enrichedFiles
    } catch (error) {
      console.error("Error enriching files with metadata:", error)
      // Fall back to original files array
      return files
    }
  } catch (error) {
    console.error("Error listing shared spreadsheets:", error)
    throw new Error(`Failed to list shared spreadsheets: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Get details about a specific spreadsheet
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

