"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: AutocompleteOption[]
  onSelect: (value: string) => void
}

export function Autocomplete({ suggestions, onSelect, className, ...props }: AutocompleteProps) {
  const [inputValue, setInputValue] = React.useState((props.value as string) || "")
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<AutocompleteOption[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Log suggestions when they change
  React.useEffect(() => {
    console.log("Autocomplete received suggestions:", suggestions.length)
  }, [suggestions])

  // Update input value when props.value changes
  React.useEffect(() => {
    if (props.value !== undefined) {
      setInputValue(props.value as string)
    }
  }, [props.value])

  // Filter suggestions based on input value
  React.useEffect(() => {
    if (inputValue.trim() === "") {
      setFilteredSuggestions([])
      return
    }

    const filtered = suggestions.filter(
      (suggestion) =>
        suggestion.value.toLowerCase().includes(inputValue.toLowerCase()) ||
        suggestion.label.toLowerCase().includes(inputValue.toLowerCase()),
    )

    console.log(`Filtered ${suggestions.length} suggestions to ${filtered.length} for input: "${inputValue}"`)
    setFilteredSuggestions(filtered)
    setActiveSuggestionIndex(0)
  }, [inputValue, suggestions])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    console.log("Input changed to:", value)
    setInputValue(value)
    setShowSuggestions(true)

    // Call the original onChange handler if provided
    if (props.onChange) {
      props.onChange(e)
    }
  }

  const handleSelect = (suggestion: AutocompleteOption) => {
    console.log("Selected suggestion:", suggestion)
    setInputValue(suggestion.value)
    setShowSuggestions(false)
    onSelect(suggestion.value)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle keyboard navigation
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter" && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault()
      handleSelect(filteredSuggestions[activeSuggestionIndex])
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  // Force show suggestions on focus
  const handleFocus = () => {
    console.log("Input focused, showing suggestions")
    if (suggestions.length > 0) {
      setShowSuggestions(true)
      // Show all suggestions when input is empty
      if (inputValue.trim() === "") {
        setFilteredSuggestions(suggestions)
      }
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={() => {
          // Delay hiding suggestions to allow for clicks
          setTimeout(() => setShowSuggestions(false), 200)
        }}
        className={cn("w-full", className)}
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion.value}
              className={cn(
                "relative cursor-default select-none py-2 pl-3 pr-9",
                index === activeSuggestionIndex
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-900 hover:bg-gray-100",
              )}
              onMouseDown={() => handleSelect(suggestion)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{suggestion.value}</span>
                {suggestion.label !== suggestion.value && (
                  <span className="text-xs text-gray-500">{suggestion.label}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

