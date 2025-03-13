import { NextResponse } from "next/server"
import type { SpreadsheetInstance } from "@/lib/types"
import { getSpreadsheetDetails } from "@/lib/google-api"
import { listSharedSpreadsheets } from "@/lib/google-drive-client"
import { fetchSpreadsheetMetadata } from "@/lib/google-sheets-client"

export async function GET() {
  try {
    // First try to dynamically list spreadsheets using the Drive API
    try {
      console.log("Attempting to list shared spreadsheets via Drive API")
      const files = await listSharedSpreadsheets()

      console.log(`Drive API returned ${files.length} spreadsheets`)

      if (files.length === 0) {
        console.warn("Drive API returned 0 spreadsheets. This may indicate a permissions issue.")
      }

      // Map to our SpreadsheetInstance type with minimal information
      const spreadsheets = files
        .map((file) => {
          if (!file.id) {
            console.log("Skipping file with no ID")
            return null
          }

          // Create a simple instance with just the ID and name
          const instance: SpreadsheetInstance = {
            id: file.id,
            name: file.name || `Spreadsheet ${file.id}`,
            lastModified: file.modifiedTime || "",
          }

          console.log(`Processed spreadsheet: ${instance.name} (${instance.id})`)
          return instance
        })
        .filter(Boolean) as SpreadsheetInstance[]

      console.log(`Successfully processed ${spreadsheets.length} spreadsheets`)

      // Filter out any spreadsheets with empty IDs
      const validSpreadsheets = spreadsheets.filter((sheet) => sheet.id !== "")

      if (validSpreadsheets.length > 0) {
        console.log(`Returning ${validSpreadsheets.length} valid spreadsheets from Drive API`)
        return NextResponse.json(validSpreadsheets)
      } else {
        console.log("No valid spreadsheets found from Drive API, falling back to env vars")
      }
    } catch (error) {
      console.error("Error listing shared spreadsheets:", error)
      console.log("Falling back to environment variable spreadsheets")
      // Continue to fallback if Drive API fails
    }

    // Fallback to environment variable spreadsheets
    const envSpreadsheets = await getSpreadsheetInstances()
    console.log(`Found ${envSpreadsheets.length} spreadsheets from environment variables`)

    if (envSpreadsheets.length === 0) {
      console.log("No spreadsheets found from environment variables")
      return NextResponse.json(
        { error: "No spreadsheets found. Please check your environment variables." },
        { status: 404 },
      )
    }

    return NextResponse.json(envSpreadsheets)
  } catch (error) {
    console.error("Error fetching spreadsheets:", error)
    return NextResponse.json({ error: "Failed to fetch spreadsheets" }, { status: 500 })
  }
}

// Update the getSpreadsheetInstances function to load metadata from spreadsheets
const getSpreadsheetInstances = async (): Promise<SpreadsheetInstance[]> => {
  const instances: SpreadsheetInstance[] = []
  const spreadsheetIds = [
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID_2,
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID_3,
  ].filter(Boolean) as string[]

  console.log("Checking spreadsheet IDs from env:", spreadsheetIds)

  // Process each spreadsheet ID
  for (const id of spreadsheetIds) {
    try {
      console.log(`Attempting to fetch details for spreadsheet: ${id}`)

      // Use the direct Google Sheets API approach instead of internal API calls
      try {
        const metadata = await fetchSpreadsheetMetadata(id)
        if (metadata) {
          console.log(`Loaded metadata for spreadsheet ${id}:`, metadata)

          instances.push({
            id,
            name: metadata.name || `Railroad Division ${id.substring(0, 8)}`,
            description: metadata.description || "",
            region: metadata.region || "",
            territory: metadata.territory || "",
            owner: metadata.owner || "",
            color: metadata.color || "",
          })

          console.log(`Added spreadsheet instance with metadata: ${metadata.name || id} (${id})`)
          continue // Skip the fallback if metadata was successfully loaded
        } else {
          console.log(`No metadata found for spreadsheet ${id}, falling back to Drive API`)
        }
      } catch (metadataError) {
        console.error(`Error fetching metadata for spreadsheet ${id}:`, metadataError)
        // Continue to fallback methods
      }

      // If metadata fails, try to get basic details from the Drive API
      try {
        const details = await getSpreadsheetDetails(id).catch(() => ({
          name: `Railroad Division ${id.substring(0, 8)}`,
        }))

        instances.push({
          id,
          name: details.name || `Railroad Division ${id.substring(0, 8)}`,
        })
        console.log(`Added spreadsheet instance: ${details.name || id} (${id})`)
      } catch (error) {
        console.error(`Error fetching details for spreadsheet ${id}:`, error)
        // Add a basic entry even if there was an error
        instances.push({
          id,
          name: `Railroad Division ${id.substring(0, 8)}`,
        })
      }
    } catch (error) {
      console.error(`Error processing spreadsheet ${id}:`, error)
      // Add a basic entry even if there was an error
      instances.push({
        id,
        name: `Railroad Division ${id.substring(0, 8)}`,
      })
    }
  }

  return instances
}

