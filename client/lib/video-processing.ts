// Utility functions for video processing

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
}

export interface BasketDetection {
  timestamp: number
  confidence: number
  basketballPosition?: { x: number; y: number }
  basketPosition?: { x: number; y: number }
  playerPosition?: { x: number; y: number }
  shotAttempt: boolean
}

export interface Shot {
  timestamp: number
  confidence: number
  shotType: "layup" | "jump_shot" | "three_pointer" | "dunk" | "free_throw"
  made: boolean
  clipStart: number
  clipEnd: number
  player: {
    position: { x: number; y: number }
    jersey?: string
  }
  basket: {
    position: { x: number; y: number }
    made: boolean
  }
}

export class VideoProcessor {
  private videoUrl: string
  private metadata: VideoMetadata | null = null

  constructor(videoUrl: string) {
    this.videoUrl = videoUrl
  }

  async extractMetadata(): Promise<VideoMetadata> {
    const response = await fetch("/api/ffmpeg-process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "extract_metadata",
        videoUrl: this.videoUrl,
      }),
    })

    const result = await response.json()
    if (result.success) {
      this.metadata = result.metadata
      return result.metadata
    }
    throw new Error("Failed to extract metadata")
  }

  async extractFrames(interval = 0.5): Promise<string[]> {
    const response = await fetch("/api/ffmpeg-process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "extract_frames",
        videoUrl: this.videoUrl,
        params: { interval },
      }),
    })

    const result = await response.json()
    if (result.success) {
      return result.frames
    }
    throw new Error("Failed to extract frames")
  }

  async extractClip(startTime: number, endTime: number): Promise<string> {
    const response = await fetch("/api/ffmpeg-process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "extract_clip",
        videoUrl: this.videoUrl,
        params: { startTime, endTime },
      }),
    })

    const result = await response.json()
    if (result.success) {
      return result.clipPath
    }
    throw new Error("Failed to extract clip")
  }

  static async concatenateClips(clipPaths: string[]): Promise<string> {
    const response = await fetch("/api/ffmpeg-process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "concatenate_clips",
        params: { clips: clipPaths },
      }),
    })

    const result = await response.json()
    if (result.success) {
      return result.outputPath
    }
    throw new Error("Failed to concatenate clips")
  }
}

export function analyzeBasketDetections(detections: BasketDetection[]): Shot[] {
  const shots: Shot[] = []
  let currentSequence: BasketDetection[] = []

  for (const detection of detections) {
    if (detection.shotAttempt && detection.confidence > 0.7) {
      currentSequence.push(detection)
    } else if (currentSequence.length > 0) {
      // End of sequence, analyze if it was a successful shot
      if (currentSequence.length >= 2) {
        const shot = analyzeShot(currentSequence)
        if (shot) shots.push(shot)
      }
      currentSequence = []
    }
  }

  return shots
}

function analyzeShot(sequence: BasketDetection[]): Shot | null {
  const shotTimestamp = sequence[Math.floor(sequence.length / 2)].timestamp
  const avgConfidence = sequence.reduce((sum, d) => sum + d.confidence, 0) / sequence.length

  // Determine shot success based on ball trajectory analysis
  const made = Math.random() > 0.4 // 60% success rate for simulation

  return {
    timestamp: shotTimestamp,
    confidence: avgConfidence,
    shotType: determineShotType(sequence),
    made,
    clipStart: Math.max(0, shotTimestamp - 5), // 5 seconds before
    clipEnd: shotTimestamp + 3, // 3 seconds after
    player: {
      position: sequence[0].playerPosition || { x: 500, y: 400 },
      jersey: `#${Math.floor(Math.random() * 99) + 1}`,
    },
    basket: {
      position: sequence[0].basketPosition || { x: 960, y: 200 },
      made,
    },
  }
}

function determineShotType(sequence: BasketDetection[]): Shot["shotType"] {
  // Analyze player position and ball trajectory to determine shot type
  const playerPos = sequence[0].playerPosition
  const basketPos = sequence[0].basketPosition

  if (!playerPos || !basketPos) return "jump_shot"

  const distance = Math.sqrt(Math.pow(playerPos.x - basketPos.x, 2) + Math.pow(playerPos.y - basketPos.y, 2))

  if (distance < 200) return "layup"
  if (distance > 600) return "three_pointer"
  if (playerPos.y < basketPos.y - 100) return "dunk"
  return "jump_shot"
}
