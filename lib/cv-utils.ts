// Utility functions for computer vision processing

export interface FrameData {
  timestamp: number
  width: number
  height: number
  data: ImageData | string
}

export class VideoFrameExtractor {
  private videoElement: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.canvas = document.createElement("canvas")
      this.context = this.canvas.getContext("2d")
    }
  }

  async loadVideo(videoUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Video processing only available in browser"))
        return
      }

      this.videoElement = document.createElement("video")
      this.videoElement.crossOrigin = "anonymous"
      this.videoElement.preload = "metadata"

      this.videoElement.onloadedmetadata = () => {
        if (this.canvas && this.videoElement) {
          this.canvas.width = this.videoElement.videoWidth
          this.canvas.height = this.videoElement.videoHeight
        }
        resolve()
      }

      this.videoElement.onerror = () => {
        reject(new Error("Failed to load video"))
      }

      this.videoElement.src = videoUrl
    })
  }

  async extractFrame(timestamp: number): Promise<FrameData | null> {
    if (!this.videoElement || !this.canvas || !this.context) {
      throw new Error("Video not loaded")
    }

    return new Promise((resolve) => {
      this.videoElement!.currentTime = timestamp

      this.videoElement!.onseeked = () => {
        if (!this.canvas || !this.context || !this.videoElement) {
          resolve(null)
          return
        }

        // Draw video frame to canvas
        this.context.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height)

        // Get image data
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)

        resolve({
          timestamp,
          width: this.canvas.width,
          height: this.canvas.height,
          data: imageData,
        })
      }
    })
  }

  async extractFrames(interval = 0.5): Promise<FrameData[]> {
    if (!this.videoElement) {
      throw new Error("Video not loaded")
    }

    const frames: FrameData[] = []
    const duration = this.videoElement.duration

    for (let t = 0; t < duration; t += interval) {
      const frame = await this.extractFrame(t)
      if (frame) {
        frames.push(frame)
      }
    }

    return frames
  }

  getVideoMetadata() {
    if (!this.videoElement) {
      throw new Error("Video not loaded")
    }

    return {
      duration: this.videoElement.duration,
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
      fps: 30, // Estimate, actual FPS detection requires more complex analysis
    }
  }

  cleanup() {
    if (this.videoElement) {
      this.videoElement.src = ""
      this.videoElement = null
    }
    this.canvas = null
    this.context = null
  }
}

export function preprocessFrame(imageData: ImageData): ImageData {
  // Preprocess frame for better model performance
  const data = imageData.data

  // Apply brightness/contrast adjustments
  for (let i = 0; i < data.length; i += 4) {
    // Increase contrast for better object detection
    data[i] = Math.min(255, data[i] * 1.2) // Red
    data[i + 1] = Math.min(255, data[i + 1] * 1.2) // Green
    data[i + 2] = Math.min(255, data[i + 2] * 1.2) // Blue
    // Alpha channel (i + 3) remains unchanged
  }

  return imageData
}

export function calculateIoU(box1: any, box2: any): number {
  // Calculate Intersection over Union for bounding boxes
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

export function nonMaxSuppression(detections: any[], threshold = 0.5): any[] {
  // Remove overlapping detections
  const sorted = detections.sort((a, b) => b.confidence - a.confidence)
  const keep = []

  for (let i = 0; i < sorted.length; i++) {
    let shouldKeep = true

    for (let j = 0; j < keep.length; j++) {
      const iou = calculateIoU(sorted[i].bbox, keep[j].bbox)
      if (iou > threshold) {
        shouldKeep = false
        break
      }
    }

    if (shouldKeep) {
      keep.push(sorted[i])
    }
  }

  return keep
}
