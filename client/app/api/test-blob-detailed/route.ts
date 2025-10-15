// app/api/test-blob-detailed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

function toDataUrl(mime: string, data: string | Buffer) {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function GET() {
  try {
    console.log("Running detailed storage diagnostics (no external blob)...");

    // Environment diagnostics (kept)
    const environment = process.env.NODE_ENV ?? "unknown";
    const runtime =
      typeof process.release !== "undefined" ? process.release.name : "unknown";

    // Check if blob token is available
    //const token = process.env.//BLOB_READ_WRITE_TOKEN
    //const hasToken = !!token
    //const tokenLength = token?.length || 0

    // console.log("Environment check:")
    // console.log("- NODE_ENV:", environment)
    // console.log("- Is Vercel:", isVercel)
    // console.log("- Runtime:", runtime)
    // //console.log("- //BLOB_READ_WRITE_TOKEN exists:", hasToken)
    // console.log("- Token length:", tokenLength)

    // if (!hasToken) {
    //   return NextResponse.json({
    //     success: false,
    //     //error: "//BLOB_READ_WRITE_TOKEN not configured",
    //     environment,
    //     runtime,
    //     isVercel,
    //     hasToken: false,
    //     //recommendation: "Add //BLOB_READ_WRITE_TOKEN to your environment variables",
    //   })
    // }

    // // Try to import and test blob module
    // try {
    //   //const { put } = await import("@vercel/blob")
    //   console.log("Blob module imported successfully")

    // Since we removed Vercel Blob, report that external storage is not configured
    const storageConfigured = false;
    const storageProvider = "none";

    // --- Simulated "test upload" (replacement for put(...)) ---
    const testContent = `Storage test at ${new Date().toISOString()}`;
    const uniqueFileName = `test/detailed-test-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}.txt`; // .substr -> .slice

    // Create a data URL so callers can still preview/download something
    const testUrl = toDataUrl("text/plain", testContent);

      // console.log("Attempting test upload...")
      // const testBlob = await put(uniqueFileName, testContent, {
      //   access: "public",
      //   addRandomSuffix: true,
      // })

      //console.log("Test upload successful:", testBlob.url)

      console.log("Simulated upload OK:", { uniqueFileName, length: testContent.length });


//       return NextResponse.json({
//         success: true,
//         message: "✅ Blob storage is working perfectly!",
//         testUrl: testBlob.url,
//         environment,
//         runtime,
//         isVercel,
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
//           message: blobError.message,
//           stack: blobError.stack?.split("\n").slice(0, 5), // First 5 lines of stack
//           cause: blobError.cause,
//         }
//       }

//       // Check for specific error patterns
//       if (errorMessage.includes("Request En") || errorMessage.includes("Unexpected token")) {
//         errorMessage = "Blob API returned HTML instead of JSON - possible authentication issue"
//       } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
//         //errorMessage = "Invalid or expired //BLOB_READ_WRITE_TOKEN"
//       } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
//         //errorMessage = "//BLOB_READ_WRITE_TOKEN lacks required permissions"
//       } else if (errorMessage.includes("404")) {
//         errorMessage = "Blob store not found - may need to create it in Vercel dashboard"
//       } else if (errorMessage.includes("429")) {
//         errorMessage = "Rate limit exceeded - try again in a moment"
//       } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
//         errorMessage = "Network error - check your internet connection"
//       }

//       return NextResponse.json({
//         success: false,
//         error: errorMessage,
//         errorDetails,
//         environment,
//         runtime,
//         isVercel,
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

    return NextResponse.json({
      success: true,
      message:
        "✅ Diagnostics ran without external blob storage. Using in-memory data URL.",
      testUrl, // usable in <a href> or fetch
      filename: uniqueFileName,
      environment,
      runtime,
      storageConfigured,
      storageProvider,
    });
  } catch (error) {
    console.error("Storage diagnostics failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        environment: process.env.NODE_ENV ?? "unknown",
        recommendation:
          "If you want real URLs, wire up S3/R2/Firebase later and swap the data URL for the uploaded object URL.",
      },
      { status: 500 }
    );
  }
}
//NOTE: When you later choose a real storage (S3/R2/Firebase), replace the simulated section with your uploader, return the real object URL in testUrl, and keep the rest intact
