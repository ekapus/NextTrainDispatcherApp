"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { Loader2, AlertTriangle, Database, RefreshCw, Clock, Info, User, MapPin } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

export function InstanceSelector() {
  const router = useRouter()
  const { instances, selectInstance, loading, error, refreshInstances } = useSpreadsheetInstance()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const { toast } = useToast()
  const [apiHealth, setApiHealth] = useState<{ status: string; timestamp: string } | null>(null)

  // Check API health on mount
  useEffect(() => {
    async function checkApiHealth() {
      try {
        const response = await fetch("/api/health")
        if (response.ok) {
          const data = await response.json()
          setApiHealth(data)
        }
      } catch (error) {
        console.error("Error checking API health:", error)
      }
    }

    checkApiHealth()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshInstances()
      toast({
        title: "Refreshed",
        description: "Railroad division list has been refreshed.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading railroad divisions...</span>
        </div>

        {/* Show API health status even during loading */}
        {apiHealth && (
          <div className="p-4 border rounded bg-muted">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              API Status
            </h3>
            <div className="text-xs">
              <p>Status: {apiHealth.status}</p>
              <p>Last checked: {new Date(apiHealth.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <br />
            <small className="mt-1 block">
              Please check your environment variables or enable the Google Drive API.
            </small>
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </>
            )}
          </Button>
        </div>

        {/* Show API health status */}
        {apiHealth && (
          <div className="p-4 border rounded bg-muted">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              API Status
            </h3>
            <div className="text-xs">
              <p>Status: {apiHealth.status}</p>
              <p>Last checked: {new Date(apiHealth.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (instances.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No railroad divisions available. Please check your environment variables or enable the Google Drive API.
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh List
              </>
            )}
          </Button>
        </div>

        {/* Show API health status */}
        {apiHealth && (
          <div className="p-4 border rounded bg-muted">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              API Status
            </h3>
            <div className="text-xs">
              <p>Status: {apiHealth.status}</p>
              <p>Last checked: {new Date(apiHealth.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleSelect = (instanceId: string) => {
    setSelectedId(instanceId)
  }

  const handleContinue = async () => {
    if (selectedId) {
      const instance = instances.find((i) => i.id === selectedId)
      if (instance) {
        setIsSelecting(true)

        try {
          // First, save the selection to localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("selectedSpreadsheetId", instance.id)
          }

          // Then call the selectInstance function
          selectInstance(instance)

          // Navigate to the main page
          router.push("/")

          // Force a full page reload to ensure all data is refreshed
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
        } catch (error) {
          console.error("Error selecting instance:", error)
          setIsSelecting(false)

          toast({
            variant: "destructive",
            title: "Selection Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred",
          })
        }
      }
    }
  }

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {instances.map((instance) => {
          const isSelected = selectedId === instance.id

          return (
            <Card
              key={instance.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
              } ${instance.color ? `hover:border-[${instance.color}]/50` : ""}`}
              onClick={() => handleSelect(instance.id)}
              style={instance.color ? { borderColor: isSelected ? instance.color : undefined } : undefined}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate">{instance.name}</CardTitle>
                  <Database className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  ID: {instance.id.substring(0, 8)}...
                </Badge>
              </CardHeader>
              <CardContent>
                {instance.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{instance.description}</p>
                )}
                <div className="flex flex-col gap-1">
                  {(instance.region || instance.territory) && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="mr-1 h-3 w-3" />
                      <span>{[instance.region, instance.territory].filter(Boolean).join(" - ")}</span>
                    </div>
                  )}
                  {instance.lastModified && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>Modified: {formatDate(instance.lastModified)}</span>
                    </div>
                  )}
                  {instance.owner && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="mr-1 h-3 w-3" />
                      <span>Owner: {instance.owner}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={!selectedId || isSelecting} size="lg">
          {isSelecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Continue to Dispatcher Console"
          )}
        </Button>
      </div>

      {/* Show API health status */}
      {apiHealth && (
        <div className="mt-8 p-4 border rounded bg-muted">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Info className="h-4 w-4 mr-1" />
            API Status
          </h3>
          <div className="text-xs">
            <p>Status: {apiHealth.status}</p>
            <p>Last checked: {new Date(apiHealth.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}

