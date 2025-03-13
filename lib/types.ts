export interface RailroadSegment {
  id: string
  name: string
  startX: number
  startY: number
  endX: number
  endY: number
  length: number // in miles
  maxSpeed: number // in mph
  type?: "mainline" | "siding" | "yard" | "industrial"
  // First connection information
  connectsToSegmentId?: string // ID of the segment this one connects to
  connectionStartX?: number // Usually one of the segment endpoints
  connectionStartY?: number
  connectionEndX?: number // A point on the connected segment
  connectionEndY?: number
  // Second connection information
  connectsToSegmentId2?: string // ID of the second segment this one connects to
  connection2StartX?: number // Usually the other segment endpoint
  connection2StartY?: number
  connection2EndX?: number // A point on the second connected segment
  connection2EndY?: number
}

export interface ControlPoint {
  id: string
  name: string
  x: number
  y: number
  type: "station" | "signal" | "switch" | "staging"
}

export interface Clearance {
  id: string // Form D number
  formType?: "C" | "G" | "R" | "W" // Optional now
  lineSubdivision: string
  fromLocation: string
  toLocation: string
  tracks: string[] // array of track numbers/names
  effectiveDate: string // ISO date string
  effectiveTimeFrom: string
  effectiveTimeTo: string | null // null if "until completed"
  speedRestrictions?: {
    fromMilePost: number
    toMilePost: number
    speed: number
  }[]
  specialInstructions?: string
  status: "active" | "completed" | "annulled"
  issuedAt: string // ISO date string
  issuedBy: string // Dispatcher name/ID
  issuedTo: string // Train ID or Employee in charge
  trainSymbol?: string // Added train symbol field
  completedAt?: string // ISO date string
}

export interface SpreadsheetInstance {
  id: string
  name: string
  lastModified?: string
  description?: string
  region?: string
  territory?: string
  owner?: string
  color?: string
  // Add any other metadata fields that might be in the Metadata sheet
}

export interface SpreadsheetMetadata {
  name: string
  description: string
  region?: string
  territory?: string
  owner?: string
  color?: string
}

export interface ControlPointData {
  id: string
  name: string
  x: number
  y: number
  type: "station" | "signal" | "switch" | "staging"
}

export interface TrackSegmentData {
  id: string
  name: string
  startX: number
  startY: number
  endX: number
  endY: number
  length: number
  maxSpeed: number
  type?: "mainline" | "siding" | "yard" | "industrial"
  connectsToSegmentId?: string
  connectionStartX?: number
  connectionStartY?: number
  connectionEndX?: number
  connectionEndY?: number
  connectsToSegmentId2?: string
  connection2StartX?: number
  connection2StartY?: number
  connection2EndX?: number
  connection2EndY?: number
}

