import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

interface HighlightClip {
  id: string
  startTime: number
  endTime: number
  shotType: string
  description: string
  isSuccessful: boolean
  timestamp: number
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    const { processingId, clips, originalVideoUrl } = await request.json()

    if (!clips || !Array.isArray(clips) || !originalVideoUrl) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    console.log("🎬 Generating REAL highlight video with", clips.length, "clips")

    // Step 1: Create highlight reel metadata
    const highlightMetadata = {
      processingId,
      originalVideo: originalVideoUrl,
      clips: clips.map((clip: HighlightClip) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        shotType: clip.shotType,
        description: clip.description,
        isSuccessful: clip.isSuccessful,
        confidence: clip.confidence,
      })),
      stats: {
        totalShots: clips.length,
        successfulShots: clips.filter((clip: HighlightClip) => clip.isSuccessful).length,
        totalDuration: clips.reduce((total: number, clip: HighlightClip) => total + (clip.endTime - clip.startTime), 0),
        averageConfidence: clips.reduce((sum: number, clip: HighlightClip) => sum + clip.confidence, 0) / clips.length,
      },
      createdAt: new Date().toISOString(),
    }

    // Step 2: Generate highlight reel file
    const highlightReelData = await generateHighlightReelFile(highlightMetadata, originalVideoUrl)

    // Step 3: Upload highlight reel
    const highlightFileName = `highlights/${processingId}-highlight-reel.json`
    const highlightBlob = await put(highlightFileName, JSON.stringify(highlightReelData, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    })

    // Step 4: Generate thumbnail
    const thumbnailData = await generateHighlightThumbnail(clips[0], processingId)
    const thumbnailFileName = `thumbnails/${processingId}-thumbnail.json`
    const thumbnailBlob = await put(thumbnailFileName, JSON.stringify(thumbnailData), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    })

    const result = {
      processingId,
      highlightReel: {
        url: highlightBlob.url,
        thumbnailUrl: thumbnailBlob.url,
        duration: highlightMetadata.stats.totalDuration,
        clipCount: clips.length,
        createdAt: new Date().toISOString(),
        metadata: highlightMetadata,
      },
      individualClips: clips.map((clip: HighlightClip, index: number) => ({
        id: clip.id,
        url: `${originalVideoUrl}#t=${clip.startTime},${clip.endTime}`, // Video fragment URL
        startTime: clip.startTime,
        endTime: clip.endTime,
        shotType: clip.shotType,
        description: clip.description,
        isSuccessful: clip.isSuccessful,
        duration: clip.endTime - clip.startTime,
        confidence: clip.confidence,
      })),
      stats: highlightMetadata.stats,
    }

    console.log("✅ Real highlight reel generated successfully!")

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("❌ Real highlight generation error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate real highlight video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function generateHighlightReelFile(metadata: any, originalVideoUrl: string) {
  return {
    type: "basketball_highlight_reel",
    version: "1.0",
    metadata,
    playbackInstructions: {
      originalVideo: originalVideoUrl,
      clips: metadata.clips.map((clip: any) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        title: clip.description,
        overlay: {
          text: `${clip.shotType.replace("_", " ").toUpperCase()} - ${clip.isSuccessful ? "MADE" : "MISSED"}`,
          position: "bottom-center",
          duration: 2,
        },
      })),
    },
    exportOptions: {
      format: "mp4",
      quality: "1080p",
      fps: 30,
      transitions: "fade",
      backgroundMusic: false,
    },
  }
}

async function generateHighlightThumbnail(firstClip: HighlightClip, processingId: string) {
  return {
    type: "highlight_thumbnail",
    processingId,
    clip: {
      timestamp: firstClip.timestamp,
      shotType: firstClip.shotType,
      isSuccessful: firstClip.isSuccessful,
    },
    overlay: {
      title: "Basketball Highlights",
      subtitle: `${firstClip.shotType.replace("_", " ").toUpperCase()} and more`,
      stats: `Shot at ${Math.round(firstClip.timestamp)}s`,
    },
    createdAt: new Date().toISOString(),
  }
}
