// app/api/analyze-video-gemini-direct/route.ts
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

function generateEnhancedMockAnalysis(fileName: string, fileSize: number): BasketballAnalysis {  // Generate dynamic analysis based on file characteristics
  const baseShotCount = Math.max(4, Math.min(12, Math.floor(fileSize / (1024 * 1024)) + 2));
  
  const lower = fileName.toLowerCase();
  const isGameFootage = lower.includes("game") || lower.toLowerCase().includes("match");
  const isPractice = lower.toLowerCase().includes("practice") || lower.toLowerCase().includes("drill");

  const shotTypes = ["layup", "jump_shot", "three_pointer", "dunk", "free_throw", "hook_shot"] as const;
  const outcomes = ["made", "missed"] as const;

  // Realistic success rates by shot type
  const successRates = {
    layup: 0.75,
    dunk: 0.95,
    free_throw: 0.8,
    jump_shot: 0.6,
    three_pointer: 0.35,
    hook_shot: 0.55,
  } as const;

  const shots = Array.from({ length: baseShotCount }, (_, i) => {
    const shotType = shotTypes[Math.floor(Math.random() * shotTypes.length)];
    const isSuccessful = Math.random() < successRates[shotType];
    const timestamp = 15 + i * (180 / baseShotCount) + Math.random() * 10;

    return {
      id: `shot_${i + 1}`,
      timestamp,
      shotType,
      outcome: (isSuccessful ? "made" : "missed") as (typeof outcomes)[number],
      confidence: 0.75 + Math.random() * 0.25,
      description: `${shotType.replace("_", " ")} attempt from ${shotType === "three_pointer" ? "beyond the arc" : shotType === "layup" ? "close range" : "mid-range"} by player ${(i % 3) + 1}`,
      playerPosition: {
        x: shotType === "three_pointer" ? 0.15 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4,
        y: 0.4 + Math.random() * 0.4,
      },
      basketTargeted: "basket_1",
      shotArc: (shotType === "three_pointer" ? "high" : shotType === "layup" ? "low" : "medium") as
        BasketballAnalysis["shotAnalysis"]["shots"][number]["shotArc"],
      releasePoint: {
        timestamp: timestamp + 0.5,
        height: (shotType === "dunk" ? "high" : "medium") as
        BasketballAnalysis["shotAnalysis"]["shots"][number]["releasePoint"]["height"],
      },
      clipBounds: {
        startTime: Math.max(0, timestamp - 3),
        endTime: timestamp + 4,
      },
    };
  });

  const playerCount = isGameFootage ? 4 + Math.floor(Math.random() * 6) : 2 + Math.floor(Math.random() * 3)

  return {
    videoAnalysis: {
      duration: 120 + Math.random() * 180,
      gameType: isGameFootage ? "game" : isPractice ? "practice" : "scrimmage",
      //courtType: "indoor" as const,
      courtType: "indoor",
      playerCount,
      //cameraAngle: "sideline" as const,
      cameraAngle: "sideline",
      //videoQuality: "good" as const,
      videoQuality: "good",
    },
    basketDetection: {
      basketsVisible: 1,
      basketPositions: [
        {
          id: "basket_1",
          position: { x: 0.65, y: 0.25 },
          confidence: 0.95,
          //type: "regulation" as const,
          type: "regulation",
          //height: "10ft" as const,
          height: "10ft",
        },
      ],
    },
    shotAnalysis: {
      totalShots: shots.length,
      shots,
    },
    playerTracking: {
      playersDetected: playerCount,
      players: Array.from({ length: Math.min(playerCount, 5) }, (_, i) => ({
        id: `player_${i + 1}`,
        jersey: `${23 + i * 8}`,
        //team: i % 2 === 0 ? ("team_a" as const) : ("team_b" as const),
        team: i % 2 === 0 ? "team_a" : "team_b",
        position: ["guard", "forward", "center"][i % 3] as any,
        shotsAttempted: Math.floor(shots.length / playerCount) + (i < shots.length % playerCount ? 1 : 0),
        shotsMade: Math.floor(shots.filter((s) => s.outcome === "made").length / playerCount),
        //dominantHand: Math.random() > 0.5 ? ("right" as const) : ("left" as const),
        dominantHand: Math.random() > 0.5 ? "right" : "left",
      })),
    },
    gameFlow: {
      quarters: [
        {
          quarter: 1,
          startTime: 0,
          endTime: 120,
          shots: shots.length,
          //pace: "medium" as const,
          pace: "medium",
        },
      ],
      keyMoments: [
        {
          timestamp: shots.find((s) => s.outcome === "made")?.timestamp || 45,
          //type: "great_shot" as const,
          type: "great_shot",
          description: "Excellent shooting form and perfect arc",
          importance: 8 + Math.floor(Math.random() * 2),
        },
      ],
    },
    highlights: {
      bestShots: shots
        .filter((s) => s.outcome === "made")
        .slice(0, 3)
        .map((shot) => ({
          shotId: shot.id,
          reason: `Great ${shot.shotType.replace("_", " ")} with high confidence`,
          highlightScore: 7 + Math.floor(Math.random() * 3),
        })),
      recommendedClips: [
        {
          id: "clip_1",
          //startTime: Math.max(0, shots[0]?.timestamp - 5 || 10),
          startTime: Math.max(0, (shots[0]?.timestamp ?? 15) - 5),
          endTime: (shots[0]?.timestamp || 15) + 5,
          title: "Best Shots Compilation",
          description: "Top basketball shots from this session",
          //type: "shot_compilation" as const,
          type: "shot_compilation",
          duration: 10,
        },
      ],
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 Starting Gemini 2.5 Pro direct file analysis");

    // Parse the form data
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    //const fileName = formData.get("fileName") as string;
    const fileName = (formData.get("fileName") as string) || "upload.mp4";
    //const processingId = formData.get("processingId") as string;
    const processingId = (formData.get("processingId") as string) || crypto.randomUUID();

    if (!videoFile) {
      return NextResponse.json(
        {
          success: false,
          error: "No video file provided",
        },
        { status: 400 },
      )
    }

    console.log("📹 Processing file:", fileName);
    console.log("📊 File size:", (videoFile.size / 1024 / 1024).toFixed(2), "MB");

    // Check for Google API key with multiple possible environment variable names
    const googleApiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY

    if (!googleApiKey) {
      console.warn("⚠️ No Google API key found in environment variables");
      console.warn("🔍 Checked: GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_AI_API_KEY, GEMINI_API_KEY");
      console.log("📝 Returning enhanced mock analysis instead");

      // Return enhanced mock analysis if no API key
      //const mockAnalysis = generateEnhancedMockAnalysis(fileName, videoFile.size)
      const mock = generateEnhancedMockAnalysis(fileName, videoFile.size);

      const transformedResult = {
        processingId,
        status: "completed",
        fileName,
        analysis: {
          shots: mock.shotAnalysis.shots.map((shot: BasketballAnalysis["shotAnalysis"]["shots"][number]) => ({
            timestamp: shot.timestamp,
            confidence: shot.confidence,
            shotType: shot.shotType,
            description: shot.description,
            outcome: shot.outcome,
            clipStart: shot.clipBounds.startTime,
            clipEnd: shot.clipBounds.endTime,
            player: {
              position: shot.playerPosition,
              jersey: mock.playerTracking.players[0]?.jersey,
            },
            basket: {
              position: mock.basketDetection.basketPositions[0]?.position || { x: 0.5, y: 0.3 },
              made: shot.outcome === "made",
            },
          })),
          videoMetadata: {
            duration: mock.videoAnalysis.duration,
            resolution: { width: 1920, height: 1080 },
            fps: 30,
            gameType: mock.videoAnalysis.gameType,
            courtType: mock.videoAnalysis.courtType,
            playerCount: mock.videoAnalysis.playerCount,
          },
          basketDetection: mock.basketDetection,
          playerTracking: mock.playerTracking,
          gameFlow: mock.gameFlow,
          highlightClips: mock.highlights.recommendedClips.map((clip: BasketballAnalysis["highlights"]["recommendedClips"][number]) => ({
            id: clip.id,
            startTime: clip.startTime,
            endTime: clip.endTime,
            description: clip.description,
            shotType: "highlight",
            isSuccessful: true,
            timestamp: clip.startTime,
            confidence: 0.9,
          })),
          //processingMethod: "enhanced_mock_analysis_no_api_key",
          processingMethod: "enhanced_mock_analysis_no_api_key",
          //aiModel: "mock_basketball_ai_v3",
          aiModel: "mock_basketball_ai_v3",
          analysisQuality: mock.videoAnalysis.videoQuality,
          apiKeyStatus: "missing",
        },
        createdAt: new Date().toISOString(),
      };

      console.log("✅ Mock analysis complete!");
      console.log(`🏀 Found ${mock.shotAnalysis.totalShots} shots`);
      console.log(`🎯 Detected ${mock.basketDetection.basketsVisible} baskets`);

      return NextResponse.json({
        success: true,
        result: transformedResult,
      });
    }

    // Convert video file to base64 for Gemini 2.5 Pro
    console.log("🔄 Converting video to base64...");
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    console.log(`✅ Video converted to base64 (${(base64.length / 1024 / 1024).toFixed(2)}MB)`);

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
        { inlineData: { data: base64, mimeType: videoFile.type || "video/mp4" } },
      ]);

      const raw = gen.response.text().trim();

      const analysis: BasketballAnalysis = BasketballAnalysisSchema.parse(JSON.parse(raw));

      console.log("✅ Gemini analysis complete!");
      console.log(`🏀 Found ${analysis.shotAnalysis.totalShots} shots`);
      console.log(`🎯 Detected ${analysis.basketDetection.basketsVisible} baskets`);

      // Transform Gemini results to match our expected format
      const transformedResult = {
        processingId,
        status: "completed",
        fileName,
        analysis: {
          shots: analysis.shotAnalysis.shots.map((shot: BasketballAnalysis["shotAnalysis"]["shots"][number]) => ({
            timestamp: shot.timestamp,
            confidence: shot.confidence,
            shotType: shot.shotType,
            description: shot.description,
            outcome: shot.outcome,
            clipStart: shot.clipBounds.startTime,
            clipEnd: shot.clipBounds.endTime,
            player: {
              position: shot.playerPosition,
              jersey: analysis.playerTracking.players.find((p: BasketballAnalysis["playerTracking"]["players"][number]) => p.shotsAttempted > 0)?.jersey,
            },
            basket: {
              position: analysis.basketDetection.basketPositions.find((b: BasketballAnalysis["basketDetection"]["basketPositions"][number]) => b.id === shot.basketTargeted)
                ?.position || {
                x: 0.5,
                y: 0.3,
              },
              made: shot.outcome === "made",
            },
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
          highlightClips: analysis.highlights.recommendedClips.map((clip: BasketballAnalysis["highlights"]["recommendedClips"][number]) => ({
            id: clip.id,
            startTime: clip.startTime,
            endTime: clip.endTime,
            description: clip.description,
            shotType: "highlight",
            isSuccessful: true,
            timestamp: clip.startTime,
            confidence: 0.9,
          })),
          //processingMethod: "gemini_2_5_pro_direct_success",
          processingMethod: "gemini_2_5_pro",
          aiModel: "gemini-2.5-pro",
          analysisQuality: analysis.videoAnalysis.videoQuality,
          apiKeyStatus: "configured",
        },
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        result: transformedResult,
      });
    } catch (geminiError) {
      console.error("❌ Gemini API error:", geminiError);

      // Your chosen mock fallback if Gemini fails
      console.log("🔄 Gemini failed, using enhanced mock analysis...");

      // // Provide specific error information
      // let errorMessage = "Gemini video analysis failed"
      // let details = "Unknown error"

      // if (geminiError instanceof Error) {
      //   if (geminiError.message.includes("API key") || geminiError.message.includes("authentication")) {
      //     errorMessage = "Google AI API key issue"
      //     details = "API key may be invalid or expired. Please check your GOOGLE_API_KEY environment variable."
      //   } else if (geminiError.message.includes("quota") || geminiError.message.includes("limit")) {
      //     errorMessage = "API quota exceeded"
      //     details = "Please try again later or check your Google AI quota limits."
      //   } else if (geminiError.message.includes("video") || geminiError.message.includes("file")) {
      //     errorMessage = "Video processing error"
      //     details = "The video format may not be supported or the file may be corrupted. Try a smaller MP4 file."
      //   } else if (geminiError.message.includes("model")) {
      //     errorMessage = "Model access error"
      //     details = "Your API key may not have access to Gemini 2.0 Flash. Check your Google AI Studio settings."
      //   } else {
      //     details = geminiError.message
      //   }
      // }

      // Return enhanced mock analysis as fallback
      console.log("🔄 Falling back to enhanced mock analysis due to Gemini error")
      const mock = generateEnhancedMockAnalysis(fileName, videoFile.size);

      const fallbackResult = {
        processingId,
        status: "completed",
        fileName,
        analysis: {
          shots: mock.shotAnalysis.shots.map((shot: BasketballAnalysis["shotAnalysis"]["shots"][number]) => ({
            timestamp: shot.timestamp,
            confidence: shot.confidence,
            shotType: shot.shotType,
            description: shot.description,
            outcome: shot.outcome,
            clipStart: shot.clipBounds.startTime,
            clipEnd: shot.clipBounds.endTime,
            player: {
              position: shot.playerPosition,
              jersey: mock.playerTracking.players[0]?.jersey,
            },
            basket: {
              position: mock.basketDetection.basketPositions[0]?.position || { x: 0.5, y: 0.3 },
              made: shot.outcome === "made",
            },
          })),
          videoMetadata: {
            duration: mock.videoAnalysis.duration,
            resolution: { width: 1920, height: 1080 },
            fps: 30,
            gameType: mock.videoAnalysis.gameType,
            courtType: mock.videoAnalysis.courtType,
            playerCount: mock.videoAnalysis.playerCount,
          },
          basketDetection: mock.basketDetection,
          playerTracking: mock.playerTracking,
          gameFlow: mock.gameFlow,
          highlightClips: mock.highlights.recommendedClips.map((clip: BasketballAnalysis["highlights"]["recommendedClips"][number]) => ({
            id: clip.id,
            startTime: clip.startTime,
            endTime: clip.endTime,
            description: clip.description,
            shotType: "highlight",
            isSuccessful: true,
            timestamp: clip.startTime,
            confidence: 0.9,
          })),
          processingMethod: "enhanced_mock_analysis_gemini_failed",
          aiModel: "mock_basketball_ai_v3",
          analysisQuality: mock.videoAnalysis.videoQuality,
          apiKeyStatus: "configured_but_failed",
          //geminiError: errorMessage,
          //geminiErrorDetails: details,
        },
        createdAt: new Date().toISOString(),
      }

      console.log("✅ Final fallback analysis complete!");
      console.log(`🏀 Found ${fallbackResult.analysis.shots.length} shots`);
      console.log(`🎯 Detected ${"unknown"} baskets`);

      return NextResponse.json({
        success: true,
        result: fallbackResult,
      })
    }
  } catch (error) {
    console.error("❌ General analysis error:", error)

    return NextResponse.json(
      { success: false, error: "Analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
