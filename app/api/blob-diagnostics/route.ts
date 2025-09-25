// app/api/blob-diagnostics/route.ts
import { type NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest) {
  try {
    const diagnostics: {
      timestamp: string
      env: {
        nodeEnv: string | undefined
        storageProvider: string
        storageConfigured: boolean
        // expose only non-sensitive hints
        hints: Record<string, boolean>
      }
      api: {
        canConnect: boolean
        note?: string
        error?: string
        errorType?: string
      }
      recommendations: string[]
    } = {
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        // You can set this in .env.local later (e.g. "s3" | "r2" | "firebase")
        storageProvider: process.env.STORAGE_PROVIDER ?? "mock",
        // Heuristic: if any common vars exist, we say “configured”
        storageConfigured: Boolean(
          process.env.STORAGE_PROVIDER ||
            process.env.S3_BUCKET ||
            process.env.R2_ACCOUNT_ID ||
            process.env.FIREBASE_PROJECT_ID
        ),
        hints: {
          hasS3Bucket: Boolean(process.env.S3_BUCKET),
          hasR2Account: Boolean(process.env.R2_ACCOUNT_ID),
          hasFirebaseProject: Boolean(process.env.FIREBASE_PROJECT_ID),
        },
      },
      api: {
        canConnect: false,
        note:
          "No storage SDK wired up in this environment. Using demo/mock mode until you integrate S3/R2/Firebase.",
      },
      recommendations: [],
    }

    // If you later add an SDK, do a tiny connectivity test here.
    // --- Example scaffold (leave commented until you install an SDK) ---
    // if (diagnostics.env.storageProvider === "s3") {
    //   try {
    //     const s3 = new S3Client({ region: process.env.S3_REGION })
    //     await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET! }))
    //     diagnostics.api.canConnect = true
    //     diagnostics.api.note = "S3 reachable"
    //   } catch (e: any) {
    //     diagnostics.api.error = e?.message ?? "Unknown S3 error"
    //     diagnostics.api.errorType = e?.name ?? "Error"
    //   }
    // }

    if (!diagnostics.env.storageConfigured) {
      diagnostics.recommendations.push(
        "Set STORAGE_PROVIDER (e.g., 's3' | 'r2' | 'firebase') in .env.local.",
        "Add the required credentials for your provider (e.g., S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY).",
        "Wire up a minimal connectivity check in this route once the SDK is installed."
      )
    } else if (!diagnostics.api.canConnect) {
      diagnostics.recommendations.push(
        "Install and configure the provider SDK, then replace the commented scaffold with a real ping."
      )
    } else {
      diagnostics.recommendations.push("✅ Storage configuration detected and reachable.")
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Diagnostics failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
//NOTE:
//



// import { type NextRequest, NextResponse } from "next/server"

// export async function GET(request: NextRequest) {
//   try {
//     const diagnostics: any = {
//       timestamp: new Date().toISOString(),
//       env: {},
//       api: {},
//       recommendations: [],
//     }

//     // Check environment variables
//     const token = process.env.BLOB_READ_WRITE_TOKEN
//     diagnostics.env = {
//       tokenExists: !!token,
//       tokenLength: token?.length || 0,
//       tokenPrefix: token ? token.substring(0, 20) + "..." : "none",
//       nodeEnv: process.env.NODE_ENV,
//       vercelEnv: process.env.VERCEL_ENV || "local",
//     }

//     // Test blob API connection
//     try {
//       if (token) {
//         const { put } = await import("@vercel/blob")

//         // Try a small test upload
//         const testData = "test-blob-connection"
//         const testFileName = `test/${Date.now()}-connection-test.txt`

//         const blob = await put(testFileName, testData, {
//           access: "public",
//           addRandomSuffix: false,
//         })

//         diagnostics.api = {
//           canConnect: true,
//           testUploadUrl: blob.url,
//           testUploadSize: blob.size,
//         }

//         // Clean up test file (optional)
//         try {
//           const { del } = await import("@vercel/blob")
//           await del(blob.url)
//           diagnostics.api.cleanupSuccessful = true
//         } catch (cleanupError) {
//           diagnostics.api.cleanupFailed = true
//         }
//       } else {
//         diagnostics.api = {
//           canConnect: false,
//           error: "No BLOB_READ_WRITE_TOKEN found",
//         }
//       }
//     } catch (apiError: any) {
//       diagnostics.api = {
//         canConnect: false,
//         error: apiError.message || "Unknown API error",
//         errorType: apiError.name || "Error",
//       }
//     }

//     // Generate recommendations
//     if (!diagnostics.env.tokenExists) {
//       diagnostics.recommendations.push("Add BLOB_READ_WRITE_TOKEN to your environment variables")
//       diagnostics.recommendations.push("Create a blob store in Vercel Dashboard → Storage → Blob")
//     } else if (!diagnostics.api.canConnect) {
//       diagnostics.recommendations.push("Check if your BLOB_READ_WRITE_TOKEN is valid")
//       diagnostics.recommendations.push("Verify the blob store exists in your Vercel dashboard")
//       diagnostics.recommendations.push("Try regenerating the token in Vercel dashboard")
//     } else {
//       diagnostics.recommendations.push("✅ Blob storage is configured correctly!")
//     }

//     return NextResponse.json(diagnostics)
//   } catch (error) {
//     return NextResponse.json(
//       {
//         error: "Diagnostics failed",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     )
//   }
// }
