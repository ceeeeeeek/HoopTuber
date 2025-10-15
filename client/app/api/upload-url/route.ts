// app/api/upload-url/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("=== UPLOAD URL API CALLED ===");

  try {
    // --- Parse request body safely ---
    let requestBody: any;
    try {
      requestBody = await request.json();
      console.log("Request body received:", requestBody);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    // --- Normalize inputs (preserved) ---
    const filename =
      requestBody.filename || requestBody.fileName || "video.mp4";
    const fileSize = requestBody.fileSize || requestBody.size || 0;
    const fileType =
      requestBody.contentType ||
      requestBody.fileType ||
      requestBody.type ||
      "video/mp4";

    console.log("Normalized request data:", {
      filename,
      fileSize: fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)}MB` : "unknown",
      fileType,
    });

    // --- Validation (preserved) ---
    const allowedTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (fileType && !allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
        },
        { status: 400 }
      );
    }

    const maxSize = 150 * 1024 * 1024; // 150MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${(fileSize / 1024 / 1024).toFixed(
            2
          )}MB. Maximum size is 150MB.`,
        },
        { status: 400 }
      );
    }

    // --- Generate unique names (preserved; .substr -> .slice) ---
    const timestamp = Date.now();
    const fileExtension = filename.split(".").pop() || "mp4";
    const randomSuffix = Math.random().toString(36).slice(2, 11); // 9 chars
    const uniqueFileName = `basketball-videos/${timestamp}-${randomSuffix}.${fileExtension}`;
    const processingId = `upload_${timestamp}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    console.log("Generated unique filename:", uniqueFileName);

    // --- Mock upload URL response (no Vercel, easy to swap later) ---
    // When you move to S3/R2/Firebase: replace `uploadUrl` with the real
    // pre-signed URL and keep the rest intact.
    const mockUploadUrl = `/api/mock-upload?name=${encodeURIComponent(
      uniqueFileName
    )}`;

    return NextResponse.json({
      success: true,
      useMock: true, // signals the client this is a demo endpoint
      uploadUrl: mockUploadUrl,
      pathname: uniqueFileName,
      fileName: uniqueFileName,
      processingId,
      message:
        "Storage not configured. Using mock upload URL. Replace `uploadUrl` with your real pre-signed URL when ready.",
    });
  } catch (error) {
    console.error("❌ Upload URL generation error:", error);
    return NextResponse.json(
      {
        success: false,
        useMock: true,
        message: "Server error - using demo mode",
        error: error instanceof Error ? error.message : "Failed to generate upload URL",
      },
      { status: 500 }
    );
  }
}
//Note:
//--- Mock upload URL response (no Vercel, easy to swap later) ---
// When you move to S3/R2/Firebase: replace `uploadUrl` with the real
// pre-signed URL and keep the rest intact.
//  const mockUploadUrl = `/api/mock-upload?name=${encodeURIComponent(
//  uniqueFileName
//)}`;


// import { type NextRequest, NextResponse } from "next/server"

// export async function POST(request: NextRequest) {
//   console.log("=== UPLOAD URL API CALLED ===")

//   try {
//     // Get request body with proper error handling
//     let requestBody
//     try {
//       requestBody = await request.json()
//       console.log("Request body received:", requestBody)
//     } catch (parseError) {
//       console.error("Failed to parse request body:", parseError)
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Invalid request format",
//         },
//         { status: 400 },
//       )
//     }

//     // Extract properties with fallbacks for safety
//     const filename = requestBody.filename || requestBody.fileName || "video.mp4"
//     const fileSize = requestBody.fileSize || requestBody.size || 0
//     const fileType = requestBody.contentType || requestBody.fileType || requestBody.type || "video/mp4"

//     console.log("Normalized request data:", {
//       filename,
//       fileSize: fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)}MB` : "unknown",
//       fileType,
//     })

//     // Environment check
//     //const token = process.env.//BLOB_READ_WRITE_TOKEN
//     console.log("Environment check:")
//     console.log("- Token exists:", !!token)
//     console.log("- Token length:", token?.length || 0)

//     if (!token || !token.startsWith("vercel_blob_rw_")) {
//       console.log("🎭 No valid blob token, returning mock response")
//       return NextResponse.json({
//         success: false,
//         useMock: true,
//         message: "Blob storage not configured - will use demo mode",
//       })
//     }

//     // File validation
//     const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/quicktime", "video/x-msvideo"]
//     if (fileType && !allowedTypes.includes(fileType)) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
//         },
//         { status: 400 },
//       )
//     }

//     // Size validation
//     const maxSize = 150 * 1024 * 1024 // 150MB
//     if (fileSize && fileSize > maxSize) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum size is 150MB.`,
//         },
//         { status: 400 },
//       )
//     }

//     try {
//       // Generate unique filename
//       const timestamp = Date.now()
//       const fileExtension = filename.split(".").pop() || "mp4"
//       const uniqueFileName = `basketball-videos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

//       console.log("Generated unique filename:", uniqueFileName)

//       // Use handleUpload for client-side uploads
//       //const { handleUpload } = await import("@vercel/blob/client")

//       // Generate upload URL for client-side upload
//       const response = await handleUpload({
//         pathname: uniqueFileName,
//         body: {
//           contentType: fileType,
//           contentLength: fileSize,
//         },
//         onUploadProgress: () => {}, // No-op for server-side
//       })

//       console.log("✅ Upload URL created successfully")

//       return NextResponse.json({
//         success: true,
//         uploadUrl: response.url,
//         pathname: response.pathname,
//         fileName: uniqueFileName,
//         processingId: `upload_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
//       })
//     } catch (blobError: any) {
//       console.error("❌ Failed to create upload URL:", blobError)

//       // Check if it's a token/auth issue
//       if (blobError.message?.includes("token") || blobError.message?.includes("auth")) {
//         return NextResponse.json({
//           success: false,
//           useMock: true,
//           message: "Authentication error - will use demo mode",
//           error: blobError.message,
//         })
//       }

//       return NextResponse.json({
//         success: false,
//         useMock: true,
//         message: "Blob storage error - will use demo mode",
//         error: blobError.message,
//       })
//     }
//   } catch (error) {
//     console.error("❌ Upload URL generation error:", error)

//     return NextResponse.json(
//       {
//         success: false,
//         useMock: true,
//         message: "Server error - will use demo mode",
//         error: error instanceof Error ? error.message : "Failed to generate upload URL",
//       },
//       { status: 500 },
//     )
//   }
// }
