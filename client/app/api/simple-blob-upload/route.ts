// app/api/simple-blob-upload/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

// Helper: Buffer -> data URL (so we can return a URL without storage)
function bufferToDataUrl(buf: Buffer, mime = "video/mp4") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log("Simple blob upload (no-storage) API called");

    // Parse the form data safely
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
    // Pull fields
    const file = formData.get("video") as File | null;
    const filename = (formData.get("filename") as string) || "";
    const contentType = (formData.get("contentType") as string) || "";

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No video file provided",
        },
        { status: 400 },
      );
    }

    // console.log("File details:", {
    //   name: file.name,
    //   size: file.size,
    //   type: file.type,
    //   providedFilename: filename,
    //   providedContentType: contentType,
    // })

    // Validate file type and size
    const allowedTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/quicktime",
      "video/x-msvideo",
    ];
    const fileType = file.type || contentType || "video/mp4";

    const isAllowed =
      allowedTypes.includes(fileType) ||
      // fallback: allow if extension matches common ones
      /\.(mp4|mov|avi)$/i.test(filename || file.name || "");    
    
      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file type: ${fileType}. Please upload MP4, MOV, or AVI files.`,
          },
          { status: 400 }
        );
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if ((file.size ?? 0) > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error: `File too large: ${((file.size ?? 0) / 1024 / 1024).toFixed(
              2
            )}MB. Maximum size is 100MB.`,
          },
          { status: 400 }
        );
      }

      // Generate unique filename with timestamp (kept from your flow)
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).slice(2, 11);
      const fileNameBase = filename || file.name || "video.mp4";
      const fileExtension = fileNameBase.split(".").pop() || "mp4";
      const uniqueFileName = `basketball-videos/${timestamp}-${uniqueId}.${fileExtension}`;


      console.log("Generated filename:", uniqueFileName);

    // try {
    //   // Upload to Vercel Blob using server-side API
    //   console.log("Uploading to Vercel Blob...")
    //   const blob = await put(uniqueFileName, file, {
    //     access: "public",
    //     contentType: fileType,
    //   })

    //   console.log("Upload successful:", blob)

      // No storage: turn the uploaded File into a data URL
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const videoUrl = bufferToDataUrl(buffer, fileType || "video/mp4");

      // Generate processing ID
      const processingId = `proc_${timestamp}_${Math.random().toString(36).slice(2, 11)}`;

      const result = {
        success: true,
        // When you switch to real storage, replace the next line with the uploaded object's URL
        videoUrl,
        processingId,
        fileName: fileNameBase,
        fileSize: file.size ?? buffer.length,
        uploadedAt: new Date().toISOString(),
        method: "simple_blob_upload_no_storage",
        // kept shape similar to your original blobInfo block, but local-only
        blobInfo: {
          url: videoUrl,
          pathname: uniqueFileName,
          size: file.size ?? buffer.length,
          contentType: fileType,
        },
      };

//       return NextResponse.json(result)
//     } catch (blobError) {
//       console.error("Blob upload error:", blobError)
//       return NextResponse.json(
//         {
//           success: false,
//           error: `Blob upload failed: ${blobError instanceof Error ? blobError.message : "Unknown blob error"}`,
//           details: blobError instanceof Error ? blobError.stack : undefined,
//         },
//         { status: 500 },
//       )
//     }
//   } catch (error) {
//     console.error("Simple blob upload error:", error)
//     return NextResponse.json(
//       {
//         success: false,
//         error: error instanceof Error ? error.message : "Failed to upload video",
//         details: error instanceof Error ? error.stack : undefined,
//       },
//       { status: 500 },
//     )
//   }
// }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Simple blob upload error:", error);
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

//NOTE: Later, when you add real storage, only replace the videoUrl (and optionally blobInfo) with your uploaded object’s URL; the rest of the response can stay intact.
