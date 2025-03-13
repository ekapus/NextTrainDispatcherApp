"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Info, CheckCircle, Loader2 } from "lucide-react"

export function BasicDiagnostics() {
  const [sharedSpreadsheetsCount, setSharedSpreadsheetsCount] = useState<number | null>(null)
  const [sharedSpreadsheetsError, setSharedSpreadsheetsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSharedSpreadsheets() {
      try {
        setLoading(true)
        // Use the API endpoint instead of directly calling listSharedSpreadsheets
        const response = await fetch("/api/diagnostics/shared-spreadsheets")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `HTTP error ${response.status}`)
        }

        setSharedSpreadsheetsCount(data.count)
      } catch (error) {
        console.error("Error checking shared spreadsheets:", error)
        setSharedSpreadsheetsError(error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }

    checkSharedSpreadsheets()
  }, [])

  // Check environment variables
  const clientEmail = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = "HIDDEN" // We don't expose the private key to the client

  const hasRequiredVars = !!clientEmail

  const variables = {
    GOOGLE_SHEETS_CLIENT_EMAIL: clientEmail ? `Set (${clientEmail.substring(0, 5)}...)` : "Not set",
    GOOGLE_SHEETS_PRIVATE_KEY: privateKey ? "Set (hidden)" : "Not set",
    NODE_ENV: process.env.NODE_ENV || "Not set",
    VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV || "Not set",
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Basic Environment Diagnostics</h2>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Status of required environment variables for the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!hasRequiredVars && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Required Environment Variables</AlertTitle>
                <AlertDescription>
                  Some required environment variables are not set. Please check your configuration.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(variables).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">{key}</span>
                  <span className={value === "Not set" ? "text-red-500" : "text-green-500"}>{value}</span>
                </div>
              ))}
            </div>

            {/* Add shared spreadsheets status */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Google Drive Shared Spreadsheets</h3>
              {loading ? (
                <div className="p-3 border rounded-md bg-gray-50 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading shared spreadsheets...
                </div>
              ) : sharedSpreadsheetsError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Checking Shared Spreadsheets</AlertTitle>
                  <AlertDescription>{sharedSpreadsheetsError}</AlertDescription>
                </Alert>
              ) : (
                <Alert
                  variant={sharedSpreadsheetsCount && sharedSpreadsheetsCount > 0 ? "default" : "warning"}
                  className={
                    sharedSpreadsheetsCount && sharedSpreadsheetsCount > 0
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }
                >
                  {sharedSpreadsheetsCount && sharedSpreadsheetsCount > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <AlertTitle>
                    {sharedSpreadsheetsCount && sharedSpreadsheetsCount > 0
                      ? `Found ${sharedSpreadsheetsCount} Shared Spreadsheets`
                      : "No Shared Spreadsheets Found"}
                  </AlertTitle>
                  <AlertDescription>
                    {sharedSpreadsheetsCount && sharedSpreadsheetsCount > 0
                      ? "Your service account has access to spreadsheets shared with it."
                      : "No spreadsheets are shared with your service account. Make sure to share your Google Sheets with the service account email."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Troubleshooting Tips</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Make sure all required environment variables are set</li>
                  <li>The private key should include BEGIN and END markers</li>
                  <li>The private key should contain proper newlines (either \n or actual newlines)</li>
                  <li>
                    Share your Google Sheets with the service account email to access them through the Google Drive API
                  </li>
                  <li>Make sure your service account has the necessary permissions</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

