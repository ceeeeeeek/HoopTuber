import { type NextRequest, NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || "demo-user"
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // List videos from blob storage for this user
    const { blobs } = await list({
      prefix: `basketball-videos/`,
      limit: limit,
    })

    // Filter and format video data
    const userVideos = blobs
      .filter((blob) => blob.pathname.includes("basketball-videos/"))
      .map((blob) => ({
        id: blob.pathname.split("/").pop()?.split(".")[0] || "",
        url: blob.url,
        fileName: blob.pathname.split("/").pop() || "",
        uploadedAt: blob.uploadedAt,
        size: blob.size,
        // In a real app, you'd get this from a database
        processed: true,
        highlightCount: Math.floor(Math.random() * 10) + 3,
        duration: Math.floor(Math.random() * 600) + 300,
      }))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    return NextResponse.json({
      success: true,
      videos: userVideos,
      total: userVideos.length,
    })
  } catch (error) {
    console.error("Error fetching user videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
