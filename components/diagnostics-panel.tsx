"use client"

import { useState, useEffect } from "react"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, CheckCircle, Database, FileText, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DiagnosticsPanel() {
  const { selectedInstance } = useSpreadsheetInstance()
  const [activeTab, setActiveTab] = useState("train-symbols")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null)
  const [fixLoading, setFixLoading] = useState(false)
  const [fixError, setFixError] = useState<string | null>(null)
  const [fixSuccess, setFixSuccess] = useState<any>(null)

  // For alternative sheet selection
  const [selectedAlternativeSheet, setSelectedAlternativeSheet] = useState<string>("")
  const [selectedSymbolColumn, setSelectedSymbolColumn] = useState<string>("")
  const [selectedDescColumn, setSelectedDescColumn] = useState<string>("")

  // Run diagnostics when the component mounts or when the selected instance changes
  useEffect(() => {
    if (selectedInstance?.id) {
      runDiagnostics()
    }
  }, [selectedInstance])

  const runDiagnostics = async () => {
    if (!selectedInstance?.id) {
      setError("No spreadsheet selected")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setDiagnosticResults(null)

      const response = await fetch(`/api/diagnostics/train-symbols/${selectedInstance.id}`)

      if (!response.ok) {
        throw new Error(`Failed to run diagnostics: ${response.status}`)
      }

      const data = await response.json()
      setDiagnosticResults(data)
    } catch (err) {
      console.error("Failed to run diagnostics:", err)
      setError(`Failed to run diagnostics: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const fixTrainSymbols = async (useAlternative = false) => {
    if (!selectedInstance?.id) {
      setFixError("No spreadsheet selected")
      return
    }

    try {
      setFixLoading(true)
      setFixError(null)
      setFixSuccess(null)

      const payload = {
        useAlternativeSheet: useAlternative,
        alternativeSheetName: selectedAlternativeSheet,
        symbolColumn: selectedSymbolColumn,
        descriptionColumn: selectedDescColumn,
      }

      const response = await fetch(`/api/diagnostics/train-symbols/${selectedInstance.id}/fix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to fix train symbols: ${response.status}`)
      }

      const data = await response.json()
      setFixSuccess(data)

      // Re-run diagnostics after fixing
      await runDiagnostics()
    } catch (err) {
      console.error("Failed to fix train symbols:", err)
      setFixError(`Failed to fix train symbols: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setFixLoading(false)
    }
  }

  if (!selectedInstance) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No spreadsheet selected</AlertTitle>
        <AlertDescription>
          Please select a spreadsheet from the main console before running diagnostics.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Diagnostics Tools</h2>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Spreadsheet Information</CardTitle>
              <CardDescription>Details about the currently selected spreadsheet</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {selectedInstance.id.substring(0, 8)}...
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Name:</span> {selectedInstance.name}
            </div>
            {selectedInstance.description && (
              <div>
                <span className="font-medium">Description:</span> {selectedInstance.description}
              </div>
            )}
            {diagnosticResults && (
              <div>
                <span className="font-medium">Available Sheets:</span> {diagnosticResults.allSheets.join(", ")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="train-symbols">Train Symbols</TabsTrigger>
          {/* Add more tabs here for other diagnostics */}
        </TabsList>

        <TabsContent value="train-symbols" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Train Symbols Diagnostics</CardTitle>
              <CardDescription>Check if the TrainSymbols sheet is properly configured</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Running diagnostics...</span>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : diagnosticResults ? (
                <div className="space-y-6">
                  {/* TrainSymbols Sheet Status */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">TrainSymbols Sheet Status</h3>

                    {diagnosticResults.trainSymbolsSheet ? (
                      <div className="space-y-2">
                        <Alert variant="default" className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertTitle>TrainSymbols Sheet Found</AlertTitle>
                          <AlertDescription>
                            The TrainSymbols sheet exists with {diagnosticResults.trainSymbolsSheet.rowCount} rows.
                          </AlertDescription>
                        </Alert>

                        {diagnosticResults.trainSymbolsSheet.missingRequiredHeaders && (
                          <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <AlertTitle>Missing Required Headers</AlertTitle>
                            <AlertDescription>
                              The TrainSymbols sheet is missing the required "symbol" header.
                            </AlertDescription>
                          </Alert>
                        )}

                        {diagnosticResults.trainSymbolsSheet.rowCount === 0 && (
                          <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <AlertTitle>No Train Symbols</AlertTitle>
                            <AlertDescription>The TrainSymbols sheet exists but has no data.</AlertDescription>
                          </Alert>
                        )}

                        <div className="rounded-md border p-4">
                          <h4 className="text-sm font-medium mb-2">Headers</h4>
                          <div className="flex flex-wrap gap-2">
                            {diagnosticResults.trainSymbolsSheet.headers.map((header: string) => (
                              <Badge key={header} variant="outline">
                                {header}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {diagnosticResults.trainSymbolsSheet.sampleData.length > 0 && (
                          <div className="rounded-md border p-4">
                            <h4 className="text-sm font-medium mb-2">Sample Data</h4>
                            <div className="space-y-2">
                              {diagnosticResults.trainSymbolsSheet.sampleData.map((item: any, index: number) => (
                                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                                  <strong>Symbol:</strong> {item.symbol || "N/A"},<strong> Description:</strong>{" "}
                                  {item.description || "N/A"}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>TrainSymbols Sheet Not Found</AlertTitle>
                        <AlertDescription>The spreadsheet does not have a TrainSymbols sheet.</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Alternative Sheets */}
                  {diagnosticResults.alternativeSheets.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Alternative Sheets</h3>
                      <p className="text-sm text-muted-foreground">
                        These sheets might contain train symbol data that can be used.
                      </p>

                      <div className="space-y-4">
                        {diagnosticResults.alternativeSheets.map((sheet: any, index: number) => (
                          <div key={index} className="rounded-md border p-4">
                            <h4 className="font-medium">{sheet.name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {sheet.rowCount} rows, {sheet.headers.length} columns
                            </p>

                            {sheet.potentialSymbolColumn && (
                              <div className="text-sm mb-2">
                                <span className="font-medium">Potential Symbol Column:</span>{" "}
                                {sheet.potentialSymbolColumn}
                              </div>
                            )}

                            {sheet.potentialDescColumn && (
                              <div className="text-sm mb-2">
                                <span className="font-medium">Potential Description Column:</span>{" "}
                                {sheet.potentialDescColumn}
                              </div>
                            )}

                            {sheet.sampleData.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-sm font-medium mb-1">Sample Data:</h5>
                                <div className="text-xs p-2 bg-gray-50 rounded overflow-x-auto">
                                  <pre>{JSON.stringify(sheet.sampleData[0], null, 2)}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Run diagnostics to check train symbols configuration</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              {diagnosticResults && (
                <>
                  {!diagnosticResults.trainSymbolsSheet ||
                  diagnosticResults.trainSymbolsSheet.missingRequiredHeaders ||
                  diagnosticResults.trainSymbolsSheet.rowCount === 0 ? (
                    <div className="w-full space-y-4">
                      <div className="flex justify-between">
                        <h3 className="text-lg font-medium">Fix Options</h3>
                      </div>

                      {/* Fix with sample data */}
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2">Create/Fix with Sample Data</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          This will create a TrainSymbols sheet with the correct headers and sample train symbols.
                        </p>
                        <Button onClick={() => fixTrainSymbols(false)} disabled={fixLoading} className="w-full">
                          {fixLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Fixing...
                            </>
                          ) : (
                            "Create/Fix with Sample Data"
                          )}
                        </Button>
                      </div>

                      {/* Fix by copying from alternative sheet */}
                      {diagnosticResults.alternativeSheets.length > 0 && (
                        <div className="rounded-md border p-4">
                          <h4 className="font-medium mb-2">Copy from Alternative Sheet</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            This will create a TrainSymbols sheet and copy data from an alternative sheet.
                          </p>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Select Sheet</label>
                              <Select value={selectedAlternativeSheet} onValueChange={setSelectedAlternativeSheet}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a sheet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {diagnosticResults.alternativeSheets.map((sheet: any) => (
                                    <SelectItem key={sheet.name} value={sheet.name}>
                                      {sheet.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedAlternativeSheet && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Symbol Column</label>
                                  <Select value={selectedSymbolColumn} onValueChange={setSelectedSymbolColumn}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select symbol column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {diagnosticResults.alternativeSheets
                                        .find((s: any) => s.name === selectedAlternativeSheet)
                                        ?.headers.map((header: string) => (
                                          <SelectItem key={header} value={header}>
                                            {header}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Description Column (Optional)</label>
                                  <Select value={selectedDescColumn} onValueChange={setSelectedDescColumn}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select description column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {diagnosticResults.alternativeSheets
                                        .find((s: any) => s.name === selectedAlternativeSheet)
                                        ?.headers.map((header: string) => (
                                          <SelectItem key={header} value={header}>
                                            {header}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}

                            <Button
                              onClick={() => fixTrainSymbols(true)}
                              disabled={fixLoading || !selectedAlternativeSheet || !selectedSymbolColumn}
                              className="w-full"
                            >
                              {fixLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Copying...
                                </>
                              ) : (
                                "Copy from Selected Sheet"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {fixError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{fixError}</AlertDescription>
                        </Alert>
                      )}

                      {fixSuccess && (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertTitle>Success</AlertTitle>
                          <AlertDescription>
                            {fixSuccess.message}
                            {fixSuccess.details.rowCount > 0 && (
                              <span className="block mt-1">Added {fixSuccess.details.rowCount} train symbols.</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert variant="default" className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>Train Symbols Sheet is Properly Configured</AlertTitle>
                      <AlertDescription>
                        The TrainSymbols sheet exists with the correct headers and contains{" "}
                        {diagnosticResults.trainSymbolsSheet.rowCount} train symbols.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

