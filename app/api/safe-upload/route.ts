// app/api/safe-upload/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    console.log("📤 Safe upload API called");

    // Parse form data safely
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("Failed to parse form data:", parseError);
      return NextResponse.json(
        { success: false, error: "Failed to parse form data" },
        { status: 400 }
      );
    }

    //const file = formData.get("video") as File | null;
    //const filename = (formData.get("filename") as string) || "video.mp4";
    //const contentType = (formData.get("contentType") as string) || "video/mp4";

    const file = formData.get("video") as File | null;
    const fallbackName = (formData.get("filename") as string) || "video.mp4";
    const fallbackType = (formData.get("contentType") as string) || "video/mp4";

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No video file provided",
        },
        { status: 400 },
      );
    }

    // // Safe file property access
    // const fileName = file.name || filename || "video.mp4"
    // const fileSize = file.size || 0
    // const fileType = file.type || contentType || "video/mp4"

    // Safe file property access
    const fileName = file.name || fallbackName;
    const fileSize = typeof file.size === "number" ? file.size : 0;
    const fileType = file.type || fallbackType;

    console.log("Safe file details:", {
      name: fileName,
      size: fileSize,
      type: fileType,
      hasName: !!file.name,
      hasType: !!file.type,
      //hasSize: !!file.size,
      hasSize: typeof file.size === "number",
    });

    // Validate size
    if (fileSize > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${(fileSize / 1024 / 1024).toFixed(
            2
          )}MB. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB.`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename with timestamp
    //const timestamp = Date.now()
    //const fileExtension = fileName.split(".").pop() || "mp4"
    //const uniqueFileName = `basketball-videos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

    // We are not storing anywhere yet. Return a mock, stable URL the rest of
    // your pipeline can consume (same pattern used in other routes).
    const ts = Date.now();
    const processingId = `proc_${ts}_${Math.random().toString(36).slice(2, 11)}`;
    const videoUrl = `/api/mock-video/${ts}/${encodeURIComponent(fileName)}`;
    //NOTE: When you’re ready to switch to real storage (S3/R2/Firebase, etc.), you can replace the videoUrl line with the uploaded object’s URL and keep the rest intact

    // Optionally: if you need a tiny preview you can base64 a small slice here.
    // Skipped to avoid large responses.

    // console.log("Generated filename:", uniqueFileName)

    // try {
    //   // Upload to Vercel Blob using server-side API
    //   console.log("Uploading to Vercel Blob...")
    //   const blob = await put(uniqueFileName, file, {
    //     access: "public",
    //     contentType: fileType,
    //   })

    //   console.log("Upload successful:", blob)

      // Generate processing ID
      //const processingId = `proc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

      // const result = {
      //   success: true,
      //   videoUrl: blob.url,
      //   processingId,
      //   fileName,
      //   fileSize,
      //   uploadedAt: new Date().toISOString(),
      //   method: "safe_upload",
      //   blobInfo: {
      //     url: blob.url,
      //     pathname: blob.pathname,
      //     size: blob.size,
      //     contentType: fileType,
      //   },
      // }

      const result = {
        success: true,
        method: "safe_upload_no_storage",
        aiModel: "gemini-2.5-pro", // consistency tag only
        videoUrl, // mock URL (works until you add real storage)
        processingId,
        fileName,
        fileSize,
        contentType: fileType,
        uploadedAt: new Date().toISOString(),
      };

      return NextResponse.json(result);
    } catch (error) {
      console.error("Safe upload error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to upload video",
          details: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 }
      );
    }
  }

  //Once again, when you’re ready to switch to real storage (S3/R2/Firebase, etc.), you can replace the videoUrl line with the uploaded object’s URL and keep the rest intact.
