import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== UPLOAD URL API CALLED ===")

  try {
    // Get request body with proper error handling
    let requestBody
    try {
      requestBody = await request.json()
      console.log("Request body received:", requestBody)
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
        },
        { status: 400 },
      )
    }

    // Extract properties with fallbacks for safety
    const filename = requestBody.filename || requestBody.fileName || "video.mp4"
    const fileSize = requestBody.fileSize || requestBody.size || 0
    const fileType = requestBody.contentType || requestBody.fileType || requestBody.type || "video/mp4"

    console.log("Normalized request data:", {
      filename,
      fileSize: fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)}MB` : "unknown",
      fileType,
    })

    // Environment check
    const token = process.env.BLOB_READ_WRITE_TOKEN
    console.log("Environment check:")
    console.log("- Token exists:", !!token)
    console.log("- Token length:", token?.length || 0)

    if (!token || !token.startsWith("vercel_blob_rw_")) {
      console.log("🎭 No valid blob token, returning mock response")
      return NextResponse.json({
        success: false,
        useMock: true,
        message: "Blob storage not configured - will use demo mode",
      })
    }

    // File validation
    const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/quicktime", "video/x-msvideo"]
    if (fileType && !allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
        },
        { status: 400 },
      )
    }

    // Size validation
    const maxSize = 150 * 1024 * 1024 // 150MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum size is 150MB.`,
        },
        { status: 400 },
      )
    }

    try {
      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = filename.split(".").pop() || "mp4"
      const uniqueFileName = `basketball-videos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

      console.log("Generated unique filename:", uniqueFileName)

      // Use handleUpload for client-side uploads
      const { handleUpload } = await import("@vercel/blob/client")

      // Generate upload URL for client-side upload
      const response = await handleUpload({
        pathname: uniqueFileName,
        body: {
          contentType: fileType,
          contentLength: fileSize,
        },
        onUploadProgress: () => {}, // No-op for server-side
      })

      console.log("✅ Upload URL created successfully")

      return NextResponse.json({
        success: true,
        uploadUrl: response.url,
        pathname: response.pathname,
        fileName: uniqueFileName,
        processingId: `upload_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      })
    } catch (blobError: any) {
      console.error("❌ Failed to create upload URL:", blobError)

      // Check if it's a token/auth issue
      if (blobError.message?.includes("token") || blobError.message?.includes("auth")) {
        return NextResponse.json({
          success: false,
          useMock: true,
          message: "Authentication error - will use demo mode",
          error: blobError.message,
        })
      }

      return NextResponse.json({
        success: false,
        useMock: true,
        message: "Blob storage error - will use demo mode",
        error: blobError.message,
      })
    }
  } catch (error) {
    console.error("❌ Upload URL generation error:", error)

    return NextResponse.json(
      {
        success: false,
        useMock: true,
        message: "Server error - will use demo mode",
        error: error instanceof Error ? error.message : "Failed to generate upload URL",
      },
      { status: 500 },
    )
  }
}
