// Simplified version of the toast component
"use client"

import { createContext, useContext } from "react"

type ToastProps = {
  title?: string
  description?: string
  duration?: number
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toast: (props: ToastProps) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
})

export function useToast() {
  const context = useContext(ToastContext)

  // Simple alert-based implementation for now
  return {
    toast: (props: ToastProps) => {
      alert(`${props.title || ""}\n${props.description || ""}`)
    },
  }
}

