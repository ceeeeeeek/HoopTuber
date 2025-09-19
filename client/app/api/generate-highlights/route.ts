// app/api/generate-highlights/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/gemini";

const HighlightReelSchema = z.object({
  title: z.string().describe("Catchy title for the highlight reel"),
  description: z.string().describe("Description of the highlights"),
  clips: z.array(
    z.object({
      id: z.string(),
      startTime: z.number(),
      endTime: z.number(),
      shotType: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      isSuccessful: z.boolean(),
    }),
  ),
  stats: z.object({
    totalShots: z.number(),
    successfulShots: z.number(),
    shootingPercentage: z.number(),
    bestShot: z.string().describe("Description of the best shot in the reel"),
  }),
  suggestedHashtags: z.array(z.string()),
})

type HighlightReel = z.infer<typeof HighlightReelSchema>;
type Clip = HighlightReel["clips"][number];

// -------------- Route handler --------------
export async function POST(request: NextRequest) {
  try {
    const { processingId, shots } = await request.json();

    if (!shots || !Array.isArray(shots)) {
      return NextResponse.json({ error: "Invalid shots data" }, { status: 400 })
    }

    const model = getModel(); // defaults to "gemini-2.5-pro"

    const prompt = `
Return ONLY JSON that matches this schema (no prose, no markdown fences):
${HighlightReelSchema.toString()}
      
      Create an engaging highlight reel from these basketball shots:
      
      ${JSON.stringify(shots, null, 2)}
      
      Generate:
      - A catchy title for the highlight reel
      - Engaging description
      - Individual clip descriptions with basketball terminology
      - Relevant hashtags for social media
      - Performance statistics
      - Tags for each clip (like #clutch, #smooth, #anklebreaker, etc.)
      
      Make it sound exciting and use basketball slang appropriately.
      `.trim();

      const gen = await model.generateContent([{ text: prompt }]);
      const raw = gen.response.text().trim();
  
      // Remove accidental ```json fences if present
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
  
      // Validate with Zod
      const highlightReel: HighlightReel = HighlightReelSchema.parse(
        JSON.parse(cleaned)
      );
  
      const duration = highlightReel.clips.reduce(
        (total: number, clip: Clip) => total + (clip.endTime - clip.startTime),
        0
      );

    // In a real implementation, you would:
    // 1. Use FFmpeg or similar to actually cut video clips
    // 2. Stitch clips together with transitions
    // 3. Add music/sound effects
    // 4. Generate thumbnail images
    // 5. Upload the final highlight reel

    const result = {
      processingId,
      aiModel: "gemini-2.5-pro",
      highlightReel: {
        ...highlightReel,
        videoUrl: `/api/highlight-video/${processingId}`, // Placeholder URL
        thumbnailUrl: `/placeholder.svg?height=360&width=640&text=Highlight+Reel`,
        //duration: highlightReel.clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0),
        duration,
        createdAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({success: true, result,});
  } catch (error) {
    console.error("Highlight generation error:", error);
    return NextResponse.json({ error: "Failed to generate highlights" }, { status: 500 })
  }
}
