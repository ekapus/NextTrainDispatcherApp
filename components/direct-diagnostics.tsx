import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, Database, Info } from "lucide-react"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { formatPrivateKey } from "@/lib/google-utils"
import { listSharedSpreadsheets } from "@/lib/google-drive-client"

// This is a server component that directly fetches data
export async function DirectDiagnostics() {
  // Check environment variables
  const envCheck = checkEnvironmentVariables()

  // Only try to check spreadsheets if environment variables are set
  let spreadsheetsCheck = null
  if (envCheck.hasRequiredVars) {
    spreadsheetsCheck = await checkSpreadsheets()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Diagnostics Results</h2>

      {/* Environment Variables Section */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Status of required environment variables for the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!envCheck.hasRequiredVars ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Required Environment Variables</AlertTitle>
                <AlertDescription>
                  Some required environment variables are not set. Please check your configuration.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Environment Variables Set</AlertTitle>
                <AlertDescription>All required environment variables are set.</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(envCheck.variables).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">{key}</span>
                  <span className={value === "Not set" ? "text-red-500" : "text-green-500"}>{value}</span>
                </div>
              ))}
            </div>

            {envCheck.privateKeyStatus && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Private Key Analysis</h3>
                <div className="space-y-2 p-4 border rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Length: {envCheck.privateKeyStatus.length} characters</div>
                    <div>
                      Begin Marker:{" "}
                      {envCheck.privateKeyStatus.containsBeginMarker ? (
                        <CheckCircle className="inline h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="inline h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      End Marker:{" "}
                      {envCheck.privateKeyStatus.containsEndMarker ? (
                        <CheckCircle className="inline h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="inline h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      Contains Newlines:{" "}
                      {envCheck.privateKeyStatus.containsNewlines ? (
                        <CheckCircle className="inline h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="inline h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      Contains Escaped Newlines:{" "}
                      {envCheck.privateKeyStatus.containsEscapedNewlines ? (
                        <CheckCircle className="inline h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="inline h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Private Key Format</AlertTitle>
                    <AlertDescription>
                      The private key should include the BEGIN and END markers and have proper newlines. If you're
                      having issues, try using the formatPrivateKey utility function to check the format.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheets Section */}
      {spreadsheetsCheck && (
        <Card>
          <CardHeader>
            <CardTitle>Spreadsheet Overview</CardTitle>
            <CardDescription>Found {spreadsheetsCheck.spreadsheetCount} shared spreadsheets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {spreadsheetsCheck.results.map((result, index) => (
                <div key={index} className="rounded-md border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{result.title || "Unknown Spreadsheet"}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {result.id.substring(0, 8)}...
                    </Badge>
                  </div>

                  {result.error ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Sheets:</span> {result.sheetNames.join(", ")}
                      </div>

                      {result.hasTrainSymbolsSheet ? (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertTitle>TrainSymbols Sheet Found</AlertTitle>
                          <AlertDescription>
                            The TrainSymbols sheet exists with {result.trainSymbolsData.rowCount} rows.
                            {!result.trainSymbolsData.hasSymbolHeader && (
                              <span className="block mt-1 text-yellow-600">Warning: Missing "symbol" header.</span>
                            )}
                            {result.trainSymbolsData.rowCount === 0 && (
                              <span className="block mt-1 text-yellow-600">Warning: Sheet has no data.</span>
                            )}
                            {result.trainSymbolsData.error && (
                              <span className="block mt-1 text-red-600">Error: {result.trainSymbolsData.error}</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>TrainSymbols Sheet Not Found</AlertTitle>
                          <AlertDescription>The spreadsheet does not have a TrainSymbols sheet.</AlertDescription>
                        </Alert>
                      )}

                      {result.trainSymbolsData &&
                        result.trainSymbolsData.sampleData &&
                        result.trainSymbolsData.sampleData.length > 0 && (
                          <div className="rounded-md border p-4 mt-2">
                            <h4 className="text-sm font-medium mb-2">Sample Data</h4>
                            <div className="space-y-2">
                              {result.trainSymbolsData.sampleData.map((item, idx) => (
                                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                  <strong>Symbol:</strong> {item.symbol || "N/A"},<strong> Description:</strong>{" "}
                                  {item.description || "N/A"}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Based on the diagnostics, here are some recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!envCheck.hasRequiredVars && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Set Required Environment Variables</AlertTitle>
                <AlertDescription>
                  Make sure to set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY.
                </AlertDescription>
              </Alert>
            )}

            {envCheck.privateKeyStatus && !envCheck.privateKeyStatus.containsBeginMarker && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Fix Private Key Format</AlertTitle>
                <AlertDescription>
                  Your private key is missing the BEGIN and END markers. Make sure it's properly formatted with
                  "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----".
                </AlertDescription>
              </Alert>
            )}

            {spreadsheetsCheck && spreadsheetsCheck.results.some((r) => r.error) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Fix Spreadsheet Access</AlertTitle>
                <AlertDescription>
                  Some spreadsheets couldn't be accessed. Make sure your service account has access to the spreadsheets.
                </AlertDescription>
              </Alert>
            )}

            {spreadsheetsCheck && spreadsheetsCheck.results.some((r) => !r.hasTrainSymbolsSheet) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Create TrainSymbols Sheet</AlertTitle>
                <AlertDescription>
                  Some spreadsheets are missing the TrainSymbols sheet. Run the setup script to create it:{" "}
                  <code>npm run fix-train-symbols</code>
                </AlertDescription>
              </Alert>
            )}

            {(!spreadsheetsCheck || spreadsheetsCheck.spreadsheetCount === 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Share Spreadsheets</AlertTitle>
                <AlertDescription>
                  No shared spreadsheets were found. Make sure to share your Google Sheets with the service account
                  email: {process.env.GOOGLE_SHEETS_CLIENT_EMAIL}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to check environment variables
function checkEnvironmentVariables() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY

  const hasRequiredVars = !!clientEmail && !!privateKey

  const variables = {
    GOOGLE_SHEETS_CLIENT_EMAIL: clientEmail ? `Set (${clientEmail.substring(0, 5)}...)` : "Not set",
    GOOGLE_SHEETS_PRIVATE_KEY: privateKey ? `Set (${privateKey.length} characters)` : "Not set",
    NODE_ENV: process.env.NODE_ENV || "Not set",
    VERCEL_ENV: process.env.VERCEL_ENV || "Not set",
  }

  // Check if private key is properly formatted
  let privateKeyStatus = null
  if (privateKey) {
    privateKeyStatus = {
      length: privateKey.length,
      containsBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      containsEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
      containsNewlines: privateKey.includes("\n"),
      containsEscapedNewlines: privateKey.includes("\\n"),
    }
  }

  return {
    hasRequiredVars,
    variables,
    privateKeyStatus,
  }
}

// Update the checkSpreadsheets function to only use shared spreadsheets
async function checkSpreadsheets() {
  try {
    console.log("Checking spreadsheets...")
    const results = []

    // Try to list shared spreadsheets
    const sharedSpreadsheets = await listSharedSpreadsheets()
    console.log(`Found ${sharedSpreadsheets.length} shared spreadsheets`)

    // Create auth object once
    const privateKey = formatPrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "")
    const auth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "",
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    for (const spreadsheet of sharedSpreadsheets) {
      if (!spreadsheet.id) continue

      try {
        console.log(`Checking spreadsheet: ${spreadsheet.id}`)

        // Create a new document instance with auth
        const doc = new GoogleSpreadsheet(spreadsheet.id, auth)

        // Load the document info
        await doc.loadInfo()

        const sheetNames = Object.keys(doc.sheetsByTitle)
        const hasTrainSymbolsSheet = sheetNames.includes("TrainSymbols")

        let trainSymbolsData = null
        if (hasTrainSymbolsSheet) {
          const sheet = doc.sheetsByTitle["TrainSymbols"]

          // Make sure to load the sheet headers explicitly before accessing them
          await sheet.loadHeaderRow()
          const headers = sheet.headerValues || []

          try {
            const rows = await sheet.getRows()

            trainSymbolsData = {
              rowCount: rows.length,
              headers,
              hasSymbolHeader: headers.includes("symbol"),
              sampleData: rows.slice(0, 3).map((row) => {
                try {
                  return {
                    symbol: row.get("symbol") || row.get("trainSymbol") || row.get("train") || row.get("name") || "N/A",
                    description: row.get("description") || row.get("desc") || "",
                  }
                } catch (rowError) {
                  console.error(`Error processing row:`, rowError)
                  return { symbol: "Error processing row", description: "" }
                }
              }),
            }
          } catch (rowsError) {
            console.error(`Error getting rows from sheet:`, rowsError)
            trainSymbolsData = {
              error: rowsError instanceof Error ? rowsError.message : String(rowsError),
              headers,
              hasSymbolHeader: headers.includes("symbol"),
              rowCount: 0,
              sampleData: [],
            }
          }
        }

        results.push({
          id: spreadsheet.id,
          title: doc.title,
          sheetNames,
          hasTrainSymbolsSheet,
          trainSymbolsData,
        })
      } catch (error) {
        console.error(`Error checking spreadsheet ${spreadsheet.id}:`, error)
        results.push({
          id: spreadsheet.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      spreadsheetCount: sharedSpreadsheets.length,
      results,
    }
  } catch (error) {
    console.error("Error checking spreadsheets:", error)
    throw error
  }
}

