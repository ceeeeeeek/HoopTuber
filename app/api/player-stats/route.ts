// app/api/player-stats/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/gemini"

const PlayerStatsSchema = z.object({
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      jersey: z.string().optional(),
      stats: z.object({
        shotsAttempted: z.number(),
        shotsMade: z.number(),
        shootingPercentage: z.number(),
        threePointers: z.object({
          attempted: z.number(),
          made: z.number(),
          percentage: z.number(),
        }),
        layups: z.object({
          attempted: z.number(),
          made: z.number(),
          percentage: z.number(),
        }),
        timeOnCourt: z.number().describe("Time in seconds"),
        highlights: z.array(
          z.object({
            timestamp: z.number(),
            description: z.string(),
            type: z.enum(["shot", "assist", "steal", "block", "dunk"]),
          }),
        ),
      }),
    }),
  ),
  teamStats: z.object({
    totalShots: z.number(),
    totalMakes: z.number(),
    teamShootingPercentage: z.number(),
    gameFlow: z.array(
      z.object({
        quarter: z.number(),
        shots: z.number(),
        makes: z.number(),
      }),
    ),
  }),
})

type PlayerStats = z.infer<typeof PlayerStatsSchema>;

export async function POST(request: NextRequest) {
  try {
    const { shots, videoMetadata } = await request.json();

    if (!shots || !Array.isArray(shots)) {
      return NextResponse.json({ error: "Invalid shots data" }, { status: 400 });
    }

    const durationSec = Number(videoMetadata?.duration) || 600;

    // --- Gemini 2.5 Pro call ---
    const model = getModel(); // defaults to "gemini-2.5-pro"

    const prompt = `
    Return ONLY JSON that matches this schema (no markdown fences, no prose):
    ${PlayerStatsSchema.toString()} 

      Generate detailed basketball player statistics from this shot data:
      
      ${JSON.stringify(shots, null, 2)}
      
      Video duration: ${videoMetadata?.duration || 600} seconds
      
      Create realistic stats for 4-8 players including:
      - Individual shooting percentages
      - Shot type breakdowns (3-pointers, layups, etc.)
      - Time on court
      - Key highlights and moments
      - Team overall performance
      
      Make the stats realistic for a pickup basketball game.
      `.trim();

      const gen = await model.generateContent([{ text: prompt }]);
      const raw = gen.response.text().trim();

      // Tolerate accidental ```json fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      
      const parsed = JSON.parse(cleaned);
      const stats: PlayerStats = PlayerStatsSchema.parse(parsed);


      return NextResponse.json({ success: true, aiModel: "gemini-2.5-pro", stats });
    } catch (error) {
      console.error("Stats generation error:", error);
      return NextResponse.json(
        { error: "Failed to generate player stats", details: String(error) },
        { status: 500 },
      );
    }
  }
  
