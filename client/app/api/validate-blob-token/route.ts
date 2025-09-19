// app/api/validate-blob-token/route.ts
import { type NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest) {
  try {
    // No storage provider configured yet; this is a no-op diagnostics response.
    const validation = {
      tokenExists: false as const,
      tokenLength: 0,
      tokenFormat: false as const,
      tokenPrefix: null as string | null,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        runtime: typeof process.release !== "undefined" ? process.release.name : undefined,
      },
      storage: {
        provider: null as null | "s3" | "r2" | "firebase",
        mode: "demo" as const,
      },
    }

    console.log("Storage validation (no-op):", validation)

    return NextResponse.json({
      valid: true,
      message:
        "Validation is a no-op. Configure a storage provider (S3/R2/Firebase, etc.) to enable real checks.",
      validation,
    })
  } catch (error) {
    console.error("Validation failed:", error)
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
//NOTE:
//The endpoint always returns valid: true with a clear message that storage is in demo mode until you hook up S3/R2/Firebase, etc.
//When you switch to a real storage provider, you can repurpose this endpoint to validate that provider’s credentials instead of the old Vercel token.




// import { type NextRequest, NextResponse } from "next/server"

// export async function GET(request: NextRequest) {
//   try {
//     //const token = process.env.//BLOB_READ_WRITE_TOKEN

//     const validation = {
//       tokenExists: !!token,
//       tokenLength: token?.length || 0,
//       tokenFormat: token?.startsWith("vercel_blob_rw_") || false,
//       tokenPrefix: token?.substring(0, 25) || "none",
//       environment: {
//         nodeEnv: process.env.NODE_ENV,
//         vercelEnv: process.env.VERCEL_ENV,
//       },
//     }

//     console.log("Token validation:", validation)

//     if (!token) {
//       return NextResponse.json({
//         valid: false,
//         //error: "//BLOB_READ_WRITE_TOKEN not found",
//         validation,
//         //recommendation: "Add //BLOB_READ_WRITE_TOKEN to your .env.local file",
//       })
//     }

//     if (!token.startsWith("vercel_blob_rw_")) {
//       return NextResponse.json({
//         valid: false,
//         error: "Invalid token format",
//         validation,
//         recommendation: "Token should start with 'vercel_blob_rw_'",
//       })
//     }

//     // Test the token with a minimal operation
//     try {
//       //const { put } = await import("@vercel/blob")

//       const testData = `token-test-${Date.now()}`
//       const testFileName = `token-validation/test-${Date.now()}.txt`

//       const blob = await put(testFileName, testData, {
//         access: "public",
//         addRandomSuffix: false,
//       })

//       // Clean up
//       try {
//         //const { del } = await import("@vercel/blob")
//         await del(blob.url)
//       } catch (cleanupError) {
//         console.warn("Cleanup failed:", cleanupError)
//       }

//       return NextResponse.json({
//         valid: true,
//         message: "Token is working correctly",
//         validation,
//         testResult: {
//           success: true,
//           testUrl: blob.url,
//         },
//       })
//     } catch (testError: any) {
//       console.error("Token test failed:", testError)

//       return NextResponse.json({
//         valid: false,
//         error: "Token test failed",
//         validation,
//         testError: {
//           message: testError.message,
//           type: testError.name,
//         },
//         recommendation: "Get a fresh token from Vercel Dashboard → Storage → Blob",
//       })
//     }
//   } catch (error) {
//     return NextResponse.json(
//       {
//         valid: false,
//         error: "Validation failed",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     )
//   }
// }
