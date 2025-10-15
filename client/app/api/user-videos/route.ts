// app/api/user-videos/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

// --- Types that mirror what you used to get back from blob storage ---
interface StoredBlob {
  pathname: string;      // e.g. "basketball-videos/1234.mp4"
  url: string;           // public/accessible URL
  uploadedAt: string;    // ISO string
  size: number;          // bytes
}

// Local stub that mimics `list({ prefix, limit })` from @vercel/blob.
// Replace this with your real storage SDK later.
async function list(opts: { prefix: string; limit?: number }): Promise<{ blobs: StoredBlob[] }> {
  const { prefix, limit = 10 } = opts;

  // Generate mock items so the rest of your pipeline remains intact
  const now = Date.now();
  const items: StoredBlob[] = Array.from({ length: limit }, (_, i) => {
    const id = String(now - i * 1000);
    const fileName = `${id}.mp4`;
    return {
      pathname: `${prefix}${fileName}`,
      // Reuse your existing mock-video pattern so downstream links won’t break
      url: `/api/mock-video/${id}/${encodeURIComponent(fileName)}`,
      uploadedAt: new Date(now - i * 60_000).toISOString(), // 1 min apart
      size: 25 * 1024 * 1024, // 25 MB demo size
    };
  });

  return { blobs: items };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo-user"; // kept for future use
    const limit = Number.parseInt(searchParams.get("limit") || "10");

    // List videos for this user (stubbed). Swap this call when you add real storage.
    const { blobs } = await list({
      prefix: `basketball-videos/`,
      limit,
    });

    // Filter and format video data (preserved from your original flow)
    type UserVideo = {
      id: string;
      url: string;
      fileName: string;
      uploadedAt: string;
      size: number;
      processed: boolean;
      highlightCount: number;
      duration: number;
    };

    const userVideos: UserVideo[] = blobs
      .filter((blob: StoredBlob) => blob.pathname.includes("basketball-videos/"))
      .map((blob: StoredBlob) => ({
        id: blob.pathname.split("/").pop()?.split(".")[0] || "",
        url: blob.url,
        fileName: blob.pathname.split("/").pop() || "",
        uploadedAt: blob.uploadedAt,
        size: blob.size,
        // Same “fake” metadata you had before
        processed: true,
        highlightCount: Math.floor(Math.random() * 10) + 3,
        duration: Math.floor(Math.random() * 600) + 300,
      }))
      .sort(
        (a: UserVideo, b: UserVideo) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

    return NextResponse.json({
      success: true,
      userId,           // kept (even though not used in stub)
      videos: userVideos,
      total: userVideos.length,
    });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
//NOTE:
//When you’re ready to plug in real storage, replace the list(...) stub with your S3/R2/Firebase listing call and keep the rest untouched.
//
// Local stub that mimics `list({ prefix, limit })` from @vercel/blob.
// Replace this with your real storage SDK later.
//async function list(opts: { prefix: string; limit?: number }): Promise<{ blobs: StoredBlob[] }> {
  //const { prefix, limit = 10 } = opts;



// import { type NextRequest, NextResponse } from "next/server"
// //import { list } from "@vercel/blob"

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const userId = searchParams.get("userId") || "demo-user"
//     const limit = Number.parseInt(searchParams.get("limit") || "10")

//     // List videos from blob storage for this user
//     const { blobs } = await list({
//       prefix: `basketball-videos/`,
//       limit: limit,
//     })

//     // Filter and format video data
//     const userVideos = blobs
//       .filter((blob) => blob.pathname.includes("basketball-videos/"))
//       .map((blob) => ({
//         id: blob.pathname.split("/").pop()?.split(".")[0] || "",
//         url: blob.url,
//         fileName: blob.pathname.split("/").pop() || "",
//         uploadedAt: blob.uploadedAt,
//         size: blob.size,
//         // In a real app, you'd get this from a database
//         processed: true,
//         highlightCount: Math.floor(Math.random() * 10) + 3,
//         duration: Math.floor(Math.random() * 600) + 300,
//       }))
//       .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

//     return NextResponse.json({
//       success: true,
//       videos: userVideos,
//       total: userVideos.length,
//     })
//   } catch (error) {
//     console.error("Error fetching user videos:", error)
//     return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
//   }
// }
