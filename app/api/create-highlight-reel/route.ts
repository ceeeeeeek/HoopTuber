import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const { shots, originalVideoUrl, processingId } = await request.json()

    if (!shots || !originalVideoUrl) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    console.log(`Creating highlight reel with ${shots.length} shots`)

    // Create a mock highlight reel that's clearly different from original
    const highlightData = createMockHighlightReel(shots, processingId)

    // Upload highlight reel
    const highlightFileName = `highlights/${processingId}-basketball-highlights.mp4`
    const highlightBlob = await put(highlightFileName, highlightData, {
      access: "public",
      addRandomSuffix: false,
    })

    // Create thumbnail
    const thumbnailData = createMockThumbnail(shots)
    const thumbnailFileName = `thumbnails/${processingId}-thumbnail.jpg`
    const thumbnailBlob = await put(thumbnailFileName, thumbnailData, {
      access: "public",
      addRandomSuffix: false,
    })

    // Calculate stats
    const successfulShots = shots.filter((shot: any) => shot.basket.made).length
    const totalDuration = shots.length * 8 // 8 seconds per clip

    return NextResponse.json({
      success: true,
      highlightReel: {
        url: highlightBlob.url,
        thumbnailUrl: thumbnailBlob.url,
        duration: totalDuration,
        clipCount: shots.length,
        totalShots: shots.length,
        successfulShots,
        shootingPercentage: Math.round((successfulShots / shots.length) * 100),
        createdAt: new Date().toISOString(),
        type: "highlight_reel",
      },
    })
  } catch (error) {
    console.error("Highlight reel creation error:", error)
    return NextResponse.json({ error: "Failed to create highlight reel" }, { status: 500 })
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

  return new Blob([highlightContent], { type: "text/plain" })
}

function createMockThumbnail(shots: any[]): Blob {
  const thumbnailContent = `
🏀 Basketball Highlights Thumbnail
Shots: ${shots.length}
Made: ${shots.filter((s: any) => s.basket.made).length}
Success Rate: ${Math.round((shots.filter((s: any) => s.basket.made).length / shots.length) * 100)}%
`
  return new Blob([thumbnailContent], { type: "text/plain" })
}
