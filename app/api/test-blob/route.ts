// app/api/test-blob/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/** Tiny helper to create a data URL (no remote storage needed) */
function toDataUrl(mime: string, data: string | Buffer) {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function GET() {
  try {
    console.log("Testing storage (no external blob service)...");

    // // Check if environment variable exists
    // //const token = process.env.//BLOB_READ_WRITE_TOKEN
    // console.log("Token exists:", !!token)
    // console.log("Token length:", token?.length || 0)

    // Previously: checked BLOB_READ_WRITE_TOKEN.
    // Now: surface whether a Google AI key is configured for Gemini 2.5 Pro.
    const googleApiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;
    const aiConfigured = !!googleApiKey;

    // Test creating a simple file
    // const testContent = `Test file created at ${new Date().toISOString()}`
    // const testBlob = await put(`test/test-file-${Date.now()}.txt`, testContent, {
    //   access: "public",
    //   addRandomSuffix: true,
    // })

    // --- Create a "test file" (was: put(...)) ---
    const testContent = `Test file created at ${new Date().toISOString()}\nEnvironment: ${process.env.NODE_ENV}`;
    const testFileUrl = toDataUrl("text/plain", testContent);

    //console.log("Test file created:", testBlob.url)
    console.log("Test file (data URL) created.");

    // // Test listing files
    // const { blobs } = await list({
    //   limit: 5,
    // })


    // --- "List files" (was: list({ limit: 5 })) ---
    // With no storage, we return a mocked list length.
    const existingBlobs = 0; // change later when real storage is added

   //console.log("Found blobs:", blobs.length)

  //   return NextResponse.json({
  //     success: true,
  //     message: "Blob storage is working correctly!",
  //     testFile: testBlob.url,
  //     existingBlobs: blobs.length,
  //     tokenConfigured: !!token,
  //     environment: process.env.NODE_ENV,
  //   })
  // } catch (error) {
  //   console.error("Blob storage test failed:", error)


  return NextResponse.json({
    success: true,
    message: "No-storage self-test OK. Vercel Blob removed.",
    testFile: testFileUrl, // click/previewable data URL
    existingBlobs,
    storage: "none",
    aiModel: "gemini-2.5-pro",
    aiConfigured,
    environment: process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
  });
} catch (error) {
  console.error("Storage self-test failed:", error);

  // Keep the old "retry with a unique name" spirit by regenerating the data quickly
  try {
      const fallbackContent = `Fallback test file at ${new Date().toISOString()}`;
      const fallbackUrl = toDataUrl("text/plain", fallbackContent);

      return NextResponse.json({
        success: true,
        message: "Self-test recovered with fallback content.",
        testFile: fallbackUrl,
        existingBlobs: 0,
        storage: "none",
        aiModel: "gemini-2.5-pro",
        aiConfigured: !!(
          process.env.GOOGLE_API_KEY ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GOOGLE_AI_API_KEY ||
          process.env.GEMINI_API_KEY
        ),
        environment: process.env.NODE_ENV ?? "unknown",
        recovered: true,
      });
    } catch (retryError) {
      return NextResponse.json(
        {
          success: false,
          error: retryError instanceof Error ? retryError.message : "Unknown error",
          environment: process.env.NODE_ENV ?? "unknown",
        },
        { status: 500 }
      );
    }
  }
}
//NOTE: When you choose a real storage later (S3/R2/Firebase, etc.), replace the data-URL creation with your uploader, and swap existingBlobs for an actual listing call—no other structural changes needed.
