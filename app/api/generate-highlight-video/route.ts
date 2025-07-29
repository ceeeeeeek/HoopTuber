import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

interface HighlightClip {
  id: string
  startTime: number
  endTime: number
  shotType: string
  description: string
  isSuccessful: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { processingId, clips, originalVideoUrl } = await request.json()

    if (!clips || !Array.isArray(clips) || !originalVideoUrl) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    console.log(`Generating highlight video with ${clips.length} clips`)

    // Step 1: Download original video
    const originalVideo = await downloadVideo(originalVideoUrl)

    // Step 2: Extract individual clips using FFmpeg
    const individualClips = await extractVideoClips(originalVideo, clips, processingId)

    // Step 3: Create highlight reel by concatenating clips
    const highlightReel = await createHighlightReel(individualClips, processingId)

    // Step 4: Generate thumbnail
    const thumbnail = await generateThumbnail(individualClips[0], processingId)

    const result = {
      processingId,
      highlightReel: {
        url: highlightReel.url,
        thumbnailUrl: thumbnail.url,
        duration: clips.reduce((total: number, clip: HighlightClip) => total + (clip.endTime - clip.startTime), 0),
        clipCount: clips.length,
        createdAt: new Date().toISOString(),
      },
      individualClips: individualClips.map((clip, index) => ({
        id: clips[index].id,
        url: clip.url,
        startTime: clips[index].startTime,
        endTime: clips[index].endTime,
        shotType: clips[index].shotType,
        description: clips[index].description,
        isSuccessful: clips[index].isSuccessful,
        duration: clips[index].endTime - clips[index].startTime,
      })),
      stats: {
        totalShots: clips.length,
        successfulShots: clips.filter((clip: HighlightClip) => clip.isSuccessful).length,
        shootingPercentage: Math.round(
          (clips.filter((clip: HighlightClip) => clip.isSuccessful).length / clips.length) * 100,
        ),
      },
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("Highlight generation error:", error)
    return NextResponse.json({ error: "Failed to generate highlight video" }, { status: 500 })
  }
}

async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log("Downloading original video...")
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function extractVideoClips(videoBuffer: Buffer, clips: HighlightClip[], processingId: string) {
  console.log(`Extracting ${clips.length} video clips...`)

  const extractedClips = []

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    console.log(`Extracting clip ${i + 1}: ${clip.startTime}s to ${clip.endTime}s`)

    // In a real implementation, you would use FFmpeg:
    // ffmpeg -i input.mp4 -ss ${startTime} -t ${duration} -c copy output_clip.mp4

    const clipBuffer = await simulateClipExtraction(videoBuffer, clip.startTime, clip.endTime)

    // Upload clip to blob storage
    const clipFileName = `clips/${processingId}-clip-${i + 1}.mp4`
    const clipBlob = await put(clipFileName, clipBuffer, {
      access: "public",
      addRandomSuffix: false,
    })

    extractedClips.push(clipBlob)
  }

  return extractedClips
}

async function simulateClipExtraction(videoBuffer: Buffer, startTime: number, endTime: number): Promise<Buffer> {
  // In a real implementation, this would use FFmpeg to extract the actual clip
  // For simulation, we'll create a mock clip buffer
  const duration = endTime - startTime
  const mockClipData = `Mock video clip: ${startTime}s to ${endTime}s (${duration}s duration)`
  return Buffer.from(mockClipData)
}

async function createHighlightReel(clips: any[], processingId: string) {
  console.log("Creating highlight reel from clips...")

  // In a real implementation, you would:
  // 1. Use FFmpeg to concatenate clips: ffmpeg -f concat -i filelist.txt -c copy output.mp4
  // 2. Add transitions between clips
  // 3. Add background music
  // 4. Add text overlays with shot information

  const highlightReelData = `Highlight reel with ${clips.length} clips`
  const highlightFileName = `highlights/${processingId}-highlight-reel.mp4`

  // const highlightBlob = await put(highlightFileName, highlightReelData, {
  //   access: "public",
  //   addRandomSuffix: false,
  // })

  // return highlightBlob
  const highlightBlob = await generateMockHighlightVideo(clips, processingId)
  const buffer = Buffer.from(await highlightBlob.arrayBuffer())

  const upload = await put(highlightFileName, buffer, { access: "public", addRandomSuffix: false })
  return upload
}

async function generateThumbnail(firstClip: any, processingId: string) {
  console.log("Generating thumbnail...")

  // In a real implementation, you would:
  // 1. Extract a frame from the first clip: ffmpeg -i clip.mp4 -ss 2 -vframes 1 thumbnail.jpg
  // 2. Add overlay text with game info
  // 3. Resize to appropriate dimensions

  const thumbnailData = `Thumbnail for highlight reel ${processingId}`
  const thumbnailFileName = `thumbnails/${processingId}-thumbnail.jpg`

  const thumbnailBlob = await put(thumbnailFileName, thumbnailData, {
    access: "public",
    addRandomSuffix: false,
  })

  return thumbnailBlob
}

// Update the generateMockHighlightVideo function
async function generateMockHighlightVideo(clips: HighlightClip[], processingId: string): Promise<Blob> {
  // In a real implementation, this would use FFmpeg to:
  // 1. Extract clips from the original video
  // 2. Add transitions between clips
  // 3. Add background music
  // 4. Add text overlays with shot information
  // 5. Render the final highlight reel

  // For demo purposes, create a mock video file that represents the highlight reel
  const highlightContent = {
    type: "basketball_highlights",
    processingId,
    clips: clips.map((clip) => ({
      startTime: clip.startTime,
      endTime: clip.endTime,
      shotType: clip.shotType,
      isSuccessful: clip.isSuccessful,
    })),
    totalDuration: clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0),
    createdAt: new Date().toISOString(),
  }

  return new Blob([JSON.stringify(highlightContent, null, 2)], { type: "application/json" })
}
