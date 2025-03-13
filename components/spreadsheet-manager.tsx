"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSpreadsheetInstance } from "@/lib/use-spreadsheet-instance"
import { Settings } from "lucide-react"

export function SpreadsheetManager() {
  const { instances, selectedInstance } = useSpreadsheetInstance()
  const [open, setOpen] = useState(false)
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("")
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("")
  const [newSpreadsheetDescription, setNewSpreadsheetDescription] = useState("")

  const handleAddSpreadsheet = async () => {
    // In a real application, this would send a request to the server to add the spreadsheet
    // For now, we'll just close the dialog
    setOpen(false)

    // Reset form
    setNewSpreadsheetId("")
    setNewSpreadsheetName("")
    setNewSpreadsheetDescription("")

    // Reload the page to refresh the spreadsheet list
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Manage Spreadsheets</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Railroad Divisions</DialogTitle>
          <DialogDescription>
            Add a new railroad division by providing a Google Spreadsheet ID and details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="spreadsheet-id" className="col-span-4">
              Google Spreadsheet ID
            </Label>
            <Input
              id="spreadsheet-id"
              value={newSpreadsheetId}
              onChange={(e) => setNewSpreadsheetId(e.target.value)}
              placeholder="Enter spreadsheet ID"
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="col-span-4">
              Division Name
            </Label>
            <Input
              id="name"
              value={newSpreadsheetName}
              onChange={(e) => setNewSpreadsheetName(e.target.value)}
              placeholder="Enter division name"
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="col-span-4">
              Description
            </Label>
            <Input
              id="description"
              value={newSpreadsheetDescription}
              onChange={(e) => setNewSpreadsheetDescription(e.target.value)}
              placeholder="Enter division description"
              className="col-span-4"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAddSpreadsheet} disabled={!newSpreadsheetId || !newSpreadsheetName}>
            Add Division
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

