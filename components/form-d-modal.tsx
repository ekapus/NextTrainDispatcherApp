"use client"

import { cn } from "@/lib/utils"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, FileText, Check, X, AlertTriangle, Clock } from "lucide-react"
import { useRailroadData } from "@/lib/use-railroad-data"
import type { Clearance } from "@/lib/types"

// Add a new prop for future clearances
interface FormDModalProps {
  clearance: Clearance | null
  isOpen: boolean
  onClose: () => void
  onAnnul: (clearanceId: string) => Promise<void>
  onComplete: (clearanceId: string) => Promise<void>
  isExpired?: boolean
  isFuture?: boolean
}

// Update the function parameters to include the new prop
export function FormDModal({
  clearance,
  isOpen,
  onClose,
  onAnnul,
  onComplete,
  isExpired = false,
  isFuture = false,
}: FormDModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getTrackName } = useRailroadData()

  if (!clearance) return null

  const handleAnnul = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      await onAnnul(clearance.id)
      onClose()
    } catch (err) {
      console.error("Failed to annul clearance:", err)
      setError(`Failed to annul Form D: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      await onComplete(clearance.id)
      onClose()
    } catch (err) {
      console.error("Failed to complete clearance:", err)
      setError(`Failed to mark Form D as completed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Format the date for display
  const formattedDate = new Date(clearance.effectiveDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // Format the expiration time for display
  const formattedExpirationTime = clearance.effectiveTimeTo
    ? new Date(`${clearance.effectiveDate}T${clearance.effectiveTimeTo}`).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Completion"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Form D #{clearance.id}
          </DialogTitle>
          <DialogDescription>
            Issued to {clearance.issuedTo} on {new Date(clearance.issuedAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isExpired && (
            <div className="rounded-md bg-yellow-100 p-3 text-sm text-yellow-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <p>This Form D has expired and should be annulled.</p>
              </div>
            </div>
          )}

          {isFuture && (
            <div className="rounded-md bg-fuchsia-100 p-3 text-sm text-fuchsia-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <p>
                  This Form D is not yet in effect. It will become active at{" "}
                  {new Date(`${clearance.effectiveDate}T${clearance.effectiveTimeFrom}`).toLocaleString()}.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium">Line/Subdivision: </span>
              <span className="text-sm">{clearance.lineSubdivision}</span>
            </div>

            <div>
              <span className="text-sm font-medium">Form D #: </span>
              <span className="text-sm">{clearance.id}</span>
            </div>

            <div>
              <span className="text-sm font-medium">Issued To: </span>
              <span className="text-sm">{clearance.issuedTo}</span>
            </div>

            <div>
              <span className="text-sm font-medium">Issued Date: </span>
              <span className="text-sm">{formattedDate}</span>
            </div>

            <div>
              <span className="text-sm font-medium">From Location: </span>
              <span className="text-sm">{clearance.fromLocation}</span>
            </div>

            <div>
              <span className="text-sm font-medium">To Location: </span>
              <span className="text-sm">{clearance.toLocation}</span>
            </div>

            <div>
              <span className="text-sm font-medium">Using Track(s): </span>
              <span className="text-sm">{clearance.tracks.map((trackId) => getTrackName(trackId)).join(", ")}</span>
            </div>

            <div>
              <span className="text-sm font-medium">In Effect: </span>
              <span className="text-sm">
                {formattedDate} {clearance.effectiveTimeFrom} to {formattedExpirationTime}
              </span>
            </div>

            <div>
              <span className="text-sm font-medium">Issued By: </span>
              <span className="text-sm">{clearance.issuedBy}</span>
            </div>

            <div>
              <span className="text-sm font-medium">Status: </span>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  isExpired
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : isFuture
                      ? "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200"
                      : "bg-green-50 text-green-700 border-green-200",
                )}
              >
                {isExpired ? "Expired" : isFuture ? "Future" : clearance.status}
              </Badge>
            </div>

            {clearance.specialInstructions && (
              <div>
                <span className="text-sm font-medium">Special Instructions: </span>
                <span className="text-sm whitespace-pre-line">{clearance.specialInstructions}</span>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="success"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleComplete}
              disabled={isProcessing}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark Complete
            </Button>
            <Button variant="destructive" onClick={handleAnnul} disabled={isProcessing}>
              <X className="mr-2 h-4 w-4" />
              {isExpired ? "Annul Expired Form D" : "Annul Form D"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

