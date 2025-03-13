"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, CheckCircle, Database, FileText, RefreshCw, Info } from "lucide-react"

export function SimpleDiagnostics() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null)

  const runDiagnostics = async () => {
    try {
      setLoading(true)
      setError(null)
      setErrorDetails(null)
      setDiagnosticResults(null)

      const response = await fetch(`/api/diagnostics/train-symbols-simple`)

      const data = await response.json()

      if (!response.ok) {
        setError(`Failed to run diagnostics: ${response.status}`)
        setErrorDetails(data)
        return
      }

      setDiagnosticResults(data)
    } catch (err) {
      console.error("Failed to run diagnostics:", err)
      setError(`Failed to run diagnostics: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // Run diagnostics when the component mounts
  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Simple Diagnostics</h2>
        <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Running diagnostics...</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          {errorDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Error Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Environment Check</CardTitle>
              <CardDescription>Check if your environment variables are properly set</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">Make sure the following environment variables are set:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>GOOGLE_SHEETS_CLIENT_EMAIL</li>
                  <li>GOOGLE_SHEETS_PRIVATE_KEY</li>
                  <li>GOOGLE_SHEETS_SPREADSHEET_ID (or _ID_2, _ID_3, etc.)</li>
                </ul>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Tip</AlertTitle>
                  <AlertDescription>
                    The GOOGLE_SHEETS_PRIVATE_KEY should be properly formatted. If you're having issues, try using the
                    formatPrivateKey utility function to check the format.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : diagnosticResults ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spreadsheet Overview</CardTitle>
              <CardDescription>
                Found {diagnosticResults.spreadsheetCount} spreadsheets ({diagnosticResults.sharedSpreadsheetCount || 0}{" "}
                shared via Google Drive)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnosticResults.results.map((result: any, index: number) => (
                  <div key={index} className="rounded-md border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{result.title || "Unknown Spreadsheet"}</h3>
                      <div className="flex gap-2">
                        {result.source && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">{result.source}</Badge>
                        )}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {result.id.substring(0, 8)}...
                        </Badge>
                      </div>
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
                                {result.trainSymbolsData.sampleData.map((item: any, idx: number) => (
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
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Environment: {diagnosticResults.environment?.NODE_ENV || "unknown"} /
                {diagnosticResults.environment?.VERCEL_ENV || "unknown"} • Last updated:{" "}
                {new Date(diagnosticResults.timestamp).toLocaleString()}
              </div>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Run diagnostics to check train symbols configuration</p>
        </div>
      )}
    </div>
  )
}

