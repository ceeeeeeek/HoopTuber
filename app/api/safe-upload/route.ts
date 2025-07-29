import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    console.log("Safe upload API called")

    // Check if blob token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN not found")
      return NextResponse.json(
        {
          success: false,
          error: "Blob storage not configured. Please set up BLOB_READ_WRITE_TOKEN environment variable.",
          setupRequired: true,
        },
        { status: 500 },
      )
    }

    // Parse the form data safely
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      console.error("Failed to parse form data:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse form data",
        },
        { status: 400 },
      )
    }

    const file = formData.get("video") as File | null
    const filename = (formData.get("filename") as string) || "video.mp4"
    const contentType = (formData.get("contentType") as string) || "video/mp4"

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No video file provided",
        },
        { status: 400 },
      )
    }

    // Safe file property access
    const fileName = file.name || filename || "video.mp4"
    const fileSize = file.size || 0
    const fileType = file.type || contentType || "video/mp4"

    console.log("Safe file details:", {
      name: fileName,
      size: fileSize,
      type: fileType,
      hasName: !!file.name,
      hasType: !!file.type,
      hasSize: !!file.size,
    })

    // Validate file size
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (fileSize > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum size is 100MB.`,
        },
        { status: 400 },
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = fileName.split(".").pop() || "mp4"
    const uniqueFileName = `basketball-videos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

    console.log("Generated filename:", uniqueFileName)

    try {
      // Upload to Vercel Blob using server-side API
      console.log("Uploading to Vercel Blob...")
      const blob = await put(uniqueFileName, file, {
        access: "public",
        contentType: fileType,
      })

      console.log("Upload successful:", blob)

      // Generate processing ID
      const processingId = `proc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

      const result = {
        success: true,
        videoUrl: blob.url,
        processingId,
        fileName,
        fileSize,
        uploadedAt: new Date().toISOString(),
        method: "safe_upload",
        blobInfo: {
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          contentType: fileType,
        },
      }

      return NextResponse.json(result)
    } catch (blobError) {
      console.error("Blob upload error:", blobError)
      return NextResponse.json(
        {
          success: false,
          error: `Blob upload failed: ${blobError instanceof Error ? blobError.message : "Unknown blob error"}`,
          details: blobError instanceof Error ? blobError.stack : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Safe upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload video",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
