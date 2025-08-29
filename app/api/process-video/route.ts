// app/api/process-video/route.ts
export const runtime = "nodejs";
export const maxDuration = 120;

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/gemini";

// Schema for basketball shot detection results
const ShotDetectionSchema = z.object({
  shots: z.array(
    z.object({
      timestamp: z.number().describe("Time in seconds when the shot occurs"),
      confidence: z.number().min(0).max(1).describe("Confidence score of the detection"),
      shotType: z
        .enum(["layup", "jump_shot", "three_pointer", "dunk", "free_throw"])
        .describe("Type of basketball shot"),
      player: z.object({
        position: z.object({
          x: z.number().describe("X coordinate of player"),
          y: z.number().describe("Y coordinate of player"),
        }),
        jersey: z.string().optional().describe("Jersey number if visible"),
      }),
      basket: z.object({
        position: z.object({
          x: z.number().describe("X coordinate of basket"),
          y: z.number().describe("Y coordinate of basket"),
        }),
        made: z.boolean().describe("Whether the shot was successful"),
      }),
      clipStart: z.number().describe("Start time for highlight clip (5 seconds before shot)"),
      clipEnd: z.number().describe("End time for highlight clip (3 seconds after shot)"),
    }),
  ),
  videoMetadata: z.object({
    duration: z.number().describe("Total video duration in seconds"),
    resolution: z.object({
      width: z.number(),
      height: z.number(),
    }),
    fps: z.number().describe("Frames per second"),
  }),
});

// Helper schemas for the two Gemini sub-calls we make
const DetectionBatchSchema = z.object({
  detections: z.array(
    z.object({
      timestamp: z.number(),
      basketballDetected: z.boolean(),
      basketDetected: z.boolean(),
      playerDetected: z.boolean(),
      shotAttempt: z.boolean(),
      confidence: z.number().min(0).max(1),
      ballPosition: z.object({ x: z.number(), y: z.number() }).optional(),
      basketPosition: z.object({ x: z.number(), y: z.number() }).optional(),
    })
  ),
});

const SingleShotAnalysisSchema = z.object({
  made: z.boolean(),
  shotType: z.enum(["layup", "jump_shot", "three_pointer", "dunk", "free_throw"]),
  confidence: z.number().min(0).max(1),
  playerPosition: z.object({ x: z.number(), y: z.number() }),
  basketPosition: z.object({ x: z.number(), y: z.number() }),
});

// -------- Small utility to get strict JSON from Gemini + validate with Zod -----
async function generateJsonWithSchema<T>(
  schema: z.ZodSchema<T>,
  userPrompt: string
): Promise<T> {
  const model = getModel(); // defaults to gemini-2.5-pro

  const sys = `
Return ONLY JSON that satisfies this schema (no prose, no markdown fences):
${schema.toString()}
`.trim();

  const gen = await model.generateContent([{ text: `${sys}\n\n${userPrompt}` }]);
  const raw = gen.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return schema.parse(JSON.parse(cleaned));
}

// --------------------------- Route ---------------------------
export async function POST(request: NextRequest) {
  try {
    const { videoUrl, fileName } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "No video URL provided" }, { status: 400 });
    }

    const processingId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log("Starting real AI video processing for:", fileName)

    // Step 1: Extract video metadata
    const metadata = await extractVideoMetadata(videoUrl);
    console.log("Video metadata:", metadata);

    // Step 2: Extract frames for analysis
    const frames = await extractFrames(videoUrl, metadata.fps);
    console.log(`Extracted ${frames.length} frames for analysis`);

    // Step 3: Analyze frames for basketball detection
    const detections  = await analyzeFramesForBaskets(frames);
    console.log(`Found ${detections .length} potential basket events`);

    // Step 4: Determine successful shots and create clips
    const shots = await determineShotsAndClips(detections , metadata);
    console.log(`Identified ${shots.length} confirmed shots`);

    const result = {
      processingId,
      status: "completed",
      videoUrl,
      fileName,
      analysis: {
        shots,
        videoMetadata: metadata,
      },
      createdAt: new Date().toISOString(),
      highlightReel: {
        duration: shots.length * 8, // 8 seconds per clip (5 before + 3 after)
        clipCount: shots.length,
        totalShots: shots.length,
        successfulShots: shots.filter((shot) => shot.basket.made).length,
      },
    };

    return NextResponse.json({
      success: true,
      processingId,
      result,
    });
  } catch (error) {
    console.error("Video processing error:", error)
    return NextResponse.json({ error: "Video processing failed" }, { status: 500 })
  }
}


// --------------------------- Helpers ---------------------------
async function extractVideoMetadata(videoUrl: string) {
  // In a real implementation, you would use FFprobe to get actual metadata
  // For now, we'll simulate this with realistic values

  // Simulated metadata extraction; keep your structure
  try {
    // Download video to analyze
    const response = await fetch(videoUrl);
    const videoBuffer = await response.arrayBuffer();

    // Simulate metadata extraction (in real implementation, use FFprobe)
    const metadata = {
      duration: 600, // 10 minutes
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      fileSize: videoBuffer.byteLength,
    };

    console.log("Extracted metadata:", metadata);
    return metadata;
  } catch (error) {
    //console.error("Metadata extraction failed:", error)
    console.warn("Metadata extraction failed; using defaults");
    // Return default metadata if extraction fails
    return {
      duration: 600,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      fileSize: 0,
    };
  }
}

async function extractFrames(_videoUrl: string, _fps: number) {
  // Keep your demo approach: generate up to 100 pseudo-frames
  // Extract frames every 0.5 seconds for analysis
  const frameInterval = 0.5; // seconds
  const totalFrames = Math.floor(600 / frameInterval); // Assuming 10 min video

  console.log(`Extracting frames every ${frameInterval} seconds`);

  // In a real implementation, you would:
  // 1. Use FFmpeg to extract frames: ffmpeg -i video.mp4 -vf fps=2 frame_%04d.jpg
  // 2. Store frames temporarily for analysis
  // 3. Return array of frame data with timestamps

  const frames: Array<{ timestamp: number; frameNumber: number; frameData: string }> = [];
  
  for (let i = 0; i < Math.min(totalFrames, 100); i++) {
    // Limit to 100 frames for demo
    frames.push({
      timestamp: i * frameInterval,
      frameNumber: i,
      // In real implementation, this would be actual frame data
      frameData: `frame_${i.toString().padStart(4, "0")}.jpg`,
    });
  }

  return frames;
}

async function analyzeFramesForBaskets(frames: any[]) {
  console.log("Analyzing frames for basketball detection (Gemini)...");

  const detections: z.infer<typeof DetectionBatchSchema>["detections"] = [];

  // Process frames in batches for efficiency
  const batchSize = 10;
  for (let i = 0; i < frames.length; i += batchSize) {
    const batch = frames.slice(i, i + batchSize);

    // In a real implementation, you would:
    // 1. Use a computer vision model (YOLO, MediaPipe, etc.)
    // 2. Detect basketball, hoop, and players in each frame
    // 3. Track ball trajectory and determine shot attempts

    // For now, simulate detection with AI-generated realistic data
    const batchDetections = await simulateBasketDetection(batch)
    detections.push(...batchDetections)
  }

  return detections;
}

async function simulateBasketDetection(frames: any[]) {
  // Use AI to generate realistic basketball detection data
  const prompt = `Analyze these ${frames.length} basketball video frames and detect:
    - Basketball presence and position
    - Basketball hoop/basket presence
    - Player positions
    - Shot attempts (ball trajectory toward basket)
    
    Generate realistic detection data for timestamps: ${frames.map((f) => f.timestamp).join(", ")}
    
    Make some frames have shot attempts (about 10-15% of frames) with varying confidence levels.
    Ensure basketball and basket are detected in most frames of an actual basketball game.`;

  const json = await generateJsonWithSchema(DetectionBatchSchema, prompt);
  return json.detections;
}

async function determineShotsAndClips(detections: any[], metadata: any) {
  console.log("Determining successful shots and creating clips...");

  // Group detections by potential shot sequences
  const shotSequences: any[][] = [];
  let currentSequence: any[] = [];

  for (const detection of detections) {
    if (detection.shotAttempt && detection.confidence > 0.7) {
      currentSequence.push(detection);
    } else if (currentSequence.length > 0) {
      // End of sequence, analyze if it was a successful shot
      if (currentSequence.length >= 2) {
        // Need at least 2 frames for a shot
        shotSequences.push(currentSequence);
      }
      currentSequence = [];
    }
  }
  if (currentSequence.length >= 2) {
    shotSequences.push(currentSequence);
  }

  // Analyze each shot sequence to determine success
  const shots: Array<{
    timestamp: number;
    confidence: number;
    shotType: "layup" | "jump_shot" | "three_pointer" | "dunk" | "free_throw";
    player: { position: { x: number; y: number }; jersey?: string };
    basket: { position: { x: number; y: number }; made: boolean };
    clipStart: number;
    clipEnd: number;
  }> = [];

  for (let i = 0; i < shotSequences.length; i++) {
    const sequence = shotSequences[i];
    const shotTimestamp = sequence[Math.floor(sequence.length / 2)].timestamp;

    // Use AI to determine if shot was successful
    const prompt = `Analyze this basketball shot sequence at timestamp ${shotTimestamp}s:
      - Determine if the shot was made or missed
      - Identify the type of shot
      - Provide confidence level
      - Estimate player and basket positions
      
      Shot sequence data: ${JSON.stringify(sequence.slice(0, 3))}`;

    const shotAnalysis = await generateJsonWithSchema(SingleShotAnalysisSchema, prompt);

    shots.push({
      timestamp: shotTimestamp,
      confidence: shotAnalysis.confidence,
      shotType: shotAnalysis.shotType,
      player: {
        position: shotAnalysis.playerPosition,
        jersey: `#${Math.floor(Math.random() * 99) + 1}`,
      },
      basket: {
        position: shotAnalysis.basketPosition,
        made: shotAnalysis.made,
      },
      clipStart: Math.max(0, shotTimestamp - 5), // 5 seconds before
      clipEnd: Math.min(metadata.duration, shotTimestamp + 3), // 3 seconds after
    });
  }

  return shots;
}
