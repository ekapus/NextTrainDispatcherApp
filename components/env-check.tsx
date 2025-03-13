"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertTriangle, CheckCircle, RefreshCw, Info } from "lucide-react"

export function EnvCheck() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [envData, setEnvData] = useState<any>(null)

  const checkEnv = async () => {
    try {
      setLoading(true)
      setError(null)
      setEnvData(null)

      const response = await fetch(`/api/diagnostics/env-check`)

      if (!response.ok) {
        throw new Error(`Failed to check environment: ${response.status}`)
      }

      const data = await response.json()
      setEnvData(data)
    } catch (err) {
      console.error("Failed to check environment:", err)
      setError(`Failed to check environment: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // Run check when the component mounts
  useEffect(() => {
    checkEnv()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Environment Variables Check</h2>
        <Button variant="outline" size="sm" onClick={checkEnv} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Environment
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Checking environment variables...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : envData ? (
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Status of required environment variables for the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(envData.environment).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                    <span className="font-medium">{key}</span>
                    <span className={value === "Not set" ? "text-red-500" : "text-green-500"}>{value}</span>
                  </div>
                ))}
              </div>

              {envData.privateKeyStatus && typeof envData.privateKeyStatus === "object" && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Private Key Analysis</h3>
                  <div className="space-y-2 p-4 border rounded-md">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Length: {envData.privateKeyStatus.length} characters</div>
                      <div>
                        Begin Marker:{" "}
                        {envData.privateKeyStatus.containsBeginMarker ? (
                          <CheckCircle className="inline h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="inline h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        End Marker:{" "}
                        {envData.privateKeyStatus.containsEndMarker ? (
                          <CheckCircle className="inline h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="inline h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        Contains Newlines:{" "}
                        {envData.privateKeyStatus.containsNewlines ? (
                          <CheckCircle className="inline h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="inline h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        Contains Escaped Newlines:{" "}
                        {envData.privateKeyStatus.containsEscapedNewlines ? (
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
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(envData.timestamp).toLocaleString()}
            </div>
          </CardFooter>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <Info className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Check environment variables to diagnose configuration issues</p>
        </div>
      )}
    </div>
  )
}

