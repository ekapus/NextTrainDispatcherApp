import type { RailroadSegment, ControlPoint } from "@/lib/types"

interface Graph {
  [key: string]: {
    [key: string]: {
      segment: RailroadSegment
      controlPoint: ControlPoint
    }
  }
}

// Build an adjacency graph from segments and control points
function buildGraph(segments: RailroadSegment[], controlPoints: ControlPoint[]): Graph {
  const graph: Graph = {}

  // Define the tolerance for considering points as connected (50 units)
  const DISTANCE_TOLERANCE = 51

  // Initialize empty adjacency lists for each control point
  controlPoints.forEach((cp) => {
    graph[cp.id] = {}
  })

  // For each segment, find the control points at its endpoints
  segments.forEach((segment) => {
    // Find control points near the start of the segment
    const startPoints = controlPoints.filter(
      (cp) => Math.sqrt(Math.pow(cp.x - segment.startX, 2) + Math.pow(cp.y - segment.startY, 2)) <= DISTANCE_TOLERANCE,
    )

    // Find control points near the end of the segment
    const endPoints = controlPoints.filter(
      (cp) => Math.sqrt(Math.pow(cp.x - segment.endX, 2) + Math.pow(cp.y - segment.endY, 2)) <= DISTANCE_TOLERANCE,
    )

    // Connect all start points to all end points
    startPoints.forEach((startPoint) => {
      endPoints.forEach((endPoint) => {
        // Don't connect a point to itself
        if (startPoint.id !== endPoint.id) {
          // Add bidirectional connections
          if (!graph[startPoint.id][endPoint.id]) {
            graph[startPoint.id][endPoint.id] = { segment, controlPoint: endPoint }
          }
          if (!graph[endPoint.id][startPoint.id]) {
            graph[endPoint.id][startPoint.id] = { segment, controlPoint: startPoint }
          }
        }
      })
    })
  })

  return graph
}

// Find all segments between two control points using BFS
export function findTracksBetween(
  fromLocationId: string,
  toLocationId: string,
  segments: RailroadSegment[],
  controlPoints: ControlPoint[],
): RailroadSegment[] {
  const graph = buildGraph(segments, controlPoints)

  // If either location isn't in the graph, return empty array
  if (!graph[fromLocationId] || !graph[toLocationId]) {
    return []
  }

  // BFS queue and visited set
  const queue: { point: string; path: RailroadSegment[] }[] = [{ point: fromLocationId, path: [] }]
  const visited = new Set<string>()
  const paths: RailroadSegment[][] = []

  while (queue.length > 0) {
    const { point, path } = queue.shift()!

    // If we've reached the destination, save this path
    if (point === toLocationId) {
      paths.push(path)
      continue
    }

    // Mark current point as visited
    visited.add(point)

    // Check all adjacent points
    for (const [nextPoint, { segment }] of Object.entries(graph[point])) {
      if (!visited.has(nextPoint)) {
        queue.push({
          point: nextPoint,
          path: [...path, segment],
        })
      }
    }
  }

  // Return the segments from the shortest path
  if (paths.length === 0) return []
  return paths.reduce((shortest, current) => (current.length < shortest.length ? current : shortest))
}

// Get control point by name
export function findControlPointByName(name: string, controlPoints: ControlPoint[]): ControlPoint | undefined {
  return controlPoints.find((cp) => cp.name === name)
}

// Get all segments that make up a path
export function getSegmentsForPath(
  fromName: string,
  toName: string,
  segments: RailroadSegment[],
  controlPoints: ControlPoint[],
): string[] {
  const fromPoint = findControlPointByName(fromName, controlPoints)
  const toPoint = findControlPointByName(toName, controlPoints)

  if (!fromPoint || !toPoint) return []

  const pathSegments = findTracksBetween(fromPoint.id, toPoint.id, segments, controlPoints)
  return pathSegments.map((segment) => segment.id)
}

// Find parallel tracks for a given path
export function findParallelTracks(pathSegmentIds: string[], allSegments: RailroadSegment[]): RailroadSegment[] {
  // Create a map of all segments for quick lookup
  const segmentsMap = new Map<string, RailroadSegment>()
  allSegments.forEach((segment) => {
    segmentsMap.set(segment.id, segment)
  })

  // Get the actual segment objects for the path
  const pathSegments = pathSegmentIds.map((id) => segmentsMap.get(id)).filter(Boolean) as RailroadSegment[]

  // Find all segments that are parallel to any segment in the path
  const parallelSegments: RailroadSegment[] = []
  const addedSegmentIds = new Set<string>()

  // First, add all segments that are directly connected to path segments
  pathSegments.forEach((segment) => {
    // Check segments that connect to this segment
    allSegments.forEach((potentialParallel) => {
      // Skip if it's already in the path or already added as parallel
      if (pathSegmentIds.includes(potentialParallel.id) || addedSegmentIds.has(potentialParallel.id)) {
        return
      }

      // Check if this segment connects to the path segment
      if (
        potentialParallel.connectsToSegmentId === segment.id ||
        potentialParallel.connectsToSegmentId2 === segment.id
      ) {
        parallelSegments.push(potentialParallel)
        addedSegmentIds.add(potentialParallel.id)
      }
    })

    // Check if this segment connects to other segments
    if (
      segment.connectsToSegmentId &&
      !pathSegmentIds.includes(segment.connectsToSegmentId) &&
      !addedSegmentIds.has(segment.connectsToSegmentId)
    ) {
      const connectedSegment = segmentsMap.get(segment.connectsToSegmentId)
      if (connectedSegment) {
        parallelSegments.push(connectedSegment)
        addedSegmentIds.add(connectedSegment.id)
      }
    }

    if (
      segment.connectsToSegmentId2 &&
      !pathSegmentIds.includes(segment.connectsToSegmentId2) &&
      !addedSegmentIds.has(segment.connectsToSegmentId2)
    ) {
      const connectedSegment = segmentsMap.get(segment.connectsToSegmentId2)
      if (connectedSegment) {
        parallelSegments.push(connectedSegment)
        addedSegmentIds.add(connectedSegment.id)
      }
    }
  })

  return parallelSegments
}

// Get all tracks between two locations, including parallel tracks
export function getAllTracksForPath(
  fromName: string,
  toName: string,
  segments: RailroadSegment[],
  controlPoints: ControlPoint[],
): { mainTracks: string[]; parallelTracks: string[] } {
  const fromPoint = findControlPointByName(fromName, controlPoints)
  const toPoint = findControlPointByName(toName, controlPoints)

  if (!fromPoint || !toPoint) return { mainTracks: [], parallelTracks: [] }

  // Get the main path segments
  const pathSegments = findTracksBetween(fromPoint.id, toPoint.id, segments, controlPoints)
  const mainTrackIds = pathSegments.map((segment) => segment.id)

  // Find parallel tracks
  const parallelSegments = findParallelTracks(mainTrackIds, segments)
  const parallelTrackIds = parallelSegments.map((segment) => segment.id)

  return {
    mainTracks: mainTrackIds,
    parallelTracks: parallelTrackIds,
  }
}

