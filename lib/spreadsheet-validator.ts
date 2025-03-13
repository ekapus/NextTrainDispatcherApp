import { getLoadedDoc } from "./google-sheets-loader"

// Required sheets and their headers
const REQUIRED_SHEETS = {
  Segments: ["id", "name", "startX", "startY", "endX", "endY", "length", "maxSpeed"],
  ControlPoints: ["id", "name", "x", "y", "type"],
  Clearances: [
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
    "trainSymbol",
  ],
}

export async function validateSpreadsheet(spreadsheetId: string): Promise<{ valid: boolean; message: string }> {
  try {
    const doc = await getLoadedDoc(spreadsheetId)

    // Check if all required sheets exist
    const missingSheets = []
    for (const sheetName of Object.keys(REQUIRED_SHEETS)) {
      if (!doc.sheetsByTitle[sheetName]) {
        missingSheets.push(sheetName)
      }
    }

    if (missingSheets.length > 0) {
      return {
        valid: false,
        message: `Missing required sheets: ${missingSheets.join(", ")}`,
      }
    }

    // Check if all sheets have the required headers
    const sheetsWithMissingHeaders = []
    for (const [sheetName, requiredHeaders] of Object.entries(REQUIRED_SHEETS)) {
      const sheet = doc.sheetsByTitle[sheetName]
      const headerValues = sheet.headerValues || []

      const missingHeaders = requiredHeaders.filter((header) => !headerValues.includes(header))
      if (missingHeaders.length > 0) {
        sheetsWithMissingHeaders.push(`${sheetName} (missing: ${missingHeaders.join(", ")})`)
      }
    }

    if (sheetsWithMissingHeaders.length > 0) {
      return {
        valid: false,
        message: `Sheets with missing headers: ${sheetsWithMissingHeaders.join("; ")}`,
      }
    }

    return {
      valid: true,
      message: "Spreadsheet is valid and contains all required sheets and headers",
    }
  } catch (error) {
    console.error(`Error validating spreadsheet ${spreadsheetId}:`, error)
    return {
      valid: false,
      message: `Error validating spreadsheet: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function setupSpreadsheet(spreadsheetId: string): Promise<{ success: boolean; message: string }> {
  try {
    const doc = await getLoadedDoc(spreadsheetId)

    // Create missing sheets
    for (const [sheetName, headers] of Object.entries(REQUIRED_SHEETS)) {
      if (!doc.sheetsByTitle[sheetName]) {
        console.log(`Creating ${sheetName} sheet in spreadsheet ${spreadsheetId}...`)
        await doc.addSheet({ title: sheetName, headerValues: headers })
      }
    }

    return {
      success: true,
      message: "Spreadsheet setup completed successfully",
    }
  } catch (error) {
    console.error(`Error setting up spreadsheet ${spreadsheetId}:`, error)
    return {
      success: false,
      message: `Error setting up spreadsheet: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

