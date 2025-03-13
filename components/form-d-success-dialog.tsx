"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormDDisplay } from "@/components/form-d-display"
import { CheckCircle2 } from "lucide-react"
import type { Clearance } from "@/lib/types"
// Update the import to include useSpreadsheetInstance
import { useRailroadData } from "@/lib/use-railroad-data"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"

interface FormDSuccessDialogProps {
  clearance: Clearance | null
  open: boolean
  onClose: () => void
}

// Add the useSpreadsheetInstance hook inside the component
export function FormDSuccessDialog({ clearance, open, onClose }: FormDSuccessDialogProps) {
  // Get the getTrackName function from the useRailroadData hook
  const { getTrackName } = useRailroadData()
  const { selectedInstance } = useSpreadsheetInstance()

  // If clearance is null or undefined, don't render the dialog content
  if (!clearance) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  // Create a copy of the clearance with track names instead of IDs
  const clearanceWithTrackNames = {
    ...clearance,
    // Convert track IDs to track names
    trackDisplay: clearance.tracks.map((trackId) => getTrackName(trackId)).join(", "),
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Form D Issued Successfully
          </DialogTitle>
          <DialogDescription>
            Form D #{clearance.id} has been issued to {clearance.issuedTo}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <FormDDisplay formD={clearanceWithTrackNames} />
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

