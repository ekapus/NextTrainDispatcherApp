"use client"

import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { Badge } from "@/components/ui/badge"
import { Database, MapPin, User } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function InstanceDisplay() {
  const { selectedInstance } = useSpreadsheetInstance()

  if (!selectedInstance) {
    return null
  }

  // Get badge style based on instance color
  const getBadgeStyle = () => {
    if (!selectedInstance.color) return {}

    return {
      borderColor: selectedInstance.color,
      color: selectedInstance.color,
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="ml-2 flex items-center gap-1 cursor-help" style={getBadgeStyle()}>
            <Database className="h-3 w-3" />
            <span className="max-w-[150px] truncate">{selectedInstance.name}</span>
            {(selectedInstance.region || selectedInstance.territory) && <MapPin className="h-3 w-3 ml-1" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 p-1">
            <p className="font-semibold">{selectedInstance.name}</p>
            {selectedInstance.description && <p className="text-xs max-w-[250px]">{selectedInstance.description}</p>}
            {(selectedInstance.region || selectedInstance.territory) && (
              <p className="text-xs">
                {[selectedInstance.region, selectedInstance.territory].filter(Boolean).join(" - ")}
              </p>
            )}
            {selectedInstance.owner && (
              <p className="text-xs flex items-center">
                <User className="h-3 w-3 mr-1" />
                {selectedInstance.owner}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

