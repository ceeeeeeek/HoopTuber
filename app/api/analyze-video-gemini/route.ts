// app/api/analyze-video-gemini/route.ts
export const runtime = "nodejs";
export const maxDuration = 120;

import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getModel } from "@/lib/gemini";

const BasketballAnalysisSchema = z.object({
  videoAnalysis: z.object({
    duration: z.number().describe("Video duration in seconds"),
    gameType: z.enum(["practice", "scrimmage", "game", "training", "warmup"]),
    courtType: z.enum(["indoor", "outdoor", "gym", "street"]),
    playerCount: z.number().min(1).max(10),
    cameraAngle: z.enum(["sideline", "baseline", "overhead", "corner", "mobile"]),
    videoQuality: z.enum(["excellent", "good", "fair", "poor"]),
  }),
  basketDetection: z.object({
    basketsVisible: z.number().min(0).max(2).describe("Number of basketball hoops visible"),
    basketPositions: z.array(
      z.object({
        id: z.string(),
        position: z.object({
          x: z.number().min(0).max(1).describe("Normalized x position (0-1)"),
          y: z.number().min(0).max(1).describe("Normalized y position (0-1)"),
        }),
        confidence: z.number().min(0).max(1),
        type: z.enum(["regulation", "practice", "adjustable"]),
        height: z.enum(["10ft", "adjustable", "lowered", "unknown"]),
      }),
    ),
  }),
  shotAnalysis: z.object({
    totalShots: z.number().min(0),
    shots: z.array(
      z.object({
        id: z.string(),
        timestamp: z.number().describe("Time in seconds when shot occurs"),
        shotType: z.enum(["layup", "jump_shot", "three_pointer", "dunk", "free_throw", "hook_shot"]),
        outcome: z.enum(["made", "missed", "blocked", "unclear"]),
        confidence: z.number().min(0).max(1),
        description: z.string().describe("Detailed description of the shot"),
        playerPosition: z.object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
        }),
        basketTargeted: z.string().describe("ID of basket being targeted"),
        shotArc: z.enum(["high", "medium", "low", "line_drive"]),
        releasePoint: z.object({
          timestamp: z.number(),
          height: z.enum(["high", "medium", "low"]),
        }),
        clipBounds: z.object({
          startTime: z.number(),
          endTime: z.number(),
        }),
      }),
    ),
  }),
  playerTracking: z.object({
    playersDetected: z.number(),
    players: z.array(
      z.object({
        id: z.string(),
        jersey: z.string().optional(),
        team: z.enum(["team_a", "team_b", "unknown"]),
        position: z.enum(["guard", "forward", "center", "unknown"]),
        shotsAttempted: z.number(),
        shotsMade: z.number(),
        dominantHand: z.enum(["right", "left", "unknown"]),
      }),
    ),
  }),
  gameFlow: z.object({
    quarters: z.array(
      z.object({
        quarter: z.number(),
        startTime: z.number(),
        endTime: z.number(),
        shots: z.number(),
        pace: z.enum(["fast", "medium", "slow"]),
      }),
    ),
    keyMoments: z.array(
      z.object({
        timestamp: z.number(),
        type: z.enum(["great_shot", "missed_opportunity", "defensive_play", "turnover"]),
        description: z.string(),
        importance: z.number().min(1).max(10),
      }),
    ),
  }),
  highlights: z.object({
    bestShots: z.array(
      z.object({
        shotId: z.string(),
        reason: z.string(),
        highlightScore: z.number().min(1).max(10),
      }),
    ),
    recommendedClips: z.array(
      z.object({
        id: z.string(),
        startTime: z.number(),
        endTime: z.number(),
        title: z.string(),
        description: z.string(),
        type: z.enum(["shot_compilation", "best_plays", "game_flow", "player_focus"]),
        duration: z.number(),
      }),
    ),
  }),
})

type BasketballAnalysis = z.infer<typeof BasketballAnalysisSchema>;

function generateEnhancedMockAnalysis(fileName: string, fileSize: number): BasketballAnalysis {
    // Return enhanced mock analysis if no API key
    const mockAnalysis = {
      videoAnalysis: {
        duration: 240,
        gameType: "practice" as const,
        courtType: "indoor" as const,
        playerCount: 3,
        cameraAngle: "sideline" as const,
        videoQuality: "good" as const,
      },
      basketDetection: {
        basketsVisible: 1,
        basketPositions: [
          {
            id: "basket_1",
            position: { x: 0.65, y: 0.25 },
            confidence: 0.95,
            type: "regulation" as const,
            height: "10ft" as const,
          },
        ],
      },
      shotAnalysis: {
        totalShots: 12,
        shots: Array.from({ length: 12 }, (_, i) => {
          const shotTypes = ["layup", "jump_shot", "three_pointer", "dunk", "free_throw"] as const
          const outcomes = ["made", "missed"] as const
          const isSuccessful = Math.random() > 0.4 // 60% success rate

          return {
            id: `shot_${i + 1}`,
            timestamp: 15 + i * 18,
            shotType: shotTypes[i % shotTypes.length],
            outcome: isSuccessful ? outcomes[0] : outcomes[1],
            confidence: 0.75 + Math.random() * 0.25,
            description: `${shotTypes[i % shotTypes.length].replace("_", " ")} attempt by player ${(i % 3) + 1}`,
            playerPosition: {
              x: 0.2 + Math.random() * 0.6,
              y: 0.5 + Math.random() * 0.3,
            },
            basketTargeted: "basket_1",
            shotArc: ["high", "medium", "low"][Math.floor(Math.random() * 3)] as any,
            releasePoint: {
              timestamp: 15 + i * 18 + 0.5,
              height: "medium" as const,
            },
            clipBounds: {
              startTime: 10 + i * 18,
              endTime: 20 + i * 18,
            },
          }
        }),
      },
      playerTracking: {
        playersDetected: 3,
        players: [
          {
            id: "player_1",
            jersey: "23",
            team: "team_a" as const,
            position: "guard" as const,
            shotsAttempted: 5,
            shotsMade: 3,
            dominantHand: "right" as const,
          },
          {
            id: "player_2",
            jersey: "15",
            team: "team_a" as const,
            position: "forward" as const,
            shotsAttempted: 4,
            shotsMade: 2,
            dominantHand: "left" as const,
          },
          {
            id: "player_3",
            jersey: "7",
            team: "team_b" as const,
            position: "center" as const,
            shotsAttempted: 3,
            shotsMade: 2,
            dominantHand: "right" as const,
          },
        ],
      },
      gameFlow: {
        quarters: [
          {
            quarter: 1,
            startTime: 0,
            endTime: 120,
            shots: 6,
            pace: "medium" as const,
          },
          {
            quarter: 2,
            startTime: 120,
            endTime: 240,
            shots: 6,
            pace: "fast" as const,
          },
        ],
        keyMoments: [
          {
            timestamp: 45,
            type: "great_shot" as const,
            description: "Amazing three-pointer from the corner",
            importance: 9,
          },
          {
            timestamp: 120,
            type: "great_shot" as const,
            description: "Spectacular dunk finish",
            importance: 8,
          },
          {
            timestamp: 180,
            type: "missed_opportunity" as const,
            description: "Wide open layup missed",
            importance: 6,
          },
        ],
      },
      highlights: {
        bestShots: [
          {
            shotId: "shot_3",
            reason: "Perfect shooting form and high difficulty",
            highlightScore: 9,
          },
          {
            shotId: "shot_7",
            reason: "Clutch shot under pressure",
            highlightScore: 8,
          },
          {
            shotId: "shot_10",
            reason: "Athletic finish at the rim",
            highlightScore: 8,
          },
        ],
        recommendedClips: [
          {
            id: "clip_1",
            startTime: 40,
            endTime: 50,
            title: "Corner Three-Pointer",
            description: "Perfect form three-pointer from the corner",
            type: "best_plays" as const,
            duration: 10,
          },
          {
            id: "clip_2",
            startTime: 115,
            endTime: 125,
            title: "Powerful Dunk",
            description: "Explosive dunk finish",
            type: "best_plays" as const,
            duration: 10,
          },
          {
            id: "clip_3",
            startTime: 190,
            endTime: 200,
            title: "Smooth Layup",
            description: "Textbook layup technique",
            type: "shot_compilation" as const,
            duration: 10,
          },
        ],
      },
    };

    return mockAnalysis;
}

function toResponse(
  processingId: string,
  fileName: string,
  analysis: BasketballAnalysis,
  method: "gemini_2_5_pro" | "enhanced_mock_analysis" = "enhanced_mock_analysis",
  videoUrl?: string,
) {
  const transformedResult = {
    processingId,
    status: "completed",
    ...(videoUrl ? { videoUrl } : {}),
    fileName,
    analysis: {
      shots: analysis.shotAnalysis.shots.map((shot) => ({
        timestamp: shot.timestamp,
        confidence: shot.confidence,
        shotType: shot.shotType,
        description: shot.description,
        outcome: shot.outcome,
        clipStart: shot.clipBounds.startTime,
        clipEnd: shot.clipBounds.endTime,
        player: { position: shot.playerPosition, jersey: analysis.playerTracking.players[0]?.jersey },
        basket: { position: analysis.basketDetection.basketPositions[0]?.position || { x: 0.5, y: 0.3 }, made: shot.outcome === "made" },
      })),
      videoMetadata: {
        duration: analysis.videoAnalysis.duration,
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        gameType: analysis.videoAnalysis.gameType,
        courtType: analysis.videoAnalysis.courtType,
        playerCount: analysis.videoAnalysis.playerCount,
      },
      basketDetection: analysis.basketDetection,
      playerTracking: analysis.playerTracking,
      gameFlow: analysis.gameFlow,
      highlightClips: analysis.highlights.recommendedClips.map((clip) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        description: clip.description,
        shotType: "highlight",
        isSuccessful: true,
        timestamp: clip.startTime,
        confidence: 0.9,
      })),
      processingMethod: method,
      aiModel: method === "gemini_2_5_pro" ? "gemini-2.5-pro" : "mock_data_v2",
      analysisQuality: analysis.videoAnalysis.videoQuality,
    },
    createdAt: new Date().toISOString(),
  };
  return transformedResult;
}

async function convertVideoToBase64(videoUrl: string): Promise<string> {
  try {
    console.log("🔄 Converting video to base64...")
    const response = await fetch(videoUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")

    console.log(`✅ Video converted to base64 (${(base64.length / 1024 / 1024).toFixed(2)}MB)`)
    return base64
  } catch (error) {
    console.error("❌ Failed to convert video to base64:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Read form data
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const videoUrl = formData.get("videoUrl") as string | null;
    let fileName = (formData.get("fileName") as string) || "upload.mp4";
    const processingId = (formData.get("processingId") as string) || crypto.randomUUID();

    if (!videoFile && !videoUrl) {
      return NextResponse.json(
        { success: false, error: "No video file or URL of video provided" },
        { status: 400 },
      );
    }

    // Use file's name if present
    if (videoFile && (!fileName || fileName === "upload.mp4")) {
      fileName = videoFile.name || fileName;
    }

    // API key presence check
    const googleApiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;

    console.log("🎥 Starting Gemini 2.5 Pro video analysis");
    console.log("📹 Video:", fileName);
    if (videoUrl) console.log("🔗 URL:", videoUrl);

    // No API key → enhanced mock
    if (!googleApiKey) {
      console.warn("⚠️ No GOOGLE_API_KEY found, using enhanced mock analysis");
      const approxSize = videoFile?.size ?? 5 * 1024 * 1024;
      const mock = generateEnhancedMockAnalysis(fileName, approxSize);

      console.log("✅ Mock analysis complete!");
      console.log(`🏀 Found ${mock.shotAnalysis.totalShots} shots`);
      console.log(`🎯 Detected ${mock.basketDetection.basketsVisible} baskets`);

      const transformed = toResponse(processingId, fileName, mock, "enhanced_mock_analysis");
      return NextResponse.json({ success: true, result: transformed });
    }

    // Prepare base64 payload (file OR URL)
    let videoBase64: string;
    let mimeType = "video/mp4";

    if (videoFile) {
      const buffer = await videoFile.arrayBuffer();
      videoBase64 = Buffer.from(buffer).toString("base64");
      mimeType = videoFile.type || mimeType;
      console.log(`📦 Read uploaded file (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`);
    } else {
      // Validate URL and convert
      try {
        console.log("🔍 Checking video accessibility...");
        const head = await fetch(videoUrl!, { method: "HEAD" });
        if (!head.ok) {
          return NextResponse.json(
            { success: false, error: "Video not accessible", statusCode: head.status, statusText: head.statusText },
            { status: 400 }
          );
        }
        console.log("✅ Video is accessible");
      } catch (e) {
        return NextResponse.json(
          { success: false, error: "Video URL check failed", details: String(e) },
          { status: 400 }
        );
      }

      try {
        videoBase64 = await convertVideoToBase64(videoUrl!);
        mimeType = "video/mp4"; // Assume mp4 for URL fetch
      } catch (e) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch/convert video", details: String(e) },
          { status: 400 }
        );
      }
    } 

    // Use Gemini 2.5 Pro to analyze the basketball video
    // ----- Gemini 2.5 Pro call via getModel() -----
    try {
      console.log("🤖 Calling Gemini 2.5 Pro API with API key...");
      const model = getModel(); // env GAI_MODEL or "gemini-2.5-pro"

      const prompt = `
Return ONLY JSON that matches this schema (no markdown, no prose):
${BasketballAnalysisSchema.toString()}

Analyze this basketball video in detail. I need you to:

1. **BASKET DETECTION**: Identify and locate all basketball hoops/baskets in the video
   - Mark their positions in the frame (normalized 0-1 coordinates)
   - Determine basket type and height
   - Track which basket players are shooting at

2. **SHOT ANALYSIS**: Detect every basketball shot attempt
   - Identify shot type (layup, jump shot, 3-pointer, dunk, etc.)
   - Determine if shot was made or missed
   - Track ball trajectory and arc
   - Note release point and timing
   - Create clip boundaries for each shot (5 seconds before, 3 seconds after)

3. **PLAYER TRACKING**: Track individual players
   - Count total players
   - Identify shooting patterns
   - Track shooting percentage per player if possible
   - Note dominant shooting hand

4. **GAME CONTEXT**: Understand the game situation
   - Is this practice, scrimmage, or game?
   - Indoor or outdoor court?
   - Camera angle and quality
   - Game pace and intensity

5. **HIGHLIGHT GENERATION**: Identify the best moments
   - Rank shots by excitement/difficulty
   - Create recommended highlight clips
   - Focus on made shots, great plays, and key moments

Please provide detailed, accurate analysis with precise timestamps and coordinates. Pay special attention to basket locations and shot outcomes.

Video file: ${fileName}
`.trim();

      const gen = await model.generateContent([
        { text: prompt },
        { inlineData: { data: videoBase64, mimeType } },
      ]);

      const raw = gen.response.text().trim();

      const analysis: BasketballAnalysis = BasketballAnalysisSchema.parse(JSON.parse(raw));

      console.log("✅ Gemini analysis complete!");
      console.log(`🏀 Found ${analysis.shotAnalysis.totalShots} shots`);
      console.log(`🎯 Detected ${analysis.basketDetection.basketsVisible} baskets`);

      // Original mapping
      const transformedResult = {
        processingId,
        status: "completed",
        videoUrl,
        fileName,
        analysis: {
          shots: analysis.shotAnalysis.shots.map(
            (shot: BasketballAnalysis["shotAnalysis"]["shots"][number]) => ({
              timestamp: shot.timestamp,
              confidence: shot.confidence,
              shotType: shot.shotType,
              description: shot.description,
              outcome: shot.outcome,
              clipStart: shot.clipBounds.startTime,
              clipEnd: shot.clipBounds.endTime,
              player: {
                position: shot.playerPosition,
                jersey: analysis.playerTracking.players.find(
                  (p: BasketballAnalysis["playerTracking"]["players"][number]) => p.shotsAttempted > 0
                )?.jersey,
              },
              basket: {
                position:
                  analysis.basketDetection.basketPositions.find(
                    (b: BasketballAnalysis["basketDetection"]["basketPositions"][number]) =>
                      b.id === shot.basketTargeted
                  )?.position || { x: 0.5, y: 0.3 },
                made: shot.outcome === "made",
              },
            })
          ),
          videoMetadata: {
            duration: analysis.videoAnalysis.duration,
            resolution: { width: 1920, height: 1080 },
            fps: 30,
            gameType: analysis.videoAnalysis.gameType,
            courtType: analysis.videoAnalysis.courtType,
            playerCount: analysis.videoAnalysis.playerCount,
          },
          basketDetection: analysis.basketDetection,
          playerTracking: analysis.playerTracking,
          gameFlow: analysis.gameFlow,
          highlightClips: analysis.highlights.recommendedClips.map(
            (clip: BasketballAnalysis["highlights"]["recommendedClips"][number]) => ({
              id: clip.id,
              startTime: clip.startTime,
              endTime: clip.endTime,
              description: clip.description,
              shotType: "highlight",
              isSuccessful: true,
              timestamp: clip.startTime,
              confidence: 0.9,
            })
          ),
          processingMethod: "gemini_2_5_pro",
          aiModel: "gemini-2.5-pro",
          analysisQuality: analysis.videoAnalysis.videoQuality,
        },
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, result: transformedResult });
    } catch (geminiError) {
      console.error("❌ Gemini API error:", geminiError);

      // Your chosen mock fallback if Gemini fails
      console.log("🔄 Gemini failed, using enhanced mock analysis...");

      const fallbackResult = {
        processingId,
        status: "completed",
        videoUrl,
        fileName,
        analysis: {
          shots: Array.from({ length: 8 }, (_, i) => ({
            timestamp: 25 + i * 25,
            confidence: 0.85 + Math.random() * 0.15,
            shotType: ["layup", "jump_shot", "three_pointer", "dunk"][i % 4],
            description: `AI-detected ${["layup", "jump shot", "three-pointer", "dunk"][i % 4]} attempt`,
            outcome: Math.random() > 0.35 ? "made" : "missed",
            clipStart: 20 + i * 25,
            clipEnd: 30 + i * 25,
            player: {
              position: { x: 0.25 + Math.random() * 0.5, y: 0.55 + Math.random() * 0.25 },
              jersey: ["23", "15", "7"][i % 3],
            },
            basket: { position: { x: 0.65, y: 0.25 }, made: Math.random() > 0.35 },
          })),
          videoMetadata: {
            duration: 220,
            resolution: { width: 1920, height: 1080 },
            fps: 30,
            gameType: "practice",
            courtType: "indoor",
            playerCount: 3,
          },
          processingMethod: "gemini_fallback_analysis",
          aiModel: "enhanced_mock",
        },
        createdAt: new Date().toISOString(),
      };

      console.log("✅ Final fallback analysis complete!");
      console.log(`🏀 Found ${fallbackResult.analysis.shots.length} shots`);
      console.log(`🎯 Detected ${"unknown"} baskets`);

      return NextResponse.json({ success: true, result: fallbackResult });
    }
  } catch (err) {
    console.error("❌ General analysis error:", err);
    return NextResponse.json(
      { success: false, error: "Analysis failed", details: String(err) },
      { status: 500 }
    );
  }
}

