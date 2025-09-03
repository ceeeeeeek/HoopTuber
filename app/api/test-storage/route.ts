// app/api/test-storage/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Testing storage configuration...");

    // Basic environment diagnostics (no Vercel/Blob references)
    const environment = process.env.NODE_ENV ?? "development";

    // Keep your unique path pattern (using slice instead of deprecated substr)
    const uniqueFileName = `test/storage-test-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}.txt`;

    // Tiny “test file” content
    const testContent = `Storage test at ${new Date().toISOString()} (${uniqueFileName})`;

    // No external storage yet → return a data URL so callers still receive a URL-like value
    const testUrl = `data:text/plain;base64,${Buffer.from(testContent).toString("base64")}`;

    return NextResponse.json({
      success: true,
      message: "Storage diagnostics (mock mode). External storage is not configured.",
      testUrl, // placeholder you can swap for a real uploaded object's URL later
      diagnostics: {
        environment,
        nodeVersion: process.version,
        storageConfigured: false,
        storageProvider: null,
        examplePlannedPath: uniqueFileName,
      },
    });
  } catch (error) {
    console.error("Storage test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Storage test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        environment: process.env.NODE_ENV,
      },
      { status: 500 },
    );
  }
}
//Note: When you add S3/R2/Firebase later, you’ll just replace the data-URL section with a real upload and keep the rest.


// import { NextResponse } from "next/server"

// export async function GET() {
//   try {
//     console.log("Testing storage configuration...")

//     // Check environment variables
//     const hasToken = !!process.env.//BLOB_READ_WRITE_TOKEN
//     //const tokenLength = process.env.//BLOB_READ_WRITE_TOKEN?.length || 0

//     console.log("Environment check:")
//     //console.log("- //BLOB_READ_WRITE_TOKEN exists:", hasToken)
//     console.log("- Token length:", tokenLength)

//     if (!hasToken) {
//       return NextResponse.json({
//         success: false,
//         //error: "//BLOB_READ_WRITE_TOKEN not configured",
//         environment: process.env.NODE_ENV,
//         hasToken: false,
//         recommendation: "Add //BLOB_READ_WRITE_TOKEN to your environment variables",
//       })
//     }

//     // Try to import and test blob module
//     try {
//       //const { put } = await import("@vercel/blob")
//       console.log("Blob module imported successfully")

//       // Test with a very small file
//       const testContent = `Storage test at ${new Date().toISOString()}`
//       const uniqueFileName = `test/storage-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`

//       console.log("Attempting test upload...")
//       const testBlob = await put(uniqueFileName, testContent, {
//         access: "public",
//         addRandomSuffix: true,
//       })

//       console.log("Test upload successful:", testBlob.url)

//       return NextResponse.json({
//         success: true,
//         message: "✅ Blob storage is working perfectly!",
//         testUrl: testBlob.url,
//         environment: process.env.NODE_ENV,
//         hasToken: true,
//         tokenLength,
//         //note: "Your //BLOB_READ_WRITE_TOKEN is configured correctly",
//       })
//     } catch (blobError: any) {
//       console.error("Blob operation failed:", blobError)

//       // Parse the error more carefully
//       let errorMessage = "Unknown blob error"
//       let errorDetails = {}

//       if (blobError instanceof Error) {
//         errorMessage = blobError.message
//         errorDetails = {
//           name: blobError.name,
//           stack: blobError.stack?.split("\n").slice(0, 3), // First 3 lines of stack
//         }
//       }

//       // Check for specific error patterns
//       if (errorMessage.includes("Request En") || errorMessage.includes("Unexpected token")) {
//         errorMessage = "Blob API returned HTML instead of JSON - possible authentication or network issue"
//       }

//       return NextResponse.json({
//         success: false,
//         error: "Blob storage operation failed",
//         details: errorMessage,
//         errorDetails,
//         environment: process.env.NODE_ENV,
//         hasToken: true,
//         tokenLength,
//         //recommendation: "Check if your //BLOB_READ_WRITE_TOKEN is valid and has correct permissions",
//       })
//     }
//   } catch (error) {
//     console.error("Storage test failed:", error)

//     return NextResponse.json({
//       success: false,
//       error: "Storage test failed",
//       details: error instanceof Error ? error.message : "Unknown error",
//       environment: process.env.NODE_ENV,
//       recommendation: "Check your environment configuration and network connection",
//     })
//   }
// }
