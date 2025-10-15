// app/api/test-blob-upload/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("=== BLOB UPLOAD TEST (no-storage mode) ===");

    // Environment (kept minimal; no Vercel-specific checks)
    console.log("Node env:", process.env.NODE_ENV);

    // Create test data (preserved)
    const testData = `Test upload at ${new Date().toISOString()}`;
    const testFileName = `test-uploads/test-${Date.now()}.txt`;
    console.log("Attempting test upload...");
    console.log("Filename:", testFileName);
    console.log("Data size:", testData.length);

    // if (!token) {
    //   return NextResponse.json({
    //     success: false,
    //     //error: "No //BLOB_READ_WRITE_TOKEN found",
    //     debug: { tokenExists: false },
    //   })
    // }

    // Try to import blob
    //console.log("Importing @vercel/blob...")
    //const { put } = await import("@vercel/blob")
    //console.log("Blob module imported successfully")

    // ---- No storage: simulate an "upload" with a data URL ----
    const uploadedUrl = `data:text/plain;base64,${Buffer.from(testData).toString("base64")}`;
    const uploadedSize = Buffer.byteLength(testData);
    //Replace when you add real storage later
    //with your provider upload call (e.g., S3 PutObjectCommand), then set:
    //const uploadedUrl = <providerReturnedUrl>;
    //const uploadedSize = <contentLengthReturnedOrKnown>;


    // Create test data
    //const testData = `Test upload at ${new Date().toISOString()}`
    //const testFileName = `test-uploads/test-${Date.now()}.txt`

    //console.log("Attempting test upload...")
    //console.log("Filename:", testFileName)
    //console.log("Data size:", testData.length)

    // Cleanup step kept (but skipped since there’s no remote object)
    try {
      // (no-op) — when you add real storage later, delete the temp object here
      console.log("Cleanup skipped (no remote storage in use)");
    } catch (cleanupError) {
      console.warn("Cleanup step reported:", cleanupError);
    }

    // // Try the upload with detailed error catching
    // const blob = await put(testFileName, testData, {
    //   access: "public",
    //   addRandomSuffix: false,
    // })

    // console.log("Upload successful!")
    // console.log("Blob URL:", blob.url)
    // console.log("Blob size:", blob.size)

    // // Try to clean up
    // try {
    //   //const { del } = await import("@vercel/blob")
    //   await del(blob.url)
    //   console.log("Cleanup successful")
    // } catch (cleanupError) {
    //   console.warn("Cleanup failed:", cleanupError)
    // }

    // return NextResponse.json({
    //   success: true,
    //   message: "Blob upload test successful",
    //   blobUrl: blob.url,
    //   blobSize: blob.size,
    // })

    return NextResponse.json({
      success: true,
      message: "Mock upload test successful (data URL returned)",
      // mirrors your old shape, just renamed to clarify it's not a blob:
      blobUrl: uploadedUrl,
      blobSize: uploadedSize,
      fileName: testFileName,
      mock: true,
    });
  } catch (error: unknown) {
    // Keep your detailed error logging
    const err = error as
      | (Error & { status?: unknown; statusText?: unknown; response?: unknown })
      | undefined;

    console.error("=== BLOB TEST ERROR ===");
    console.error("Error message:", err?.message);
    console.error("Error name:", err?.name);
    console.error("Error status:", (err as any)?.status);
    console.error("Error response:", (err as any)?.response);
    console.error("Full error:", err);

    // Make errorDetails flexible so extra flags like fetchError/jsonError don’t cause TS errors
    let errorDetails: Record<string, unknown> = {
      message: err?.message,
      name: err?.name,
      status: (err as any)?.status,
      statusText: (err as any)?.statusText,
      type: typeof err,
      toString: String(err),
    };

    // Keep your helpful flags; types are now permissive
    if (err?.message?.includes("fetch")) {
      errorDetails = {
        ...errorDetails,
        fetchError: true,
        possibleCause: "Network or CORS issue",
      };
    }

    if (err?.message?.includes("JSON") || err?.message?.includes("Unexpected token")) {
      errorDetails = {
        ...errorDetails,
        jsonError: true,
        possibleCause: "API returned HTML instead of JSON - likely auth issue",
      };
    }

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
        errorDetails,
        troubleshooting: {
          steps: [
            "1. Verify the API route is reachable from your client",
            "2. Check server logs for network/CORS failures",
            "3. If using a proxy locally, confirm it isn’t rewriting requests",
            "4. When you add real storage, ensure credentials and bucket/container exist",
          ],
        },
      },
      { status: 500 },
    );
  }
}

//NOTE:
//---- No storage: simulate an "upload" with a data URL ----
//const uploadedUrl = `data:text/plain;base64,${Buffer.from(testData).toString("base64")}`;
//const uploadedSize = Buffer.byteLength(testData);
//REPLACE THESE 2 LINES when you add real storage later
//with your provider upload call (e.g., S3 PutObjectCommand), then set:
//const uploadedUrl = <providerReturnedUrl>;
//const uploadedSize = <contentLengthReturnedOrKnown>
