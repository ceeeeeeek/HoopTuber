import type { BasketballFrame, YOLODetection } from "./yolo-detector"

export interface TrackedObject {
  id: string
  class: string
  history: Array<{
    timestamp: number
    bbox: { x: number; y: number; width: number; height: number }
    confidence: number
  }>
  velocity: { x: number; y: number }
  isActive: boolean
}

export interface ShotEvent {
  id: string
  timestamp: number
  confidence: number
  shotType: "layup" | "jump_shot" | "three_pointer" | "dunk"
  shooter: TrackedObject
  basketball: TrackedObject
  hoop: TrackedObject
  trajectory: Array<{ x: number; y: number; timestamp: number }>
  outcome: "made" | "missed" | "in_progress"
  clipStart: number
  clipEnd: number
  description: string
}

export class BasketballTracker {
  private trackedObjects: Map<string, TrackedObject> = new Map()
  private shotEvents: ShotEvent[] = []
  private frameHistory: BasketballFrame[] = []
  private nextObjectId = 1

  processFrame(frame: BasketballFrame): ShotEvent[] {
    // Store frame in history
    this.frameHistory.push(frame)

    // Keep only last 10 seconds of frames (assuming 30 FPS)
    if (this.frameHistory.length > 300) {
      this.frameHistory = this.frameHistory.slice(-300)
    }

    // Update tracked objects
    this.updateTracking(frame)

    // Detect shot events
    const newShots = this.detectShots(frame)

    // Update existing shots
    this.updateShotOutcomes(frame)

    return newShots
  }

  private updateTracking(frame: BasketballFrame) {
    const currentDetections = frame.detections
    const activeIds = new Set<string>()

    // Match detections to existing tracks
    for (const detection of currentDetections) {
      const matchedTrack = this.findBestMatch(detection, frame.timestamp)

      if (matchedTrack) {
        // Update existing track
        this.updateTrack(matchedTrack, detection, frame.timestamp)
        activeIds.add(matchedTrack.id)
      } else {
        // Create new track
        const newTrack = this.createNewTrack(detection, frame.timestamp)
        this.trackedObjects.set(newTrack.id, newTrack)
        activeIds.add(newTrack.id)
      }
    }

    // Mark inactive tracks
    for (const [id, track] of this.trackedObjects) {
      if (!activeIds.has(id)) {
        track.isActive = false
      }
    }
  }

  private findBestMatch(detection: YOLODetection, timestamp: number): TrackedObject | null {
    let bestMatch: TrackedObject | null = null
    let bestScore = 0

    for (const [id, track] of this.trackedObjects) {
      if (!track.isActive || track.class !== detection.class) continue

      const lastEntry = track.history[track.history.length - 1]
      if (timestamp - lastEntry.timestamp > 1.0) continue // Too old

      // Calculate IoU (Intersection over Union)
      const iou = this.calculateIoU(detection.bbox, lastEntry.bbox)

      if (iou > bestScore && iou > 0.3) {
        bestScore = iou
        bestMatch = track
      }
    }

    return bestMatch
  }

  private calculateIoU(box1: any, box2: any): number {
    const x1 = Math.max(box1.x, box2.x)
    const y1 = Math.max(box1.y, box2.y)
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width)
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height)

    if (x2 <= x1 || y2 <= y1) return 0

    const intersection = (x2 - x1) * (y2 - y1)
    const area1 = box1.width * box1.height
    const area2 = box2.width * box2.height
    const union = area1 + area2 - intersection

    return intersection / union
  }

  private createNewTrack(detection: YOLODetection, timestamp: number): TrackedObject {
    return {
      id: `${detection.class}_${this.nextObjectId++}`,
      class: detection.class,
      history: [
        {
          timestamp,
          bbox: detection.bbox,
          confidence: detection.confidence,
        },
      ],
      velocity: { x: 0, y: 0 },
      isActive: true,
    }
  }

  private updateTrack(track: TrackedObject, detection: YOLODetection, timestamp: number) {
    const lastEntry = track.history[track.history.length - 1]

    // Calculate velocity
    const dt = timestamp - lastEntry.timestamp
    if (dt > 0) {
      track.velocity = {
        x: (detection.center.x - (lastEntry.bbox.x + lastEntry.bbox.width / 2)) / dt,
        y: (detection.center.y - (lastEntry.bbox.y + lastEntry.bbox.height / 2)) / dt,
      }
    }

    // Add new entry
    track.history.push({
      timestamp,
      bbox: detection.bbox,
      confidence: detection.confidence,
    })

    // Keep only recent history
    if (track.history.length > 30) {
      track.history = track.history.slice(-30)
    }

    track.isActive = true
  }

  private detectShots(frame: BasketballFrame): ShotEvent[] {
    const newShots: ShotEvent[] = []

    // Find basketball and hoop tracks
    const basketballTrack = this.findTrackByClass("sports ball")
    const hoopTrack = this.findTrackByClass("basketball_hoop")
    const playerTracks = this.getTracksByClass("person")

    if (!basketballTrack || !hoopTrack || playerTracks.length === 0) {
      return newShots
    }

    // Analyze basketball trajectory for shot patterns
    const trajectory = this.getRecentTrajectory(basketballTrack, 2.0) // Last 2 seconds

    if (trajectory.length < 5) return newShots

    // Check for upward then downward motion (shot arc)
    const hasArc = this.detectShotArc(trajectory)

    if (hasArc) {
      // Find closest player (likely shooter)
      const shooter = this.findClosestPlayer(basketballTrack, playerTracks, frame.timestamp)

      if (shooter) {
        const shot: ShotEvent = {
          id: `shot_${Date.now()}`,
          timestamp: frame.timestamp,
          confidence: 0.8,
          shotType: this.determineShotType(shooter, hoopTrack, frame.timestamp),
          shooter,
          basketball: basketballTrack,
          hoop: hoopTrack,
          trajectory,
          outcome: "in_progress",
          clipStart: Math.max(0, frame.timestamp - 5),
          clipEnd: frame.timestamp + 3,
          description: this.generateShotDescription(shooter, frame.timestamp),
        }

        this.shotEvents.push(shot)
        newShots.push(shot)

        console.log(`🏀 Shot detected at ${frame.timestamp}s - ${shot.shotType}`)
      }
    }

    return newShots
  }

  private findTrackByClass(className: string): TrackedObject | undefined {
    for (const [id, track] of this.trackedObjects) {
      if (track.class === className && track.isActive) {
        return track
      }
    }
    return undefined
  }

  private getTracksByClass(className: string): TrackedObject[] {
    const tracks: TrackedObject[] = []
    for (const [id, track] of this.trackedObjects) {
      if (track.class === className && track.isActive) {
        tracks.push(track)
      }
    }
    return tracks
  }

  private getRecentTrajectory(
    track: TrackedObject,
    seconds: number,
  ): Array<{ x: number; y: number; timestamp: number }> {
    const cutoff = track.history[track.history.length - 1]?.timestamp - seconds

    return track.history
      .filter((entry) => entry.timestamp > cutoff)
      .map((entry) => ({
        x: entry.bbox.x + entry.bbox.width / 2,
        y: entry.bbox.y + entry.bbox.height / 2,
        timestamp: entry.timestamp,
      }))
  }

  private detectShotArc(trajectory: Array<{ x: number; y: number; timestamp: number }>): boolean {
    if (trajectory.length < 5) return false

    // Look for upward motion followed by downward motion
    let hasUpward = false
    let hasDownward = false
    let peakIndex = 0

    for (let i = 1; i < trajectory.length; i++) {
      const dy = trajectory[i].y - trajectory[i - 1].y

      if (dy < -10) {
        // Moving up (negative Y)
        hasUpward = true
        peakIndex = i
      } else if (dy > 10 && hasUpward && i > peakIndex) {
        // Moving down after peak
        hasDownward = true
        break
      }
    }

    return hasUpward && hasDownward
  }

  private findClosestPlayer(
    basketballTrack: TrackedObject,
    playerTracks: TrackedObject[],
    timestamp: number,
  ): TrackedObject | null {
    const ballPos = basketballTrack.history[basketballTrack.history.length - 1]
    if (!ballPos) return null

    let closest: TrackedObject | null = null
    let minDistance = Number.POSITIVE_INFINITY

    for (const player of playerTracks) {
      const playerPos = player.history[player.history.length - 1]
      if (!playerPos || Math.abs(playerPos.timestamp - timestamp) > 0.5) continue

      const distance = Math.sqrt(
        Math.pow(ballPos.bbox.x - playerPos.bbox.x, 2) + Math.pow(ballPos.bbox.y - playerPos.bbox.y, 2),
      )

      if (distance < minDistance) {
        minDistance = distance
        closest = player
      }
    }

    return minDistance < 200 ? closest : null // Within 200 pixels
  }

  private determineShotType(shooter: TrackedObject, hoop: TrackedObject, timestamp: number): ShotEvent["shotType"] {
    const shooterPos = shooter.history[shooter.history.length - 1]
    const hoopPos = hoop.history[hoop.history.length - 1]

    if (!shooterPos || !hoopPos) return "jump_shot"

    const distance = Math.sqrt(
      Math.pow(shooterPos.bbox.x - hoopPos.bbox.x, 2) + Math.pow(shooterPos.bbox.y - hoopPos.bbox.y, 2),
    )

    if (distance < 150) return "layup"
    if (distance > 500) return "three_pointer"
    if (shooterPos.bbox.y < hoopPos.bbox.y + 50) return "dunk"

    return "jump_shot"
  }

  private generateShotDescription(shooter: TrackedObject, timestamp: number): string {
    const minutes = Math.floor(timestamp / 60)
    const seconds = Math.floor(timestamp % 60)
    return `Player attempts shot at ${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  private updateShotOutcomes(frame: BasketballFrame) {
    // Update outcomes for shots in progress
    for (const shot of this.shotEvents) {
      if (shot.outcome === "in_progress" && frame.timestamp > shot.timestamp + 2) {
        // Determine outcome based on ball position relative to hoop
        shot.outcome = this.determineShotOutcome(shot, frame)
      }
    }
  }

  private determineShotOutcome(shot: ShotEvent, frame: BasketballFrame): "made" | "missed" {
    // Simplified outcome determination
    // In real implementation, you'd track if ball goes through hoop
    return Math.random() > 0.4 ? "made" : "missed"
  }

  getRecentShots(seconds = 60): ShotEvent[] {
    const cutoff = Date.now() / 1000 - seconds
    return this.shotEvents.filter((shot) => shot.timestamp > cutoff)
  }

  reset() {
    this.trackedObjects.clear()
    this.shotEvents = []
    this.frameHistory = []
    this.nextObjectId = 1
  }
}

export const basketballTracker = new BasketballTracker()
