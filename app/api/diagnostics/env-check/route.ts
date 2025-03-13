import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL
        ? `Set (${process.env.GOOGLE_SHEETS_CLIENT_EMAIL.substring(0, 5)}...)`
        : "Not set",

      GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY
        ? `Set (${process.env.GOOGLE_SHEETS_PRIVATE_KEY.length} characters)`
        : "Not set",

      NODE_ENV: process.env.NODE_ENV || "Not set",
      VERCEL_ENV: process.env.VERCEL_ENV || "Not set",
    }

    // Check if private key is properly formatted
    let privateKeyStatus = "Not checked"
    if (process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY
      privateKeyStatus = {
        length: key.length,
        containsBeginMarker: key.includes("-----BEGIN PRIVATE KEY-----"),
        containsEndMarker: key.includes("-----END PRIVATE KEY-----"),
        containsNewlines: key.includes("\n"),
        containsEscapedNewlines: key.includes("\\n"),
      }
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: envVars,
      privateKeyStatus,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

