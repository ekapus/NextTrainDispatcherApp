"use client"

import { useState, memo } from "react"
import { cn } from "@/lib/utils"

interface ControlPointProps {
  controlPoint: {
    id: string
    name: string
    x: number
    y: number
    type: "station" | "signal" | "switch" | "staging" | "staging-tall"
  }
}

// Use React.memo to prevent unnecessary re-renders
export const ControlPoint = memo(function ControlPoint({ controlPoint }: ControlPointProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Determine shape and size based on control point type
  const renderShape = () => {
    switch (controlPoint.type) {
      case "staging":
        return (
          <rect
            x={controlPoint.x - 10}
            y={controlPoint.y - 10}
            width={20}
            height={20}
            className={cn("fill-gray-300 stroke-gray-400 stroke-2", isHovered && "fill-gray-200")}
            rx={0} // Remove rounded corners
          />
        )
      case "staging-tall":
        return (
          <rect
            x={controlPoint.x - 25}
            y={controlPoint.y - 75}
            width={50}
            height={150}
            className={cn("fill-gray-300 stroke-gray-400 stroke-2", isHovered && "fill-gray-200")}
            rx={0} // Remove rounded corners
          />
        )
      case "station":
        return (
          <rect
            x={controlPoint.x - 2.5}
            y={controlPoint.y - 10}
            width={5}
            height={20}
            className={cn("fill-gray-300 stroke-gray-400 stroke-2", isHovered && "fill-gray-200")}
            rx={0}
          />
        )
      case "signal":
        return (
          <circle
            cx={controlPoint.x}
            cy={controlPoint.y}
            r={10}
            className={cn("fill-gray-300 stroke-gray-400 stroke-2", isHovered && "fill-gray-200")}
          />
        )
      case "switch":
        return (
          <polygon
            points={`${controlPoint.x},${controlPoint.y - 15} ${controlPoint.x + 15},${controlPoint.y + 15} ${controlPoint.x - 15},${controlPoint.y + 15}`}
            className={cn("fill-gray-300 stroke-gray-400 stroke-2", isHovered && "fill-gray-200")}
          />
        )
      default:
        return (
          <circle
            cx={controlPoint.x}
            cy={controlPoint.y}
            r={8}
            className={cn("fill-gray-300 stroke-gray-400 stroke-2", isHovered && "fill-gray-200")}
          />
        )
    }
  }

  return (
    <g
      className="control-point cursor-pointer transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderShape()}

      <text
        x={controlPoint.x}
        y={controlPoint.y + 75}
        textAnchor="middle"
        className="fill-gray-200 text-xs font-medium"
      >
        {controlPoint.name}
      </text>
    </g>
  )
})

