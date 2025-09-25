// app/api/generate-highlight-video/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
interface HighlightClip {
  id: string;
  startTime: number;
  endTime: number;
  shotType: string;
  description: string;
  isSuccessful: boolean;
}

/* ----------------------------- tiny utilities ----------------------------- */
// // Helper: turn a Buffer into a data URL
// function bufferToDataUrl(buf: Buffer, mime = "video/mp4"): string {
//   return `data:${mime};base64,${buf.toString("base64")}`;
// }
function bufferToDataUrl(buf: Buffer, mime = "video/mp4") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/* ---------------------------------- route --------------------------------- */
export async function POST(request: NextRequest) {
  try {
    const { processingId, clips, originalVideoUrl } = await request.json();

    if (!clips || !Array.isArray(clips) || !originalVideoUrl) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    console.log(`Generating highlight video with ${clips.length} clips`);

    // Step 1: Download original video
    const originalVideo = await downloadVideo(originalVideoUrl);

    // Step 2: Extract individual clips using FFmpeg
    const individualClips = await extractVideoClips(originalVideo, clips, processingId);

    // Step 3: Create highlight reel by concatenating clips
    const highlightReel = await createHighlightReel(individualClips, processingId);

    // Step 4: Generate thumbnail
    const thumbnail = await generateThumbnail(individualClips[0], processingId);

    const result = {
      processingId,
      aiModel: "gemini-2.5-pro", // consistency tag
      highlightReel: {
        url: highlightReel.url,
        mime: highlightReel.mime,
        size: highlightReel.size,
        thumbnailUrl: thumbnail.url,
        duration: clips.reduce((total: number, clip: HighlightClip) => total + (clip.endTime - clip.startTime), 0),
        clipCount: clips.length,
        createdAt: new Date().toISOString(),
      },
      individualClips: individualClips.map((clipObj, index) => {
        const c = clips[index];
        return {
          id: c.id,
          url: clipObj.url,
          mime: clipObj.mimeType, // ✅ fixed mime vs mimeType
          size: clipObj.size,
          startTime: c.startTime,
          endTime: c.endTime,
          shotType: c.shotType,
          description: c.description,
          isSuccessful: c.isSuccessful,
          duration: c.endTime - c.startTime,
        };
      }),
      stats: {
        totalShots: clips.length,
        successfulShots: clips.filter((clip: HighlightClip) => clip.isSuccessful).length,
        shootingPercentage: Math.round(
          (clips.filter((clip: HighlightClip) => clip.isSuccessful).length / clips.length) * 100,
        ),
      },
    };

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Highlight generation error:", error);
    return NextResponse.json({ error: "Failed to generate highlight video" }, { status: 500 });
  }
}

/* ----------------------- helpers (no external storage) ----------------------- */
async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log("Downloading original video...");
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

type ExtractedClip = {
  url: string;       // data URL (usable by <video src="...">)
  size: number;      // bytes
  mimeType: string;  // e.g., "video/mp4"
};

/**
 * PRESERVED SHAPE (minus storage):
 * Simulates extracting each clip and returns a list with data URLs instead of uploaded blob URLs.
 */
async function extractVideoClips(videoBuffer: Buffer, clips: HighlightClip[], processingId: string): Promise<ExtractedClip[]> {
  console.log(`Extracting ${clips.length} video clips...`);

  const extractedClips: ExtractedClip[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    console.log(`Extracting clip ${i + 1}: ${clip.startTime}s to ${clip.endTime}s`);

    // In a real implementation, you would use FFmpeg:
    // ffmpeg -i input.mp4 -ss ${startTime} -t ${duration} -c copy output_clip.mp4

    // Your existing simulation (keep this)
    const clipBuffer = await simulateClipExtraction(videoBuffer, clip.startTime, clip.endTime);

    // No remote storage: return a data URL
    const url = bufferToDataUrl(clipBuffer, "video/mp4");
    extractedClips.push({
      url,
      size: clipBuffer.length,
      mimeType: "video/mp4",
    });
  }

  return extractedClips;
}

/**
 * PRESERVED SHAPE:
 * Simulate clip extraction by returning a buffer (placeholder).
 */
async function simulateClipExtraction(_videoBuffer: Buffer, startTime: number, endTime: number): Promise<Buffer> {
  // In a real implementation, this would use FFmpeg to extract the actual clip
  // For simulation, we'll create a mock clip buffer
  const duration = endTime - startTime;
  const mockClipData = `Mock video clip: ${startTime}s to ${endTime}s (${duration}s duration)`;
  return Buffer.from(mockClipData);
}

/**
 * PRESERVED SHAPE (minus storage):
 * Previously returned a blob from @vercel/blob; now returns a data URL plus meta.
 * Uses generateMockHighlightVideo (preserved) to create a JSON "video" description.
 */
async function createHighlightReel(clips: ExtractedClip[], processingId: string): Promise<{ url: string; mime: string; size: number }> {
  console.log("Creating highlight reel from clips...");
  // In a real implementation, you would:
  // 1. Use FFmpeg to concatenate clips: ffmpeg -f concat -i filelist.txt -c copy output.mp4
  // 2. Add transitions between clips
  // 3. Add background music
  // 4. Add text overlays with shot information

  //const highlightReelData = `Highlight reel with ${clips.length} clips`
  //const highlightFileName = `highlights/${processingId}-highlight-reel.mp4`

  // const highlightBlob = await put(highlightFileName, highlightReelData, {
  //   access: "public",
  //   addRandomSuffix: false,
  // })

  // return highlightBlob
  //const highlightBlob = await generateMockHighlightVideo(clips, processingId)
  //const buffer = Buffer.from(await highlightBlob.arrayBuffer())

  const mockBlob = await generateMockHighlightVideo(
    clips.map((c, idx) => ({
      id: String(idx + 1),
      startTime: 0,
      endTime: 0,
      shotType: "unknown",
      description: "",
      isSuccessful: true,
    })) as HighlightClip[],
    processingId
  );

  const ab = await mockBlob.arrayBuffer();
  const buf = Buffer.from(ab);
  const url = bufferToDataUrl(buf, "application/json");

  return { url, mime: "application/json", size: buf.length };
}

/**
 * PRESERVED SHAPE (minus storage):
 * Generate a simple text thumbnail and return as data URL.
 */
async function generateThumbnail(_firstClip: ExtractedClip, processingId: string): Promise<{ url: string; mime: string; size: number }> {
  console.log("Generating thumbnail...");

  // In a real implementation, you would:
  // 1. Extract a frame from the first clip: ffmpeg -i clip.mp4 -ss 2 -vframes 1 thumbnail.jpg
  // 2. Add overlay text with game info
  // 3. Resize to appropriate dimensions

  //const thumbnailData = `Thumbnail for highlight reel ${processingId}`
  //const thumbnailFileName = `thumbnails/${processingId}-thumbnail.jpg`

  // Previously: extract a frame with FFmpeg, upload via put(...)
  // Now: return a text "thumbnail" as data URL.
  const content = `Thumbnail for highlight reel ${processingId}`;
  const buf = Buffer.from(content);
  const url = bufferToDataUrl(buf, "text/plain");

  return { url, mime: "text/plain", size: buf.length };
}

/**
 * PRESERVED SHAPE:
 * Still returns a Blob describing the highlight reel in JSON,
 * just like your original mock.
 */
// Update the generateMockHighlightVideo function
async function generateMockHighlightVideo(clips: HighlightClip[], processingId: string): Promise<Blob> {
  // In a real implementation, this would use FFmpeg to:
  // 1. Extract clips from the original video
  // 2. Add transitions between clips
  // 3. Add background music
  // 4. Add text overlays with shot information
  // 5. Render the final highlight reel

  // In a real implementation: FFmpeg pipeline to build the MP4
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

  return new Blob([JSON.stringify(highlightContent, null, 2)], { type: "application/json" });
}
