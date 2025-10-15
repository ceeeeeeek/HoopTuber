import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (process.env.BACKEND_URL || "").replace(/\/$/, ""); // e.g. https://api.hooptuber.com

export async function POST(req: NextRequest) {
  // Accept JSON { videoUrl, fileName, ... }
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* ignore */ }

  if (!UPSTREAM) {
    return NextResponse.json(
      { ok: false, message: "Backend coming soon" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${UPSTREAM}/analyze-video-cv`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    // Try to return JSON; if not JSON, return raw text
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Upstream error", error: String(err?.message || err) },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "analyze-video-cv" });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

// import { type NextRequest, NextResponse } from "next/server"
// import { basketballDetector } from "./cv-models/basketball-detector"
// import { shotAnalyzer, type ShotEvent } from "./cv-models/shot-analyzer"

// export async function POST(request: NextRequest) {
//   try {
//     const { videoUrl, fileName } = await request.json()

//     if (!videoUrl) {
//       return NextResponse.json({ error: "No video URL provided" }, { status: 400 })
//     }

//     console.log("Starting computer vision analysis for:", fileName)

//     // Initialize models
//     await basketballDetector.initialize()
//     shotAnalyzer.reset()

//     // Step 1: Extract video metadata
//     const metadata = await extractVideoMetadata(videoUrl)
//     console.log("Video metadata:", metadata)

//     // Step 2: Process video frames with CV models
//     const shots = await processVideoWithCV(videoUrl, metadata)
//     console.log(`Detected ${shots.length} shots using computer vision`)

//     // Step 3: Create analysis result
//     const result = {
//       processingId: `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       status: "completed",
//       videoUrl,
//       fileName,
//       analysis: {
//         shots: shots.map((shot) => ({
//           timestamp: shot.timestamp,
//           confidence: shot.confidence,
//           shotType: shot.shotType,
//           player: shot.player,
//           basket: {
//             position: shot.hoop.position,
//             made: shot.outcome === "made",
//           },
//           clipStart: shot.clipStart,
//           clipEnd: shot.clipEnd,
//         })),
//         videoMetadata: metadata,
//         processingMethod: "computer_vision",
//         modelsUsed: ["YOLO", "MediaPipe"],
//       },
//       createdAt: new Date().toISOString(),
//       highlightReel: {
//         duration: shots.length * 8,
//         clipCount: shots.length,
//         totalShots: shots.length,
//         successfulShots: shots.filter((shot) => shot.outcome === "made").length,
//       },
//     }

//     return NextResponse.json({
//       success: true,
//       result,
//     })
//   } catch (error) {
//     console.error("Computer vision analysis error:", error)
//     return NextResponse.json({ error: "CV analysis failed" }, { status: 500 })
//   }
// }

// async function extractVideoMetadata(videoUrl: string) {
//   try {
//     const response = await fetch(videoUrl, { method: "HEAD" })
//     const contentLength = response.headers.get("content-length")

//     // In production, use FFprobe for actual metadata
//     return {
//       duration: 600, // 10 minutes
//       resolution: { width: 1920, height: 1080 },
//       fps: 30,
//       fileSize: contentLength ? Number.parseInt(contentLength) : 0,
//     }
//   } catch (error) {
//     console.error("Metadata extraction failed:", error)
//     return {
//       duration: 600,
//       resolution: { width: 1920, height: 1080 },
//       fps: 30,
//       fileSize: 0,
//     }
//   }
// }

// async function processVideoWithCV(videoUrl: string, metadata: any): Promise<ShotEvent[]> {
//   console.log("Processing video with computer vision models...")

//   const shots: ShotEvent[] = []
//   const frameInterval = 0.5 // Process every 0.5 seconds
//   const totalFrames = Math.floor(metadata.duration / frameInterval)

//   // Simulate frame-by-frame processing
//   for (let i = 0; i < Math.min(totalFrames, 200); i++) {
//     // Limit for demo
//     const timestamp = i * frameInterval

//     // In real implementation:
//     // 1. Extract frame at timestamp using FFmpeg
//     // 2. Convert frame to ImageData
//     // 3. Process with computer vision models

//     // Simulate frame extraction and processing
//     const frameData = await simulateFrameExtraction(videoUrl, timestamp)

//     // Analyze frame with basketball detector
//     const detection = await basketballDetector.detectFrame(frameData)

//     // Add detection to shot analyzer
//     const shot = shotAnalyzer.addDetection(timestamp, detection)

//     if (shot) {
//       shots.push(shot)
//       console.log(`Shot detected at ${timestamp}s: ${shot.shotType} (${shot.outcome})`)
//     }

//     // Add small delay to simulate processing time
//     if (i % 10 === 0) {
//       await new Promise((resolve) => setTimeout(resolve, 100))
//     }
//   }

//   // Wait for shot outcomes to be determined
//   await new Promise((resolve) => setTimeout(resolve, 2000))

//   return shots.filter((shot) => shot.outcome !== "unknown")
// }

// async function simulateFrameExtraction(videoUrl: string, timestamp: number): Promise<string> {
//   // In real implementation:
//   // ffmpeg -i video.mp4 -ss ${timestamp} -vframes 1 -f image2 frame.jpg

//   return `frame_data_${timestamp}`
// }
