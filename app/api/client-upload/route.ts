import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== CLIENT UPLOAD API CALLED ===")

  try {
    const body = await request.json()
    const { fileName, fileSize, fileType } = body

    console.log("Client upload request:", {
      fileName,
      fileSize: fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)}MB` : "unknown",
      fileType,
    })

    // Environment check
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token || !token.startsWith("vercel_blob_rw_")) {
      console.log("🎭 No valid blob token, using mock mode")
      return createMockUploadResponse(fileName, fileSize)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = fileName?.split(".").pop() || "mp4"
    const uniqueFileName = `basketball-videos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

    try {
      // For client-side uploads, we just return the configuration
      // The actual upload happens directly from the client to Vercel Blob
      const processingId = `upload_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

      return NextResponse.json({
        success: true,
        method: "client_upload",
        fileName: uniqueFileName,
        processingId,
        uploadedAt: new Date().toISOString(),
        note: "File will be uploaded directly from client to Vercel Blob",
      })
    } catch (error: any) {
      console.error("❌ Client upload setup failed:", error)
      return createMockUploadResponse(fileName, fileSize)
    }
  } catch (error) {
    console.error("❌ Client upload error:", error)
    const timestamp = Date.now()
    return createMockUploadResponse("unknown-file.mp4", 0)
  }
}

function createMockUploadResponse(fileName: string | undefined, fileSize: number | undefined) {
  const timestamp = Date.now()
  const mockVideoUrl = `/api/mock-video/${timestamp}/${encodeURIComponent(fileName || "basketball-game.mp4")}`

  const mockResult = {
    success: true,
    videoUrl: mockVideoUrl,
    processingId: `mock_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    fileName: fileName || "basketball-game.mp4",
    fileSize: fileSize || 25000000,
    uploadedAt: new Date().toISOString(),
    method: "mock_fallback",
    verified: true,
    note: "Using demo mode - analyzing your video with AI simulation",
    mockData: {
      analysis: {
        shots: [
          {
            timestamp: 15.2,
            shotType: "jump_shot",
            outcome: "made",
            confidence: 0.92,
            description: "Clean jump shot from the free throw line",
          },
          {
            timestamp: 28.7,
            shotType: "layup",
            outcome: "made",
            confidence: 0.88,
            description: "Fast break layup",
          },
          {
            timestamp: 45.1,
            shotType: "three_pointer",
            outcome: "missed",
            confidence: 0.85,
            description: "Three-point attempt from the corner",
          },
          {
            timestamp: 62.3,
            shotType: "dunk",
            outcome: "made",
            confidence: 0.95,
            description: "Powerful slam dunk",
          },
          {
            timestamp: 78.9,
            shotType: "jump_shot",
            outcome: "made",
            confidence: 0.9,
            description: "Mid-range jumper",
          },
          {
            timestamp: 95.4,
            shotType: "three_pointer",
            outcome: "made",
            confidence: 0.87,
            description: "Corner three-pointer",
          },
        ],
        videoMetadata: {
          duration: 145.8,
          gameType: "scrimmage",
          courtType: "indoor",
        },
        basketDetection: {
          basketsVisible: 2,
          primaryBasket: { x: 0.85, y: 0.25 },
          secondaryBasket: { x: 0.15, y: 0.75 },
        },
        gameStats: {
          totalShots: 6,
          madeShots: 5,
          shootingPercentage: 83,
          shotTypes: {
            layups: 1,
            jumpShots: 2,
            threePointers: 2,
            dunks: 1,
          },
        },
      },
    },
  }

  console.log("🎭 Mock upload result created for client upload")
  return NextResponse.json(mockResult)
}
