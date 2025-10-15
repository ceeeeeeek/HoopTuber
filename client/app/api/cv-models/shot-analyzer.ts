import type { DetectionResult } from "./basketball-detector"

export interface ShotEvent {
  timestamp: number
  confidence: number
  shotType: "layup" | "jump_shot" | "three_pointer" | "dunk" | "free_throw"
  player: {
    id: string
    position: { x: number; y: number }
    jersey?: string
  }
  basketball: {
    trajectory: Array<{ x: number; y: number; timestamp: number }>
    peakHeight: number
    releasePoint: { x: number; y: number }
  }
  hoop: {
    position: { x: number; y: number }
    distance: number
  }
  outcome: "made" | "missed" | "unknown"
  clipStart: number
  clipEnd: number
}

export class ShotAnalyzer {
  private detectionHistory: Array<{ timestamp: number; detection: DetectionResult }> = []
  private ballTrajectory: Array<{ x: number; y: number; timestamp: number }> = []
  private currentShot: Partial<ShotEvent> | null = null

  addDetection(timestamp: number, detection: DetectionResult) {
    // Store detection in history
    this.detectionHistory.push({ timestamp, detection })

    // Keep only last 10 seconds of history
    const cutoff = timestamp - 10
    this.detectionHistory = this.detectionHistory.filter((h) => h.timestamp > cutoff)

    // Update ball trajectory
    if (detection.basketball.detected && detection.basketball.center) {
      this.ballTrajectory.push({
        x: detection.basketball.center.x,
        y: detection.basketball.center.y,
        timestamp,
      })

      // Keep only last 5 seconds of trajectory
      const trajectoryCutoff = timestamp - 5
      this.ballTrajectory = this.ballTrajectory.filter((t) => t.timestamp > trajectoryCutoff)
    }

    // Analyze for shot events
    return this.analyzeForShot(timestamp, detection)
  }

  private analyzeForShot(timestamp: number, detection: DetectionResult): ShotEvent | null {
    // Check if any player is in shooting pose
    const shootingPlayer = detection.players.find((p) => p.pose?.shooting)

    if (!shootingPlayer || !detection.basketball.detected || !detection.hoop.detected) {
      return null
    }

    // Check if this is a new shot (not continuation of current shot)
    if (this.currentShot && timestamp - this.currentShot.timestamp! < 3) {
      return null // Too soon for new shot
    }

    console.log(`Potential shot detected at ${timestamp}s`)

    // Analyze ball trajectory to confirm shot
    const shotConfirmed = this.confirmShotFromTrajectory(detection)

    if (!shotConfirmed) {
      return null
    }

    // Create shot event
    const shot: ShotEvent = {
      timestamp,
      confidence: this.calculateShotConfidence(detection),
      shotType: this.determineShotType(shootingPlayer, detection),
      player: {
        id: shootingPlayer.id,
        position: {
          x: shootingPlayer.bbox.x + shootingPlayer.bbox.width / 2,
          y: shootingPlayer.bbox.y + shootingPlayer.bbox.height / 2,
        },
        jersey: this.extractJerseyNumber(shootingPlayer),
      },
      basketball: {
        trajectory: [...this.ballTrajectory],
        peakHeight: this.calculatePeakHeight(),
        releasePoint: detection.basketball.center!,
      },
      hoop: {
        position: detection.hoop.center!,
        distance: this.calculateDistance(shootingPlayer, detection.hoop),
      },
      outcome: "unknown", // Will be determined by tracking ball after shot
      clipStart: Math.max(0, timestamp - 5), // 5 seconds before
      clipEnd: timestamp + 3, // 3 seconds after
    }

    this.currentShot = shot

    // Start tracking shot outcome
    this.trackShotOutcome(shot)

    return shot
  }

  private confirmShotFromTrajectory(detection: DetectionResult): boolean {
    if (this.ballTrajectory.length < 3) return false

    // Check if ball is moving toward hoop
    const recent = this.ballTrajectory.slice(-3)
    const direction = {
      x: recent[2].x - recent[0].x,
      y: recent[2].y - recent[0].y,
    }

    // Ball should be moving upward initially (negative y direction)
    const movingUp = direction.y < -10

    // Ball should be moving toward hoop
    const hoopX = detection.hoop.center?.x || 0
    const movingTowardHoop =
      Math.abs(direction.x) > 5 &&
      ((recent[0].x < hoopX && direction.x > 0) || (recent[0].x > hoopX && direction.x < 0))

    return movingUp && movingTowardHoop
  }

  private calculateShotConfidence(detection: DetectionResult): number {
    let confidence = 0.5

    // Higher confidence if basketball is clearly detected
    if (detection.basketball.confidence > 0.8) confidence += 0.2

    // Higher confidence if hoop is clearly detected
    if (detection.hoop.confidence > 0.8) confidence += 0.2

    // Higher confidence if player pose is clear
    const shootingPlayer = detection.players.find((p) => p.pose?.shooting)
    if (shootingPlayer && shootingPlayer.confidence > 0.8) confidence += 0.1

    return Math.min(1.0, confidence)
  }

  private determineShotType(player: any, detection: DetectionResult): ShotEvent["shotType"] {
    const distance = this.calculateDistance(player, detection.hoop)
    const playerY = player.bbox.y + player.bbox.height
    const hoopY = detection.hoop.center?.y || 0

    // Dunk: player is above or at hoop level
    if (playerY <= hoopY + 50 && distance < 100) {
      return "dunk"
    }

    // Layup: close to basket
    if (distance < 150) {
      return "layup"
    }

    // Three pointer: far from basket
    if (distance > 500) {
      return "three_pointer"
    }

    // Default to jump shot
    return "jump_shot"
  }

  private calculateDistance(player: any, hoop: any): number {
    const playerCenter = {
      x: player.bbox.x + player.bbox.width / 2,
      y: player.bbox.y + player.bbox.height / 2,
    }

    const hoopCenter = hoop.center || { x: 0, y: 0 }

    return Math.sqrt(Math.pow(playerCenter.x - hoopCenter.x, 2) + Math.pow(playerCenter.y - hoopCenter.y, 2))
  }

  private calculatePeakHeight(): number {
    if (this.ballTrajectory.length < 2) return 0

    const minY = Math.min(...this.ballTrajectory.map((t) => t.y))
    const maxY = Math.max(...this.ballTrajectory.map((t) => t.y))

    return maxY - minY
  }

  private extractJerseyNumber(player: any): string | undefined {
    // In a real implementation, you would use OCR to read jersey numbers
    // For simulation, generate random jersey numbers
    return `#${Math.floor(Math.random() * 99) + 1}`
  }

  private async trackShotOutcome(shot: ShotEvent) {
    // Track ball for 3 seconds after shot to determine outcome
    setTimeout(() => {
      // Simulate outcome determination
      // In real implementation, track if ball goes through hoop
      const made = Math.random() > 0.4 // 60% success rate
      shot.outcome = made ? "made" : "missed"

      console.log(`Shot outcome determined: ${shot.outcome}`)
    }, 3000)
  }

  getRecentShots(timeWindow = 60): ShotEvent[] {
    const now = Date.now() / 1000
    return this.detectionHistory
      .filter((h) => now - h.timestamp < timeWindow)
      .map((h) => this.currentShot)
      .filter((shot) => shot !== null) as ShotEvent[]
  }

  reset() {
    this.detectionHistory = []
    this.ballTrajectory = []
    this.currentShot = null
  }
}

export const shotAnalyzer = new ShotAnalyzer()
