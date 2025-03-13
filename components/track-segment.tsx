"use client"

import { useState, memo, useMemo, useEffect } from "react"
import type { RailroadSegment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useTrackClearances } from "@/lib/use-track-clearances"
import { FormDModal } from "@/components/form-d-modal"

interface TrackSegmentProps {
  segment: RailroadSegment
}

// Use React.memo to prevent unnecessary re-renders
export const TrackSegment = memo(function TrackSegment({ segment }: TrackSegmentProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { clearances, annulClearance, completeClearance } = useTrackClearances()
  const [isExpiredClearance, setIsExpiredClearance] = useState(false)
  const [isFutureClearance, setIsFutureClearance] = useState(false)

  // Memoize the active clearance check to prevent recalculation on every render
  const activeClearance = useMemo(() => {
    return clearances.find((c) => c.tracks.includes(segment.id) && c.status === "active")
  }, [clearances, segment.id])

  // Check if the clearance is expired - client-side implementation
  useEffect(() => {
    // Only check if there's an active clearance
    if (!activeClearance) {
      setIsExpiredClearance(false)
      setIsFutureClearance(false)
      return
    }

    const now = new Date()

    // Check if the clearance is expired
    if (activeClearance.effectiveTimeTo) {
      const expirationDateStr = `${activeClearance.effectiveDate}T${activeClearance.effectiveTimeTo}`
      const expirationDate = new Date(expirationDateStr)
      setIsExpiredClearance(now > expirationDate)
    } else {
      setIsExpiredClearance(false)
    }

    // Check if the clearance is in the future (not yet in effect)
    const startDateStr = `${activeClearance.effectiveDate}T${activeClearance.effectiveTimeFrom}`
    const startDate = new Date(startDateStr)
    setIsFutureClearance(now < startDate)
  }, [activeClearance])

  // Determine segment color based on clearance status
  const segmentColor = activeClearance
    ? isExpiredClearance
      ? "stroke-yellow-500" // Yellow for expired clearances
      : isFutureClearance
        ? "stroke-fuchsia-400" // Magenta for future clearances
        : "stroke-green-500" // Regular green for active clearances
    : "stroke-gray-300" // Gray for no clearance

  // Use the type field to determine if it's a mainline (fallback to name check if type is not available)
  const isMainline =
    segment.type === "mainline" ||
    (!segment.type && (segment.name.toLowerCase().includes("main") || segment.name.toLowerCase().includes("ml")))

  const baseWidth = isMainline ? 6 : 3
  const strokeWidth = isHovered ? baseWidth + 2 : baseWidth

  // Calculate midpoint for train symbol and text
  const midX = Math.floor((segment.startX + segment.endX) / 2)
  const midY = Math.floor((segment.startY + segment.endY) / 2)

  // Check if this segment has connections
  const hasConnection1 =
    segment.connectsToSegmentId &&
    segment.connectionStartX !== undefined &&
    segment.connectionStartY !== undefined &&
    segment.connectionEndX !== undefined &&
    segment.connectionEndY !== undefined

  const hasConnection2 =
    segment.connectsToSegmentId2 &&
    segment.connection2StartX !== undefined &&
    segment.connection2StartY !== undefined &&
    segment.connection2EndX !== undefined &&
    segment.connection2EndY !== undefined

  const handleClick = () => {
    if (activeClearance) {
      setIsModalOpen(true)
    }
  }

  const handleAnnulClearance = async (clearanceId: string) => {
    await annulClearance(clearanceId)
    setIsModalOpen(false)
  }

  const handleCompleteClearance = async (clearanceId: string) => {
    await completeClearance(clearanceId)
    setIsModalOpen(false)
  }

  return (
    <>
      <g
        className={cn(
          "track-segment transition-all duration-200",
          activeClearance ? "cursor-pointer" : "cursor-default",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {/* Main segment line */}
        <path
          d={`M${segment.startX},${segment.startY} L${segment.endX},${segment.endY}`}
          className={cn("transition-all duration-300", segmentColor)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* First connection line if it exists */}
        {hasConnection1 && (
          <path
            d={`M${segment.connectionStartX},${segment.connectionStartY} L${segment.connectionEndX},${segment.connectionEndY}`}
            className={cn("transition-all duration-300", segmentColor)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Second connection line if it exists */}
        {hasConnection2 && (
          <path
            d={`M${segment.connection2StartX},${segment.connection2StartY} L${segment.connection2EndX},${segment.connection2EndY}`}
            className={cn("transition-all duration-300", segmentColor)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Segment label */}
        <text x={midX} y={midY - 10} textAnchor="middle" className="fill-gray-200 text-xs font-medium">
          {segment.name}
        </text>

        {/* Show Form D info if active */}
        {activeClearance && (
          <>
            {/* First line: Form D ID and issuedTo */}
            <text
              x={midX}
              y={midY + 15}
              textAnchor="middle"
              className={cn(
                "text-xs font-medium",
                isExpiredClearance ? "fill-yellow-300" : isFutureClearance ? "fill-fuchsia-300" : "fill-green-500",
              )}
            >
              {activeClearance.issuedTo}-#{activeClearance.id}
            </text>

            {/* Second line: Status (only if future or expired) */}
            {(isExpiredClearance || isFutureClearance) && (
              <text
                x={midX}
                y={midY + 30}
                textAnchor="middle"
                className={cn("text-xs font-medium", isExpiredClearance ? "fill-yellow-300" : "fill-fuchsia-300")}
              >
                {isExpiredClearance ? "EXPIRED" : "FUTURE"}
              </text>
            )}
          </>
        )}

        {/* Add a transparent clickable area to make it easier to click */}
        {activeClearance && (
          <path
            d={`M${segment.startX},${segment.startY} L${segment.endX},${segment.endY}`}
            className="stroke-transparent"
            strokeWidth={20}
            strokeLinecap="round"
            style={{ cursor: "pointer" }}
          />
        )}
      </g>

      {/* Form D Modal */}
      {activeClearance && (
        <FormDModal
          clearance={activeClearance}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAnnul={handleAnnulClearance}
          onComplete={handleCompleteClearance}
          isExpired={isExpiredClearance}
          isFuture={isFutureClearance}
        />
      )}
    </>
  )
})

