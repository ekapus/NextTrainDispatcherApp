"use client"

import type React from "react"

import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { useEffect } from "react"

export function BackgroundColorProvider({ children }: { children: React.ReactNode }) {
  const { selectedInstance } = useSpreadsheetInstance()

  useEffect(() => {
    // Apply the background color to the app-holder div
    const appHolder = document.querySelector(".app-holder")
    if (appHolder && selectedInstance?.color) {
      appHolder.setAttribute("style", `background-color: ${selectedInstance.color}`)
    } else if (appHolder) {
      // Default color if no instance color is available
      appHolder.setAttribute("style", "background-color: #38543d")
    }
  }, [selectedInstance])

  return <>{children}</>
}

