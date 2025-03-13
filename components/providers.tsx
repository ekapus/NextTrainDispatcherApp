"use client"

import type React from "react"
import { TrackClearancesProvider } from "@/lib/use-track-clearances"
import { RailroadDataProvider } from "@/lib/use-railroad-data"
import { SpreadsheetProvider } from "@/lib/use-spreadsheet-instance"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SpreadsheetProvider>
      <RailroadDataProvider>
        <TrackClearancesProvider>{children}</TrackClearancesProvider>
      </RailroadDataProvider>
    </SpreadsheetProvider>
  )
}

