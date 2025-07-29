import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

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

export async function POST(request: NextRequest) {
  try {
    const { shots, videoMetadata } = await request.json()

    if (!shots || !Array.isArray(shots)) {
      return NextResponse.json({ error: "Invalid shots data" }, { status: 400 })
    }

    // Generate comprehensive player statistics
    const { object: stats } = await generateObject({
      model: openai("gpt-4o"),
      schema: PlayerStatsSchema,
      prompt: `Generate detailed basketball player statistics from this shot data:
      
      ${JSON.stringify(shots, null, 2)}
      
      Video duration: ${videoMetadata?.duration || 600} seconds
      
      Create realistic stats for 4-8 players including:
      - Individual shooting percentages
      - Shot type breakdowns (3-pointers, layups, etc.)
      - Time on court
      - Key highlights and moments
      - Team overall performance
      
      Make the stats realistic for a pickup basketball game.`,
    })

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Stats generation error:", error)
    return NextResponse.json({ error: "Failed to generate player stats" }, { status: 500 })
  }
}
