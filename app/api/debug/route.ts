import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test importing and using the fetchSpreadsheetMetadata function
    let fetchMetadataTest = "Not tested"
    try {
      const { fetchSpreadsheetMetadata } = await import("@/lib/google-sheets-client")
      fetchMetadataTest = typeof fetchSpreadsheetMetadata === "function" ? "Function exists" : "Not a function"
    } catch (error) {
      fetchMetadataTest = `Import error: ${error instanceof Error ? error.message : String(error)}`
    }

    // Test importing and using the getSpreadsheetDetails function
    let getDetailsTest = "Not tested"
    try {
      const { getSpreadsheetDetails } = await import("@/lib/google-api")
      getDetailsTest = typeof getSpreadsheetDetails === "function" ? "Function exists" : "Not a function"
    } catch (error) {
      getDetailsTest = `Import error: ${error instanceof Error ? error.message : String(error)}`
    }

    // Test importing and using the formatPrivateKey function
    let formatKeyTest = "Not tested"
    try {
      const { formatPrivateKey } = await import("@/lib/google-utils")
      formatKeyTest = typeof formatPrivateKey === "function" ? "Function exists" : "Not a function"
    } catch (error) {
      formatKeyTest = `Import error: ${error instanceof Error ? error.message : String(error)}`
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      functionTests: {
        fetchSpreadsheetMetadata: fetchMetadataTest,
        getSpreadsheetDetails: getDetailsTest,
        formatPrivateKey: formatKeyTest,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

