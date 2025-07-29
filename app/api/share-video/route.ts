import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, platform, caption, hashtags, processingId } = await request.json()

    if (!videoUrl || !platform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate platform-specific content
    const platformContent = generatePlatformContent(platform, caption, hashtags)

    // Create shareable link data
    const shareData = {
      processingId,
      videoUrl,
      platform,
      caption: platformContent.caption,
      hashtags: platformContent.hashtags,
      createdAt: new Date().toISOString(),
      shareId: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    // Store share data in blob storage for tracking
    const shareFileName = `shares/${shareData.shareId}.json`
    await put(shareFileName, JSON.stringify(shareData), {
      access: "public",
      addRandomSuffix: false,
    })

    // Generate platform-specific share URLs
    const shareUrls = generateShareUrls(videoUrl, platformContent, platform)

    return NextResponse.json({
      success: true,
      shareData,
      shareUrls,
      platformContent,
    })
  } catch (error) {
    console.error("Share generation error:", error)
    return NextResponse.json({ error: "Failed to generate share content" }, { status: 500 })
  }
}

function generatePlatformContent(platform: string, caption: string, hashtags: string[]) {
  const baseHashtags = ["#HoopTuber", "#Basketball", "#Highlights", "#AI"]
  const allHashtags = [...baseHashtags, ...hashtags]

  switch (platform) {
    case "tiktok":
      return {
        caption: `${caption} 🏀✨ Created with AI on HoopTuber! ${allHashtags.join(" ")}`,
        hashtags: allHashtags,
        description: "Check out these sick basketball highlights! 🔥",
      }
    case "instagram":
      return {
        caption: `${caption}\n\n${allHashtags.join(" ")}\n\nCreated with @HoopTuber - AI-powered basketball highlights! 🏀🤖`,
        hashtags: allHashtags,
        description: "Basketball highlights made easy with AI",
      }
    case "twitter":
      return {
        caption: `${caption} ${allHashtags.slice(0, 5).join(" ")} - Made with @HoopTuber`,
        hashtags: allHashtags.slice(0, 5),
        description: "AI-generated basketball highlights",
      }
    case "youtube":
      return {
        caption: `${caption}\n\nCreated using HoopTuber's AI-powered basketball analysis.\n\nTags: ${allHashtags.join(", ")}`,
        hashtags: allHashtags,
        description: "Basketball highlights and analysis powered by AI",
      }
    default:
      return {
        caption: `${caption} ${allHashtags.join(" ")}`,
        hashtags: allHashtags,
        description: caption,
      }
  }
}

function generateShareUrls(videoUrl: string, content: any, platform: string) {
  const encodedCaption = encodeURIComponent(content.caption)
  const encodedVideoUrl = encodeURIComponent(videoUrl)

  switch (platform) {
    case "tiktok":
      return {
        direct: `https://www.tiktok.com/upload?caption=${encodedCaption}`,
        web: `https://www.tiktok.com/`,
      }
    case "instagram":
      return {
        direct: `https://www.instagram.com/`,
        web: `https://www.instagram.com/`,
      }
    case "twitter":
      return {
        direct: `https://twitter.com/intent/tweet?text=${encodedCaption}&url=${encodedVideoUrl}`,
        web: `https://twitter.com/compose/tweet`,
      }
    case "youtube":
      return {
        direct: `https://www.youtube.com/upload`,
        web: `https://studio.youtube.com/`,
      }
    default:
      return {
        direct: videoUrl,
        web: videoUrl,
      }
  }
}
