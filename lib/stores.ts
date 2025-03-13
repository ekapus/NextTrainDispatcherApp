"use client"

import { useState, useEffect } from "react"

export function useSelectedInstance() {
  const [selectedInstance, setSelectedInstance] = useState(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedInstance = localStorage.getItem("selectedSpreadsheetId")
      if (storedInstance) {
        setSelectedInstance({ id: storedInstance })
      }
    }
  }, [])

  return selectedInstance
}

