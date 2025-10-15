// app/api/share-video/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

type Platform = "tiktok" | "instagram" | "twitter" | "youtube" | (string & {});
type PlatformContent = { caption: string; hashtags: string[]; description: string };

/** Tiny helper so we can hand back a URL-like reference without real storage yet */
function toDataUrl(mime: string, data: string | Buffer) {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    //const { videoUrl, platform, caption, hashtags, processingId } = await request.json()
    const {
      videoUrl,
      platform,
      caption = "",
      hashtags = [] as string[],
      processingId,
    } = body ?? {};

    if (!videoUrl || !platform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate platform-specific text
    const platformContent = generatePlatformContent(platform as Platform, caption, hashtags);

    // Create shareable link data or shareable record (this used to be uploaded via `put(...)`)
    const shareData = {
      processingId:
        processingId ?? `proc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      videoUrl,
      platform,
      caption: platformContent.caption,
      hashtags: platformContent.hashtags,
      createdAt: new Date().toISOString(),
      shareId: `share_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    // // Store share data in blob storage for tracking
    // const shareFileName = `shares/${shareData.shareId}.json`
    // await put(shareFileName, JSON.stringify(shareData), {
    //   access: "public",
    //   addRandomSuffix: false,
    // })

    // No storage for now: return a data URL containing the JSON
    const shareRecordUrl = toDataUrl("application/json", JSON.stringify(shareData));

    // Generate platform-specific share URLs
    const shareUrls = generateShareUrls(videoUrl, platformContent, platform as Platform);

    return NextResponse.json({
      success: true,
      shareData,
      shareRecordUrl, // when you add S3/R2/Firebase, replace this with the uploaded object URL
      shareUrls,
      platformContent,
    });
  } catch (error) {
    console.error("Share generation error:", error);
    return NextResponse.json({ error: "Failed to generate share content" }, { status: 500 });
  }
}

function generatePlatformContent(
  platform: Platform,
  caption: string,
  hashtags: string[],
): PlatformContent {
  const baseHashtags = ["#HoopTuber", "#Basketball", "#Highlights", "#AI"];
  const allHashtags = [...baseHashtags, ...(hashtags ?? [])];

  switch (platform) {
    case "tiktok":
      return {
        caption: `${caption} 🏀✨ Created with AI on HoopTuber! ${allHashtags.join(" ")}`,
        hashtags: allHashtags,
        description: "Check out these sick basketball highlights! 🔥",
      };
    case "instagram":
      return {
        caption: `${caption}\n\n${allHashtags.join(" ")}\n\nCreated with @HoopTuber - AI-powered basketball highlights! 🏀🤖`,
        hashtags: allHashtags,
        description: "Basketball highlights made easy with AI",
      };
    case "twitter": //Replace later with X. Twitter is now X.
      return {
        caption: `${caption} ${allHashtags.slice(0, 5).join(" ")} - Made with @HoopTuber`,
        hashtags: allHashtags.slice(0, 5),
        description: "AI-generated basketball highlights",
      };
    case "youtube":
      return {
        caption: `${caption}\n\nCreated using HoopTuber's AI-powered basketball analysis.\n\nTags: ${allHashtags.join(", ")}`,
        hashtags: allHashtags,
        description: "Basketball highlights and analysis powered by AI",
      };
    default:
      return {
        caption: `${caption} ${allHashtags.join(" ")}`,
        hashtags: allHashtags,
        description: caption,
      };
  }
}

function generateShareUrls(videoUrl: string, content: PlatformContent, platform: Platform) {
  const encodedCaption = encodeURIComponent(content.caption);
  const encodedVideoUrl = encodeURIComponent(videoUrl);

  switch (platform) {
    case "tiktok":
      return {
        direct: `https://www.tiktok.com/upload?caption=${encodedCaption}`,
        web: `https://www.tiktok.com/`,
      };
    case "instagram":
      return {
        direct: `https://www.instagram.com/`,
        web: `https://www.instagram.com/`,
      };
    case "twitter":
      return {
        direct: `https://twitter.com/intent/tweet?text=${encodedCaption}&url=${encodedVideoUrl}`,
        web: `https://twitter.com/compose/tweet`,
      };
    case "youtube":
      return {
        direct: `https://www.youtube.com/upload`,
        web: `https://studio.youtube.com/`,
      };
    default:
      return {
        direct: videoUrl,
        web: videoUrl,
      }
  }
}

//Note: When you’re ready to move to S3/R2/Firebase, replace the shareRecordUrl line with your upload call and return that hosted URL instead—no other changes required
