"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRailroadData } from "@/lib/use-railroad-data"
import { TrackSegment } from "@/components/track-segment"
import { ControlPoint } from "@/components/control-point"
import { useTrackClearances } from "@/lib/use-track-clearances"
import type { Clearance, ControlPointData, TrackSegmentData } from "@/lib/types"
import { FormDModal } from "@/components/form-d-modal"

export function RailroadSchematic() {
  const { segments, controlPoints, loading, error } = useRailroadData()
  const { clearances } = useTrackClearances()
  const [svgHeight, setSvgHeight] = useState(400)
  const [svgWidth, setSvgWidth] = useState(1200)
  const [selectedSegment, setSelectedSegment] = useState<TrackSegmentData | null>(null)
  const [selectedClearances, setSelectedClearances] = useState<Clearance[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"view" | "add">("view")

  // Calculate the required height and width based on control points and segments
  useEffect(() => {
    if (controlPoints.length > 0 || segments.length > 0) {
      // Find the maximum coordinates among all control points and segments
      let maxY = 0
      let maxX = 0

      // Check control points
      controlPoints.forEach((cp) => {
        const y = Number.parseInt(cp.y)
        const x = Number.parseInt(cp.x)

        if (!isNaN(y) && y > maxY) {
          maxY = y
        }

        if (!isNaN(x) && x > maxX) {
          maxX = x
        }
      })

      // Check segments (both start and end points)
      segments.forEach((segment) => {
        const startY = Number.parseInt(segment.startY)
        const endY = Number.parseInt(segment.endY)
        const startX = Number.parseInt(segment.startX)
        const endX = Number.parseInt(segment.endX)

        if (!isNaN(startY) && startY > maxY) {
          maxY = startY
        }

        if (!isNaN(endY) && endY > maxY) {
          maxY = endY
        }

        if (!isNaN(startX) && startX > maxX) {
          maxX = startX
        }

        if (!isNaN(endX) && endX > maxX) {
          maxX = endX
        }
      })

      // Add padding to the maximum coordinates
      const calculatedHeight = maxY + 50
      const calculatedWidth = maxX + 100

      // Set minimum and maximum dimensions
      const newHeight = Math.max(300, Math.min(calculatedHeight, 600))
      const newWidth = Math.max(800, Math.min(calculatedWidth, 3000))

      setSvgHeight(newHeight)
      setSvgWidth(newWidth)
    }
  }, [controlPoints, segments])

  // Handle segment selection
  const handleSegmentClick = (segment: TrackSegmentData) => {
    setSelectedSegment(segment)

    // Find clearances for this segment
    const segmentClearances = clearances.filter(
      (clearance) => clearance.status !== "annulled" && clearance.segments.some((s) => s.id === segment.id),
    )

    setSelectedClearances(segmentClearances)

    if (segmentClearances.length > 0) {
      setModalMode("view")
      setIsModalOpen(true)
    } else {
      setModalMode("add")
      setIsModalOpen(true)
    }
  }

  // Close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSegment(null)
    setSelectedClearances([])
  }

  // Check if there are any active clearances
  const hasActiveClearances = useMemo(() => {
    return clearances.some((c) => c.status === "active")
  }, [clearances])

  // Memoize the rendered segments and control points, even when empty
  const renderedSegments = useMemo(() => {
    return segments.map((segment) => <TrackSegment key={segment.id} segment={segment} />)
  }, [segments]) // clearances is handled in the TrackSegment component

  const renderedControlPoints = useMemo(() => {
    return controlPoints.map((cp) => <ControlPoint key={cp.id} controlPoint={cp} />)
  }, [controlPoints])

  // Add debug logging
  useEffect(() => {
    console.log("RailroadSchematic render:", {
      segments: segments.length,
      controlPoints: controlPoints.length,
      loading,
      error,
      svgHeight,
      svgWidth,
    })
  }, [segments, controlPoints, loading, error, svgHeight, svgWidth])

  // Add this useEffect after the existing useEffect blocks
  useEffect(() => {
    // This effect runs when clearances change
    // We don't need to do anything here, but having this dependency
    // helps React optimize the rendering
  }, [clearances])

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading railroad schematic...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <br />
          <small className="block mt-1">Check the console for more details.</small>
        </AlertDescription>
      </Alert>
    )
  }

  if (!segments.length || !controlPoints.length) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No railroad data available. Make sure your Google Sheet contains valid data.
          <br />
          <small className="block mt-1">
            Expected sheets: "Segments" and "ControlPoints" with proper column headers.
          </small>
        </AlertDescription>
      </Alert>
    )
  }

  // Calculate the number of horizontal and vertical grid lines
  const horizontalGridLines = Math.ceil(svgHeight / 50)
  const verticalGridLines = Math.ceil(svgWidth / 50)

  return (
    <div className="relative">
      <div className="relative w-full overflow-auto bg-black border border-gray-700 rounded-md">
        <svg width={svgWidth} height={svgHeight} className="min-w-full">
          {/* Grid lines for reference */}
          <g className="grid-lines">
            {Array.from({ length: horizontalGridLines }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={i * 50}
                x2={svgWidth}
                y2={i * 50}
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            ))}
            {Array.from({ length: verticalGridLines }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 50}
                y1="0"
                x2={i * 50}
                y2={svgHeight}
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            ))}
          </g>

          {/* Debug overlay */}
          {process.env.NODE_ENV === "development" && (
            <text x="10" y="20" className="fill-gray-300 text-xs">
              Segments: {segments.length}, Control Points: {controlPoints.length}, Size: {svgWidth}x{svgHeight}px
            </text>
          )}

          {/* Render track segments */}
          {renderedSegments}

          {/* Render control points */}
          {renderedControlPoints}
        </svg>
      </div>

      {/* Form D Modal */}
      <FormDModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        segment={selectedSegment}
        clearances={selectedClearances}
        allSegments={segments}
        controlPoints={controlPoints as ControlPointData[]}
      />
    </div>
  )
}

