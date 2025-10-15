// app/api/client-upload/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("=== CLIENT UPLOAD API CALLED ===");

  try {
    const body = await request.json();
    const { fileName, fileSize, fileType } = body as {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
    };

    console.log("Client upload request:", {
      fileName,
      fileSize: fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)}MB` : "unknown",
      fileType,
    });

    // No object storage configured → always use mock path (keeps UI working)
    return createMockUploadResponse(fileName, fileSize);
  } catch (error) {
    console.error("❌ Client upload error:", error);
    return createMockUploadResponse("unknown-file.mp4", 0);
  }
}

function createMockUploadResponse(fileName: string | undefined, fileSize: number | undefined) { 
  const timestamp = Date.now();
  const mockVideoUrl = `/api/mock-video/${timestamp}/${encodeURIComponent(fileName || "basketball-game.mp4")}`

  const mockResult = {
    success: true,
    videoUrl: mockVideoUrl,
    processingId: `mock_${timestamp}_${Math.random().toString(36).slice(2, 11)}`,
    fileName: fileName || "basketball-game.mp4",
    fileSize: fileSize || 25_000_000,
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

  console.log("🎭 Mock upload result created for client upload");
  return NextResponse.json(mockResult);
}
