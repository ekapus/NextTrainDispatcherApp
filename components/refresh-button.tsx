"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface RefreshButtonProps {
  onRefresh: () => Promise<void>
  label?: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function RefreshButton({
  onRefresh,
  label = "Refresh",
  className = "",
  variant = "outline",
  size = "default",
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
      toast({
        title: "Refreshed",
        description: "Data has been refreshed successfully.",
      })
    } catch (error) {
      console.error("Refresh error:", error)
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={className}
      aria-label={isRefreshing ? "Refreshing..." : label}
    >
      {isRefreshing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Refreshing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}

