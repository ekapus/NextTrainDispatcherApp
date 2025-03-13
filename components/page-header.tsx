"use client"

import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { InstanceDisplay } from "@/components/instance-display"
import { RefreshButton } from "@/components/refresh-button"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PageHeader() {
  const { selectedInstance } = useSpreadsheetInstance()

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">
          {selectedInstance?.name || "Railroad Dispatcher Console"}
          <InstanceDisplay />
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <RefreshButton />
        <Button variant="outline" size="sm" asChild>
          <a href="/select-instance">Change Division</a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="/diagnostics" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            Diagnostics
          </a>
        </Button>
      </div>
    </header>
  )
}

