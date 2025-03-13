"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Clock, FileText, Loader2, Check, AlertTriangle } from "lucide-react"
import { useTrackClearances } from "@/lib/use-track-clearances"
import { useRailroadData } from "@/lib/use-railroad-data"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { useTrainSymbols } from "@/lib/use-train-symbols"
import { Autocomplete } from "@/components/ui/autocomplete"
import type { Clearance } from "@/lib/types"
import { getAllTracksForPath } from "@/lib/path-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ClearancePanel() {
  const { clearances, addClearance, annulClearance, completeClearance, checkConflicts } = useTrackClearances()
  const { getAllLocations, getTrackName, segments, controlPoints, loading: railroadLoading } = useRailroadData()
  const { selectedInstance } = useSpreadsheetInstance()
  const { symbols: trainSymbols, loading: symbolsLoading } = useTrainSymbols()

  // Convert train symbols to the format expected by the Autocomplete component
  const trainSymbolOptions = useMemo(() => {
    if (!trainSymbols || trainSymbols.length === 0) {
      return []
    }

    return trainSymbols.map((symbol) => ({
      value: symbol.symbol,
      label: symbol.description || symbol.symbol,
    }))
  }, [trainSymbols])

  const [lineSubdivision, setLineSubdivision] = useState("")
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0])
  const [effectiveTimeFrom, setEffectiveTimeFrom] = useState("")
  const [effectiveTimeTo, setEffectiveTimeTo] = useState("")
  const [isUntilCompleted, setIsUntilCompleted] = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [issuedTo, setIssuedTo] = useState("")
  const [issuedBy, setIssuedBy] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("dispatcherName") || "DS Smith"
    }
    return "DS Smith"
  })
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [issuedClearance, setIssuedClearance] = useState<Clearance | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Add this debug log at the beginning of the component
  useEffect(() => {
    console.log("ClearancePanel rendered, trainSymbols:", trainSymbols)
    console.log("Train symbol options:", trainSymbolOptions)
  }, [trainSymbols, trainSymbolOptions])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Save dispatcher name to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && issuedBy) {
      localStorage.setItem("dispatcherName", issuedBy)
    }
  }, [issuedBy])

  // Get all available locations
  const locations = getAllLocations()

  // Auto-populate line/subdivision from metadata
  useEffect(() => {
    if (selectedInstance) {
      // Use the region and territory if available, otherwise fall back to name
      if (selectedInstance.region && selectedInstance.territory) {
        setLineSubdivision(`${selectedInstance.region} - ${selectedInstance.territory}`)
      } else if (selectedInstance.region) {
        setLineSubdivision(selectedInstance.region)
      } else if (selectedInstance.territory) {
        setLineSubdivision(selectedInstance.territory)
      } else {
        // Use the name from the selected instance as the line/subdivision
        setLineSubdivision(selectedInstance.name)
      }
    }
  }, [selectedInstance])

  // Calculate available tracks (main and parallel) whenever endpoints change
  const availableTracks = useMemo(() => {
    if (!fromLocation || !toLocation) {
      return { mainTracks: [], parallelTracks: [] }
    }

    return getAllTracksForPath(fromLocation, toLocation, segments, controlPoints)
  }, [fromLocation, toLocation, segments, controlPoints])

  // Update selected tracks when available tracks change
  useEffect(() => {
    // When new tracks are found, automatically select all main tracks by default
    setSelectedTracks([...availableTracks.mainTracks])
  }, [availableTracks])

  // Debug logging for train symbols
  useEffect(() => {
    console.log("Train symbols loaded:", trainSymbols.length, "symbols")
    console.log("Train symbol options:", trainSymbolOptions.length, "options")
  }, [trainSymbols, trainSymbolOptions])

  if (railroadLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading railroad data...</span>
      </div>
    )
  }

  const handleAddClearance = async () => {
    try {
      setIsSubmitting(true)
      setConflictError(null)

      // Validate form
      if (availableTracks.mainTracks.length === 0) {
        setConflictError("Please select valid locations that are connected by tracks")
        return
      }
      if (selectedTracks.length === 0) {
        setConflictError("Please select at least one track")
        return
      }

      if (!lineSubdivision || !fromLocation || !toLocation) {
        setConflictError("Please enter line/subdivision and locations")
        return
      }

      if (!effectiveTimeFrom) {
        setConflictError("Please enter effective time")
        return
      }

      if (!isUntilCompleted && !effectiveTimeTo) {
        setConflictError("Please enter effective time to or select 'Until Completed'")
        return
      }

      if (!issuedTo) {
        setConflictError("Please enter who the Form D is issued to")
        return
      }

      if (!issuedBy) {
        setConflictError("Please enter the dispatcher name")
        return
      }

      // Check for conflicts
      const conflicts = await checkConflicts(
        selectedTracks,
        fromLocation,
        toLocation,
        effectiveDate,
        effectiveTimeFrom,
        isUntilCompleted ? null : effectiveTimeTo,
      )

      if (conflicts.length > 0) {
        const conflictMessages = conflicts
          .map((conflict) => `Form D #${conflict.id} (${conflict.issuedTo}): ${conflict.reason}`)
          .join(", ")
        setConflictError(`Conflict detected with: ${conflictMessages}`)
        return
      }

      // Add clearance
      const newClearance: Clearance = {
        id: `D${Math.floor(1000 + Math.random() * 9000)}`,
        lineSubdivision,
        fromLocation,
        toLocation,
        tracks: selectedTracks,
        effectiveDate,
        effectiveTimeFrom,
        effectiveTimeTo: isUntilCompleted ? null : effectiveTimeTo,
        specialInstructions: specialInstructions || undefined,
        status: "active",
        issuedAt: new Date().toISOString(),
        issuedBy, // Use the entered dispatcher name
        issuedTo,
      }

      await addClearance(newClearance)
      setIssuedClearance(newClearance)
      setSuccessDialogOpen(true)

      // Reset form
      setFromLocation("")
      setToLocation("")
      setSpecialInstructions("")
      setIssuedTo("")
      setConflictError(null)
    } catch (error) {
      console.error("Failed to add clearance:", error)
      setConflictError(`${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const allTracks = [...availableTracks.mainTracks, ...availableTracks.parallelTracks]

  // Group clearances by who they were issued to
  const groupClearancesByRecipient = (clearances: Clearance[]) => {
    const grouped: Record<string, Clearance[]> = {}

    clearances.forEach((clearance) => {
      const recipient = clearance.issuedTo
      if (!grouped[recipient]) {
        grouped[recipient] = []
      }
      grouped[recipient].push(clearance)
    })

    // Sort recipients alphabetically
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }

  // Add this function inside the ClearancePanel component
  // This should be placed before the return statement

  // Function to check if a clearance is expired - client-side implementation
  const isExpiredClearance = (clearance: Clearance): boolean => {
    // If the clearance is not active or doesn't have an end time, it's not expired
    if (clearance.status !== "active" || !clearance.effectiveTimeTo) {
      return false
    }

    const now = new Date()

    // Parse the expiration date and time in the user's local time zone
    const expirationDateStr = `${clearance.effectiveDate}T${clearance.effectiveTimeTo}`
    const expirationDate = new Date(expirationDateStr)

    // Check if the current time is past the expiration time
    return now > expirationDate
  }

  // Add a function to check if a clearance is in the future (not yet in effect)
  // Add this after the isExpiredClearance function

  // Function to check if a clearance is in the future (not yet in effect)
  const isFutureClearance = (clearance: Clearance): boolean => {
    // If the clearance is not active, it's not considered future
    if (clearance.status !== "active") {
      return false
    }

    const now = new Date()

    // Parse the start date and time in the user's local time zone
    const startDateStr = `${clearance.effectiveDate}T${clearance.effectiveTimeFrom}`
    const startDate = new Date(startDateStr)

    // Check if the current time is before the start time
    return now < startDate
  }

  // Update the filtering of active clearances to separate future clearances
  const activeClearances = clearances.filter((c) => c.status === "active")
  const expiredClearances = activeClearances.filter(isExpiredClearance)
  const futureClearances = activeClearances.filter(isFutureClearance)
  const currentActiveClearances = activeClearances.filter((c) => !isExpiredClearance(c) && !isFutureClearance(c))

  // Update the filtering of active and expired clearances
  // Replace the existing filtering code with this:
  // const activeClearances = clearances.filter((c) => c.status === "active")
  // const expiredClearances = activeClearances.filter(isExpiredClearance)
  // const validActiveClearances = activeClearances.filter((c) => !isExpiredClearance(c))

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Track Clearance Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form D Issue Form - 1/3 width */}
        <div className="md:col-span-1 border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Issue Form D</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="line-subdivision">Line/Subdivision</Label>
              <Input
                id="line-subdivision"
                value={lineSubdivision}
                onChange={(e) => setLineSubdivision(e.target.value)}
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued-to">Issued To</Label>
              {symbolsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading train symbols...</span>
                </div>
              ) : (
                <>
                  {trainSymbolOptions.length > 0 ? (
                    <>
                      <Autocomplete
                        id="issued-to"
                        placeholder="Train ID or Employee in Charge"
                        value={issuedTo}
                        suggestions={trainSymbolOptions}
                        onSelect={(value) => {
                          console.log("Selected value:", value)
                          setIssuedTo(value)
                        }}
                        onChange={(e) => {
                          console.log("Input changed:", e.target.value)
                          setIssuedTo(e.target.value)
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        id="issued-to"
                        placeholder="Train ID or Employee in Charge"
                        value={issuedTo}
                        onChange={(e) => setIssuedTo(e.target.value)}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        No train symbols available. Please add train symbols to the TrainSymbols sheet.
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-location">From Location</Label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger id="from-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-location">To Location</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger id="to-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Available Tracks</Label>
              <div className="rounded-md border p-3">
                {allTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {fromLocation && toLocation
                      ? "No valid track path found between selected locations"
                      : "Select locations to see available tracks"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-2">Select tracks to include in the clearance:</p>

                    {/* Main tracks section */}
                    {availableTracks.mainTracks.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Main Tracks:</h4>
                        {availableTracks.mainTracks.map((trackId) => (
                          <div key={trackId} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`track-${trackId}`}
                              checked={selectedTracks.includes(trackId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTracks((prev) => [...prev, trackId])
                                } else {
                                  setSelectedTracks((prev) => prev.filter((id) => id !== trackId))
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor={`track-${trackId}`} className="text-sm">
                              {getTrackName(trackId)}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Parallel tracks section */}
                    {availableTracks.parallelTracks.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Alternative Tracks:</h4>
                        {availableTracks.parallelTracks.map((trackId) => (
                          <div key={trackId} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`track-${trackId}`}
                              checked={selectedTracks.includes(trackId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTracks((prev) => [...prev, trackId])
                                } else {
                                  setSelectedTracks((prev) => prev.filter((id) => id !== trackId))
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor={`track-${trackId}`} className="text-sm">
                              {getTrackName(trackId)}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTracks([])}>
                        Clear All
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTracks(allTracks)}>
                        Select All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective-date">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective-time-from">Effective Time From</Label>
              <div className="relative">
                <Input
                  id="effective-time-from"
                  type="time"
                  value={effectiveTimeFrom}
                  onChange={(e) => setEffectiveTimeFrom(e.target.value)}
                  className="pr-16"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={() => {
                    const now = new Date()
                    const hours = String(now.getHours()).padStart(2, "0")
                    const minutes = String(now.getMinutes()).padStart(2, "0")
                    setEffectiveTimeFrom(`${hours}:${minutes}`)
                  }}
                >
                  NOW
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective-time-to" className="flex items-center justify-between">
                <span>Effective Time To</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="until-completed"
                    checked={isUntilCompleted}
                    onChange={(e) => setIsUntilCompleted(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="until-completed" className="text-xs">
                    Until Completed
                  </label>
                </div>
              </Label>
              <Input
                id="effective-time-to"
                type="time"
                value={effectiveTimeTo}
                onChange={(e) => setEffectiveTimeTo(e.target.value)}
                disabled={isUntilCompleted}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special-instructions">Special Instructions</Label>
              <Textarea
                id="special-instructions"
                placeholder="Enter any special instructions or restrictions..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issued-by">Dispatcher Name</Label>
              <Input
                id="issued-by"
                placeholder="Enter dispatcher name"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
              />
            </div>

            {conflictError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <p>{conflictError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleAddClearance} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Issue Form D"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Form D's List - 2/3 width */}
        <div className="md:col-span-2 border rounded-md p-4">
          <Tabs defaultValue="active">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Form D Management</h3>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="future">Future</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
                <TabsTrigger value="inactive">Completed/Annulled</TabsTrigger>
              </TabsList>
            </div>

            {/* Active Form D's */}
            <TabsContent value="active" className="mt-0">
              <ScrollArea className="h-[600px]">
                {currentActiveClearances.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                    No active Form D's
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupClearancesByRecipient(currentActiveClearances).map(([recipient, recipientClearances]) => (
                      <div key={recipient} className="space-y-3">
                        <h4 className="font-medium text-md border-b pb-1">
                          Issued to: {recipient}
                          <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {recipientClearances.length}
                          </Badge>
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {recipientClearances.map((clearance) => (
                            <div key={clearance.id} className="rounded-lg border p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">Form D #{clearance.id}</span>
                                </div>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="font-semibold">Line:</span> {clearance.lineSubdivision}
                                </p>
                                <p>
                                  <span className="font-semibold">Between:</span> {clearance.fromLocation} and{" "}
                                  {clearance.toLocation}
                                </p>
                                <p>
                                  <span className="font-semibold">Track(s):</span>{" "}
                                  {clearance.tracks.map(getTrackName).join(", ")}
                                </p>
                                <p>
                                  <span className="font-semibold">Effective:</span>{" "}
                                  {new Date(clearance.effectiveDate).toLocaleDateString()} from{" "}
                                  {clearance.effectiveTimeFrom}
                                  {clearance.effectiveTimeTo ? ` to ${clearance.effectiveTimeTo}` : " until completed"}
                                </p>
                                <p>
                                  <span className="font-semibold">Issued by:</span> {clearance.issuedBy}
                                </p>
                                {clearance.specialInstructions && (
                                  <p>
                                    <span className="font-semibold">Special Instructions:</span>{" "}
                                    {clearance.specialInstructions}
                                  </p>
                                )}
                              </div>

                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={async () => {
                                    try {
                                      await completeClearance(clearance.id)
                                    } catch (error) {
                                      console.error("Failed to complete clearance:", error)
                                      alert(
                                        `Failed to mark Form D as completed: ${error instanceof Error ? error.message : String(error)}`,
                                      )
                                    }
                                  }}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Mark Complete
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await annulClearance(clearance.id)
                                    } catch (error) {
                                      console.error("Failed to annul clearance:", error)
                                      alert(
                                        `Failed to annul Form D: ${error instanceof Error ? error.message : String(error)}`,
                                      )
                                    }
                                  }}
                                >
                                  Annul Form D
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Future Form D's */}
            <TabsContent value="future" className="mt-0">
              <ScrollArea className="h-[600px]">
                {futureClearances.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                    No future Form D's
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupClearancesByRecipient(futureClearances).map(([recipient, recipientClearances]) => (
                      <div key={recipient} className="space-y-3">
                        <h4 className="font-medium text-md border-b pb-1">
                          Issued to: {recipient}
                          <Badge className="ml-2 bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100">
                            {recipientClearances.length}
                          </Badge>
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {recipientClearances.map((clearance) => (
                            <div key={clearance.id} className="rounded-lg border border-fuchsia-200 p-4 bg-fuchsia-50">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-fuchsia-500" />
                                  <span className="font-medium">Form D #{clearance.id}</span>
                                </div>
                                <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Future
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="font-semibold">Line:</span> {clearance.lineSubdivision}
                                </p>
                                <p>
                                  <span className="font-semibold">Between:</span> {clearance.fromLocation} and{" "}
                                  {clearance.toLocation}
                                </p>
                                <p>
                                  <span className="font-semibold">Track(s):</span>{" "}
                                  {clearance.tracks.map(getTrackName).join(", ")}
                                </p>
                                <p>
                                  <span className="font-semibold">Effective:</span>{" "}
                                  {new Date(clearance.effectiveDate).toLocaleDateString()} from{" "}
                                  {clearance.effectiveTimeFrom}
                                  {clearance.effectiveTimeTo ? ` to ${clearance.effectiveTimeTo}` : " until completed"}
                                </p>
                                <p>
                                  <span className="font-semibold">Issued by:</span> {clearance.issuedBy}
                                </p>
                                <p className="text-fuchsia-700 font-medium">
                                  Becomes active at:{" "}
                                  {new Date(
                                    `${clearance.effectiveDate}T${clearance.effectiveTimeFrom}`,
                                  ).toLocaleString()}
                                </p>
                              </div>

                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await annulClearance(clearance.id)
                                    } catch (error) {
                                      console.error("Failed to annul clearance:", error)
                                      alert(
                                        `Failed to annul Form D: ${error instanceof Error ? error.message : String(error)}`,
                                      )
                                    }
                                  }}
                                >
                                  Annul Future Form D
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Expired Form D's */}
            <TabsContent value="expired" className="mt-0">
              <ScrollArea className="h-[600px]">
                {expiredClearances.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                    No expired Form D's
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupClearancesByRecipient(expiredClearances).map(([recipient, recipientClearances]) => (
                      <div key={recipient} className="space-y-3">
                        <h4 className="font-medium text-md border-b pb-1">
                          Issued to: {recipient}
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            {recipientClearances.length}
                          </Badge>
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {recipientClearances.map((clearance) => (
                            <div key={clearance.id} className="rounded-lg border border-yellow-200 p-4 bg-yellow-50">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-yellow-500" />
                                  <span className="font-medium">Form D #{clearance.id}</span>
                                </div>
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  Expired
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="font-semibold">Line:</span> {clearance.lineSubdivision}
                                </p>
                                <p>
                                  <span className="font-semibold">Between:</span> {clearance.fromLocation} and{" "}
                                  {clearance.toLocation}
                                </p>
                                <p>
                                  <span className="font-semibold">Track(s):</span>{" "}
                                  {clearance.tracks.map(getTrackName).join(", ")}
                                </p>
                                <p>
                                  <span className="font-semibold">Effective:</span>{" "}
                                  {new Date(clearance.effectiveDate).toLocaleDateString()} from{" "}
                                  {clearance.effectiveTimeFrom} to {clearance.effectiveTimeTo}
                                </p>
                                <p>
                                  <span className="font-semibold">Issued by:</span> {clearance.issuedBy}
                                </p>
                                <p className="text-yellow-700 font-medium">
                                  Expired at:{" "}
                                  {new Date(`${clearance.effectiveDate}T${clearance.effectiveTimeTo}`).toLocaleString()}
                                </p>
                              </div>

                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await annulClearance(clearance.id)
                                    } catch (error) {
                                      console.error("Failed to annul clearance:", error)
                                      alert(
                                        `Failed to annul Form D: ${error instanceof Error ? error.message : String(error)}`,
                                      )
                                    }
                                  }}
                                >
                                  Annul Expired Form D
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Inactive Form D's */}
            <TabsContent value="inactive" className="mt-0">
              <ScrollArea className="h-[600px]">
                {clearances.filter((c) => c.status !== "active").length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                    No completed or annulled Form D's
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupClearancesByRecipient(clearances.filter((c) => c.status !== "active")).map(
                      ([recipient, recipientClearances]) => (
                        <div key={recipient} className="space-y-3">
                          <h4 className="font-medium text-md border-b pb-1">
                            Issued to: {recipient}
                            <Badge className="ml-2 bg-gray-100 text-gray-800 hover:bg-gray-100">
                              {recipientClearances.length}
                            </Badge>
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {recipientClearances.map((clearance) => (
                              <div
                                key={clearance.id}
                                className={`rounded-lg border p-4 ${
                                  clearance.status === "completed"
                                    ? "border-green-200 bg-green-50"
                                    : "border-red-200 bg-red-50"
                                }`}
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText
                                      className={`h-4 w-4 ${
                                        clearance.status === "completed" ? "text-green-500" : "text-red-500"
                                      }`}
                                    />
                                    <span className="font-medium">Form D #{clearance.id}</span>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`bg-gray-50 ${
                                      clearance.status === "completed"
                                        ? "text-green-700 border-green-200"
                                        : "text-red-700 border-red-200"
                                    }`}
                                  >
                                    {clearance.status === "completed" ? (
                                      <>
                                        <Check className="mr-1 h-3 w-3" />
                                        Completed
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        Annulled
                                      </>
                                    )}
                                  </Badge>
                                </div>

                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="font-semibold">Line:</span> {clearance.lineSubdivision}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Between:</span> {clearance.fromLocation} and{" "}
                                    {clearance.toLocation}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Track(s):</span>{" "}
                                    {clearance.tracks.map(getTrackName).join(", ")}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Effective:</span>{" "}
                                    {new Date(clearance.effectiveDate).toLocaleDateString()} from{" "}
                                    {clearance.effectiveTimeFrom}
                                    {clearance.effectiveTimeTo
                                      ? ` to ${clearance.effectiveTimeTo}`
                                      : " until completed"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Issued by:</span> {clearance.issuedBy}
                                  </p>
                                  {clearance.specialInstructions && (
                                    <p>
                                      <span className="font-semibold">Special Instructions:</span>{" "}
                                      {clearance.specialInstructions}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

