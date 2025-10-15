// app/api/create-highlight-reel/route.ts
export const runtime = "nodejs";
import { type NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { shots, originalVideoUrl, processingId } = await request.json();

    if (!shots || !originalVideoUrl) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    console.log(`Creating highlight reel with ${shots.length} shots`);

    // Create mock artifacts (text-based placeholders)
    //const highlightBlob = createMockHighlightReel(shots, processingId);
    //const thumbnailBlob = createMockThumbnail(shots);

    // === Build artifacts (your original functions, unchanged) ===
    const highlightData = createMockHighlightReel(shots, processingId);
    const thumbnailData = createMockThumbnail(shots);   

    // “upload” via our helper (data URLs for now)
    // const highlightKey = `highlights/${processingId}-basketball-highlights.mp4`;
    // const thumbKey = `thumbnails/${processingId}-thumbnail.jpg`;
    // const { url: highlightUrl } = await storage.putObject(highlightKey, highlightBlob, "text/plain");
    // const { url: thumbnailUrl } = await storage.putObject(thumbKey, thumbnailBlob, "text/plain");

    // === “Upload” via our shim (returns data URLs for now) ===
    const highlightFileName = `highlights/${processingId}-basketball-highlights.mp4`;
    const thumbnailFileName = `thumbnails/${processingId}-thumbnail.jpg`;

    // Content is plain text right now; when you switch to real video/PNG, change contentType.
    const { url: highlightUrl } = await storage.putObject(
      highlightFileName,
      highlightData,
      "text/plain"
    );
    const { url: thumbnailUrl } = await storage.putObject(
      thumbnailFileName,
      thumbnailData,
      "text/plain"
    );

    // Calculate stats
    const successfulShots = shots.filter((shot: any) => shot.basket.made).length
    const totalDuration = shots.length * 8 // 8 seconds per clip

    return NextResponse.json({
      success: true,
      highlightReel: {
        url: highlightUrl, thumbnailUrl,
        duration: totalDuration,
        clipCount: shots.length,
        totalShots: shots.length,
        successfulShots,
        shootingPercentage: shots.length
        ? Math.round((successfulShots / shots.length) * 100)
        : 0,
        createdAt: new Date().toISOString(),
        type: "highlight_reel",
      },
    });
  } catch (err) {
    console.error("Highlight reel creation error:", err);
    return NextResponse.json({ error: "Failed to create highlight reel" }, { status: 500 });
  }
}

function createMockHighlightReel(shots: any[], processingId: string): Blob {
  // Create a mock video file that represents the basketball highlights
  const highlightContent = `
🏀 BASKETBALL HIGHLIGHTS REEL 🏀
Processing ID: ${processingId}
Generated: ${new Date().toISOString()}

=== HIGHLIGHT CLIPS ===
${shots
  .map(
    (shot: any, index: number) => `
Clip ${index + 1}: ${shot.shotType.toUpperCase()}
Time: ${shot.clipStart}s - ${shot.clipEnd}s
Result: ${shot.basket.made ? "✅ MADE" : "❌ MISSED"}
Player: ${shot.player.jersey || "Unknown"}
Confidence: ${Math.round(shot.confidence * 100)}%
`,
  )
  .join("")}

=== STATS ===
Total Shots: ${shots.length}
Made Shots: ${shots.filter((s: any) => s.basket.made).length}
Shooting %: ${Math.round((shots.filter((s: any) => s.basket.made).length / shots.length) * 100)}%
Total Duration: ${shots.length * 8} seconds

This is a simulated highlight reel.
In production, this would be an actual MP4 video file
created by concatenating the detected basketball shots.
`

  return new Blob([highlightContent], { type: "text/plain" });
}

function createMockThumbnail(shots: any[]): Blob {
  const thumbnailContent = `
🏀 Basketball Highlights Thumbnail
Shots: ${shots.length}
Made: ${shots.filter((s: any) => s.basket.made).length}
Success Rate: ${Math.round((shots.filter((s: any) => s.basket.made).length / shots.length) * 100)}%
`
  return new Blob([thumbnailContent], { type: "text/plain" });
}


//-------------------------
//ChatGPT - How this helps

//No more @vercel/blob and no env token checks.

//You still “upload” and get back URLs (data URLs for now), so the rest of your app keeps working.

//SWhen you’re ready for real storage (S3/R2/Firebase Storage), just implement putObject in lib/storage.ts—no changes needed in this route