import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    console.log("Simple blob upload API called")

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

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get("video") as File
    const filename = formData.get("filename") as string
    const contentType = formData.get("contentType") as string

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No video file provided",
        },
        { status: 400 },
      )
    }

    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type,
      providedFilename: filename,
      providedContentType: contentType,
    })

    // Validate file type and size
    const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/quicktime", "video/x-msvideo"]
    const fileType = file.type || contentType || "video/mp4"

    if (!allowedTypes.some((type) => fileType.includes(type.split("/")[1]))) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
        },
        { status: 400 },
      )
    }

    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 100MB.`,
        },
        { status: 400 },
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = (filename || file.name).split(".").pop() || "mp4"
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
        fileName: filename || file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        method: "simple_blob_upload",
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
    console.error("Simple blob upload error:", error)
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
