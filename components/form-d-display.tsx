import type { Clearance } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Clock } from "lucide-react"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"

interface FormDDisplayProps {
  formD: Clearance
}

export function FormDDisplay({ formD }: FormDDisplayProps) {
  const { selectedInstance } = useSpreadsheetInstance()

  // Guard clause to prevent errors if formD is undefined
  if (!formD) {
    return null
  }

  // Format the date for display
  const formattedDate = new Date(formD.effectiveDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <Card className="border-2 border-black print:border print:shadow-none">
      <CardHeader className="bg-gray-100 border-b pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">FORM D #{formD.id}</CardTitle>
          </div>
          {selectedInstance?.region && selectedInstance?.territory && (
            <div className="text-sm font-medium">
              {selectedInstance.region} - {selectedInstance.territory}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-sm">
        <div className="space-y-3">
          <div>
            <span className="font-semibold">Line/Subdivision: </span>
            <span>{formD.lineSubdivision}</span>
          </div>

          <div>
            <span className="font-semibold">Form D #: </span>
            <span>{formD.id}</span>
          </div>

          <div>
            <span className="font-semibold">Issued To: </span>
            <span>{formD.issuedTo}</span>
          </div>

          <div>
            <span className="font-semibold">Issued Date: </span>
            <span>{formattedDate}</span>
          </div>

          <div>
            <span className="font-semibold">From Location: </span>
            <span>{formD.fromLocation}</span>
          </div>

          <div>
            <span className="font-semibold">To Location: </span>
            <span>{formD.toLocation}</span>
          </div>

          <div>
            <span className="font-semibold">Track(s): </span>
            <span>{formD.trackDisplay || formD.tracks.join(", ")}</span>
          </div>

          <div>
            <span className="font-semibold">Effective Time: </span>
            <span>
              {formD.effectiveTimeFrom} to {formD.effectiveTimeTo || "Completion"}
            </span>
          </div>

          <div>
            <span className="font-semibold">Issued By: </span>
            <span>{formD.issuedBy}</span>
          </div>

          <div>
            <span className="font-semibold">Status: </span>
            <span className="capitalize">{formD.status}</span>
          </div>

          {formD.specialInstructions && (
            <div>
              <span className="font-semibold">Special Instructions: </span>
              <span className="whitespace-pre-line">{formD.specialInstructions}</span>
            </div>
          )}

          {formD.trainSymbol && (
            <div>
              <span className="font-semibold">Train Symbol: </span>
              <span>{formD.trainSymbol}</span>
            </div>
          )}

          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>Issued at {new Date(formD.issuedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

