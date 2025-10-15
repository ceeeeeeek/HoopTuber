import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for processing status (in production, use a database)
const processingStatus = new Map<string, any>()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const processingId = params.id

  if (!processingId) {
    return NextResponse.json({ error: "Processing ID required" }, { status: 400 })
  }

  // Get or create processing status
  let status = processingStatus.get(processingId)

  if (!status) {
    // Initialize new processing status for real CV analysis
    status = {
      processingId,
      status: "initializing",
      progress: 0,
      stage: "Initializing computer vision models",
      estimatedTimeRemaining: 45,
      startedAt: new Date().toISOString(),
      method: "gpt4o_yolov6_cv",
    }
    processingStatus.set(processingId, status)
  }

  // Simulate real CV processing stages
  const elapsed = Date.now() - new Date(status.startedAt).getTime()
  const elapsedSeconds = Math.floor(elapsed / 1000)

  if (elapsedSeconds < 5) {
    status.stage = "Loading YOLOv6 model"
    status.progress = 10
    status.estimatedTimeRemaining = 40
  } else if (elapsedSeconds < 10) {
    status.stage = "Analyzing video with GPT-4o"
    status.progress = 25
    status.estimatedTimeRemaining = 30
  } else if (elapsedSeconds < 20) {
    status.stage = "Extracting video frames"
    status.progress = 40
    status.estimatedTimeRemaining = 25
  } else if (elapsedSeconds < 30) {
    status.stage = "Running object detection with YOLOv6"
    status.progress = 60
    status.estimatedTimeRemaining = 15
  } else if (elapsedSeconds < 40) {
    status.stage = "Tracking basketball and players"
    status.progress = 80
    status.estimatedTimeRemaining = 10
  } else if (elapsedSeconds < 45) {
    status.stage = "Generating highlights with AI"
    status.progress = 95
    status.estimatedTimeRemaining = 5
  } else {
    status.stage = "Analysis complete"
    status.progress = 100
    status.status = "completed"
    status.estimatedTimeRemaining = 0
  }

  console.log(`📊 Processing status for ${processingId}:`, {
    stage: status.stage,
    progress: status.progress,
    elapsed: elapsedSeconds,
  })

  return NextResponse.json(status)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const processingId = params.id
  const updates = await request.json()

  // Update processing status
  const currentStatus = processingStatus.get(processingId) || {}
  const updatedStatus = { ...currentStatus, ...updates, processingId }

  processingStatus.set(processingId, updatedStatus)

  console.log(`📝 Updated processing status for ${processingId}:`, updatedStatus)

  return NextResponse.json(updatedStatus)
}
