// app/api/test-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/** Helper to return a data URL in lieu of real storage */
function toDataUrl(mime: string, data: string | Buffer) {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function GET() {
  try {
    // Simulate “upload” by producing a data URL
    const testContent = `Test upload at ${new Date().toISOString()}`;
    const testUrl = toDataUrl("text/plain", testContent);

    return NextResponse.json({
      success: true,
      message: "Storage test (no external provider) is working!",
      testUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test upload failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      },
      { status: 500 }
    );
  }
}
//NOTE: 
//The only change is replacing the old put(...) call with a local data-URL so you can deploy without any storage provider.
//When you switch to S3/R2/Firebase later, just set testUrl to the uploaded object’s URL and keep everything else the same.

// import { NextResponse } from "next/server"
// //import { put } from "@vercel/blob"

// export async function GET() {
//   try {
//     // Test if blob storage is working
//     const testContent = `Test upload at ${new Date().toISOString()}`
//     const testBlob = await put("test-uploads/test.txt", testContent, {
//       access: "public",
//     })

//     return NextResponse.json({
//       success: true,
//       message: "Blob storage is working!",
//       testUrl: testBlob.url,
//       timestamp: new Date().toISOString(),
//     })
//   } catch (error) {
//     console.error("Test upload failed:", error)
//     return NextResponse.json(
//       {
//         success: false,
//         error: error instanceof Error ? error.message : "Test failed",
//         //hasToken: !!process.env.//BLOB_READ_WRITE_TOKEN,
//       },
//       { status: 500 },
//     )
//   }
// }
