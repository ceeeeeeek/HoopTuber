// app/api/upload/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("=== UPLOAD API CALLED ===");

  try {
    // --- Parse form data first (preserved) ---
    console.log("Parsing form data...");
    let formData: FormData;
    let file: File;

    try {
      formData = await request.formData();
      file = formData.get("video") as File;
    } catch (parseError) {
      console.error("❌ Form data parsing failed:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse uploaded file. File might be too large or corrupted.",
        },
        { status: 400 }
      );
    }

    console.log("File received:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      sizeInMB: file?.size ? (file.size / 1024 / 1024).toFixed(2) : "unknown",
      exists: !!file,
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // --- File validation (preserved) ---
    const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/quicktime", "video/x-msvideo"];
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    const hasValidExtension =
      fileName.endsWith(".mp4") || fileName.endsWith(".mov") || fileName.endsWith(".avi");
    const hasValidMimeType = allowedTypes.includes(fileType);

    if (!hasValidMimeType && !hasValidExtension) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
        },
        { status: 400 }
      );
    }

    // Size validation (preserved)
    const maxSize = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 150MB.`,
        },
        { status: 400 }
      );
    }

    console.log("✅ File validation passed");

    // --- Generate filename and timestamp (preserved) ---
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop() || "mp4";
    const uniqueFileName = `basketball-videos/${timestamp}-${Math.random()
      .toString(36)
      .slice(2, 11)}.${fileExtension}`; // .substr -> .slice
    console.log("Generated filename:", uniqueFileName);

    // --- Storage (blob) path removed ---
    // We’re no longer using Vercel Blob here. When you plug in real storage
    // (S3/R2/Firebase, etc.), replace the mock call below with your uploader
    // and set videoUrl to the uploaded object’s URL.

    return createMockUploadResponse(file, timestamp);
  } catch (error) {
    console.error("❌ General upload error:", error);

    // Even for general errors, provide a mock response (preserved behavior)
    const timestamp = Date.now();
    if (error instanceof Error && error.message.includes("file")) {
      return createMockUploadResponse(null, timestamp);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
        details:
          process.env.NODE_ENV === "development"
            ? (error instanceof Error ? error.stack : undefined)
            : undefined,
      },
      { status: 500 }
    );
  }
}

function createMockUploadResponse(file: File | null, timestamp: number) {
  // Local mock URL you already used (preserved)
  const mockVideoUrl = `/api/mock-video/${timestamp}/${encodeURIComponent(
    file?.name || "basketball-game.mp4"
  )}`;

  const mockResult = {
    success: true,
    videoUrl: mockVideoUrl,
    processingId: `mock_${timestamp}_${Math.random().toString(36).slice(2, 11)}`, // .substr -> .slice
    fileName: file?.name || "basketball-game.mp4",
    fileSize: file?.size || 25_000_000, // 25MB mock size
    uploadedAt: new Date().toISOString(),
    method: "mock_fallback",
    verified: true,
    note: "Using demo mode - analyzing your video with AI simulation",
    setupUrl: "/setup-storage",
    // (Preserved) Rich mock analysis payload
    mockData: {
      analysis: {
        shots: [
          { timestamp: 15.2, shotType: "jump_shot", outcome: "made", confidence: 0.92, description: "Clean jump shot from the free throw line" },
          { timestamp: 28.7, shotType: "layup", outcome: "made", confidence: 0.88, description: "Fast break layup" },
          { timestamp: 45.1, shotType: "three_pointer", outcome: "missed", confidence: 0.85, description: "Three-point attempt from the corner" },
          { timestamp: 62.3, shotType: "dunk", outcome: "made", confidence: 0.95, description: "Powerful slam dunk" },
          { timestamp: 78.9, shotType: "jump_shot", outcome: "made", confidence: 0.9, description: "Mid-range jumper" },
          { timestamp: 95.4, shotType: "three_pointer", outcome: "made", confidence: 0.87, description: "Corner three-pointer" },
          { timestamp: 112.1, shotType: "layup", outcome: "missed", confidence: 0.83, description: "Contested layup attempt" },
          { timestamp: 128.6, shotType: "jump_shot", outcome: "made", confidence: 0.91, description: "Fadeaway jumper" },
        ],
        videoMetadata: { duration: 145.8, gameType: "scrimmage", courtType: "indoor", resolution: "1080p", fps: 30 },
        basketDetection: { basketsVisible: 2, primaryBasket: { x: 0.85, y: 0.25 }, secondaryBasket: { x: 0.15, y: 0.75 }, confidence: 0.94 },
        gameStats: {
          totalShots: 8,
          madeShots: 6,
          shootingPercentage: 75,
          shotTypes: { layups: 2, jumpShots: 3, threePointers: 2, dunks: 1 },
          playerMovement: { averageSpeed: 4.2, maxSpeed: 8.7, distanceCovered: 245.6 },
        },
      },
    },
  };

  console.log("🎭 Mock upload result created:", {
    fileName: mockResult.fileName,
    videoUrl: mockResult.videoUrl,
    method: mockResult.method,
    fileSize: file?.size ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : "unknown",
  });

  return NextResponse.json(mockResult);
}
//NOTE:
//--- Storage (blob) path removed ---
// We’re no longer using Vercel Blob here. When you plug in real storage
// (S3/R2/Firebase, etc.), replace the mock call below with your uploader
// and set videoUrl to the uploaded object’s URL
//
//When you’re ready to use real storage, replace the single line:
//return createMockUploadResponse(file, timestamp);
//with your uploader call and set videoUrl to the uploaded object’s URL; you can keep the rest of the handler as-is.


// import { type NextRequest, NextResponse } from "next/server"

// export async function POST(request: NextRequest) {
//   console.log("=== UPLOAD API CALLED ===")

//   try {
//     // Environment check
//     //const token = process.env.//BLOB_READ_WRITE_TOKEN
//     console.log("Environment check:")
//     console.log("- Token exists:", !!token)
//     console.log("- Token length:", token?.length || 0)
//     console.log("- Token prefix:", token?.substring(0, 20) || "none")

//     // Parse form data first
//     console.log("Parsing form data...")
//     let formData: FormData
//     let file: File

//     try {
//       formData = await request.formData()
//       file = formData.get("video") as File
//     } catch (parseError) {
//       console.error("❌ Form data parsing failed:", parseError)
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Failed to parse uploaded file. File might be too large or corrupted.",
//         },
//         { status: 400 },
//       )
//     }

//     console.log("File received:", {
//       name: file?.name,
//       type: file?.type,
//       size: file?.size,
//       sizeInMB: file?.size ? (file.size / 1024 / 1024).toFixed(2) : "unknown",
//       exists: !!file,
//     })

//     if (!file) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "No file provided",
//         },
//         { status: 400 },
//       )
//     }

//     // File validation
//     const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/quicktime", "video/x-msvideo"]
//     const fileName = file.name.toLowerCase()
//     const fileType = file.type

//     const hasValidExtension = fileName.endsWith(".mp4") || fileName.endsWith(".mov") || fileName.endsWith(".avi")
//     const hasValidMimeType = allowedTypes.includes(fileType)

//     if (!hasValidMimeType && !hasValidExtension) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
//         },
//         { status: 400 },
//       )
//     }

//     // Size validation - keep the 150MB limit for reasonable uploads
//     const maxSize = 150 * 1024 * 1024 // 150MB
//     if (file.size > maxSize) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 150MB.`,
//         },
//         { status: 400 },
//       )
//     }

//     console.log("✅ File validation passed")

//     // Generate filename and timestamp
//     const timestamp = Date.now()
//     const fileExtension = file.name.split(".").pop() || "mp4"
//     const uniqueFileName = `basketball-videos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

//     console.log("Generated filename:", uniqueFileName)

//     // Check if blob storage is available and working
//     if (!token || !token.startsWith("vercel_blob_rw_")) {
//       console.log("🎭 No valid blob token, using mock mode")
//       return createMockUploadResponse(file, timestamp)
//     }

//     // Try blob upload with comprehensive error handling
//     try {
//       console.log("🚀 Attempting blob upload...")
//       //const { put } = await import("@vercel/blob")

//       // Test connection first with a small upload
//       console.log("🧪 Testing blob connection...")
//       try {
//         const testData = "test-connection"
//         const testFileName = `test-${timestamp}.txt`
//         const testBlob = await put(testFileName, testData, {
//           access: "public",
//           addRandomSuffix: false,
//         })
//         console.log("✅ Blob connection test successful")

//         // Clean up test file
//         try {
//           //const { del } = await import("@vercel/blob")
//           await del(testBlob.url)
//           console.log("✅ Test cleanup successful")
//         } catch (cleanupError) {
//           console.warn("⚠️ Test cleanup failed (not critical)")
//         }
//       } catch (testError: any) {
//         console.error("❌ Blob connection test failed:", testError)
//         console.log("🎭 Falling back to mock mode due to connection test failure")
//         return createMockUploadResponse(file, timestamp)
//       }

//       // Convert file to buffer
//       console.log("Converting file to buffer...")
//       const arrayBuffer = await file.arrayBuffer()
//       const buffer = Buffer.from(arrayBuffer)
//       console.log("✅ File converted to buffer, size:", buffer.length)

//       // Upload the actual video with timeout and better error handling
//       console.log("Uploading video to Vercel Blob...")
//       try {
//         const uploadPromise = put(uniqueFileName, buffer, {
//           access: "public",
//           addRandomSuffix: false,
//           contentType: file.type || "video/mp4",
//         })

//         const timeoutPromise = new Promise(
//           (_, reject) => setTimeout(() => reject(new Error("Upload timeout after 120 seconds")), 120000), // Increased timeout for larger files
//         )

//         const blob = await Promise.race([uploadPromise, timeoutPromise])
//         console.log("✅ Blob upload successful:", blob.url)

//         // Verify the uploaded file is accessible
//         try {
//           console.log("🔍 Verifying uploaded file accessibility...")
//           const verifyResponse = await fetch(blob.url, {
//             method: "HEAD",
//             headers: {
//               "User-Agent": "HoopTuber-Verification/1.0",
//             },
//           })

//           if (!verifyResponse.ok) {
//             console.warn("⚠️ Uploaded file verification failed:", verifyResponse.status)
//             console.log("🎭 File not accessible, falling back to mock mode")
//             return createMockUploadResponse(file, timestamp)
//           } else {
//             console.log("✅ Uploaded file verified and accessible")
//           }
//         } catch (verifyError) {
//           console.warn("⚠️ File verification failed:", verifyError)
//           console.log("🎭 Verification failed, falling back to mock mode")
//           return createMockUploadResponse(file, timestamp)
//         }

//         const processingId = `upload_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

//         const result = {
//           success: true,
//           videoUrl: blob.url,
//           processingId,
//           fileName: file.name,
//           fileSize: file.size,
//           uploadedAt: new Date().toISOString(),
//           method: "vercel_blob",
//           verified: true,
//           blobInfo: {
//             url: blob.url,
//             pathname: blob.pathname,
//             size: blob.size,
//           },
//         }

//         console.log("✅ Upload completed successfully with verification")
//         return NextResponse.json(result)
//       } catch (uploadError: any) {
//         console.error("❌ Blob upload error:", uploadError)

//         // Check if the error response is not JSON (likely a server error)
//         if (uploadError.message && uploadError.message.includes("not valid JSON")) {
//           console.error("❌ Received non-JSON response from Blob API")
//           console.log("🎭 Falling back to mock mode due to Blob API response issue")
//           return createMockUploadResponse(file, timestamp)
//         }

//         // Handle quota/limit errors specifically
//         if (uploadError.message && (uploadError.message.includes("quota") || uploadError.message.includes("limit"))) {
//           console.error("❌ Blob storage quota exceeded")
//           console.log("🎭 Falling back to mock mode due to storage quota")
//           return createMockUploadResponse(file, timestamp)
//         }

//         // Handle other blob errors
//         const errorMessage = uploadError?.message || uploadError?.toString() || ""
//         console.error("Error details:", {
//           message: errorMessage,
//           name: uploadError?.name,
//           status: uploadError?.status,
//           cause: uploadError?.cause,
//         })

//         console.log("🎭 Falling back to mock mode due to blob upload error")
//         return createMockUploadResponse(file, timestamp)
//       }
//     } catch (blobError: any) {
//       console.error("❌ Blob upload failed:", blobError)

//       const errorMessage = blobError?.message || blobError?.toString() || ""
//       console.error("Error details:", {
//         message: errorMessage,
//         name: blobError?.name,
//         status: blobError?.status,
//         cause: blobError?.cause,
//       })

//       // Always fall back to mock mode for any blob error
//       console.log("🎭 Falling back to mock mode due to blob error")
//       return createMockUploadResponse(file, timestamp)
//     }
//   } catch (error) {
//     console.error("❌ General upload error:", error)

//     // Even for general errors, try to provide a mock response
//     const timestamp = Date.now()
//     if (error instanceof Error && error.message.includes("file")) {
//       return createMockUploadResponse(null, timestamp)
//     }

//     return NextResponse.json(
//       {
//         success: false,
//         error: error instanceof Error ? error.message : "Upload failed",
//         details:
//           process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
//       },
//       { status: 500 },
//     )
//   }
// }

// function createMockUploadResponse(file: File | null, timestamp: number) {
//   // Create a mock video URL that will work
//   const mockVideoUrl = `/api/mock-video/${timestamp}/${encodeURIComponent(file?.name || "basketball-game.mp4")}`

//   const mockResult = {
//     success: true,
//     videoUrl: mockVideoUrl,
//     processingId: `mock_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
//     fileName: file?.name || "basketball-game.mp4",
//     fileSize: file?.size || 25000000, // 25MB mock size
//     uploadedAt: new Date().toISOString(),
//     method: "mock_fallback",
//     verified: true,
//     note: "Using demo mode - analyzing your video with AI simulation",
//     setupUrl: "/setup-storage",
//     mockData: {
//       analysis: {
//         shots: [
//           {
//             timestamp: 15.2,
//             shotType: "jump_shot",
//             outcome: "made",
//             confidence: 0.92,
//             description: "Clean jump shot from the free throw line",
//           },
//           {
//             timestamp: 28.7,
//             shotType: "layup",
//             outcome: "made",
//             confidence: 0.88,
//             description: "Fast break layup",
//           },
//           {
//             timestamp: 45.1,
//             shotType: "three_pointer",
//             outcome: "missed",
//             confidence: 0.85,
//             description: "Three-point attempt from the corner",
//           },
//           {
//             timestamp: 62.3,
//             shotType: "dunk",
//             outcome: "made",
//             confidence: 0.95,
//             description: "Powerful slam dunk",
//           },
//           {
//             timestamp: 78.9,
//             shotType: "jump_shot",
//             outcome: "made",
//             confidence: 0.9,
//             description: "Mid-range jumper",
//           },
//           {
//             timestamp: 95.4,
//             shotType: "three_pointer",
//             outcome: "made",
//             confidence: 0.87,
//             description: "Corner three-pointer",
//           },
//           {
//             timestamp: 112.1,
//             shotType: "layup",
//             outcome: "missed",
//             confidence: 0.83,
//             description: "Contested layup attempt",
//           },
//           {
//             timestamp: 128.6,
//             shotType: "jump_shot",
//             outcome: "made",
//             confidence: 0.91,
//             description: "Fadeaway jumper",
//           },
//         ],
//         videoMetadata: {
//           duration: 145.8,
//           gameType: "scrimmage",
//           courtType: "indoor",
//           resolution: "1080p",
//           fps: 30,
//         },
//         basketDetection: {
//           basketsVisible: 2,
//           primaryBasket: { x: 0.85, y: 0.25 },
//           secondaryBasket: { x: 0.15, y: 0.75 },
//           confidence: 0.94,
//         },
//         gameStats: {
//           totalShots: 8,
//           madeShots: 6,
//           shootingPercentage: 75,
//           shotTypes: {
//             layups: 2,
//             jumpShots: 3,
//             threePointers: 2,
//             dunks: 1,
//           },
//           playerMovement: {
//             averageSpeed: 4.2,
//             maxSpeed: 8.7,
//             distanceCovered: 245.6,
//           },
//         },
//       },
//     },
//   }

//   console.log("🎭 Mock upload result created:", {
//     fileName: mockResult.fileName,
//     videoUrl: mockResult.videoUrl,
//     method: mockResult.method,
//     fileSize: file?.size ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : "unknown",
//   })

//   return NextResponse.json(mockResult)
// }
