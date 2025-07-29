import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      env: {},
      api: {},
      recommendations: [],
    }

    // Check environment variables
    const token = process.env.BLOB_READ_WRITE_TOKEN
    diagnostics.env = {
      tokenExists: !!token,
      tokenLength: token?.length || 0,
      tokenPrefix: token ? token.substring(0, 20) + "..." : "none",
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || "local",
    }

    // Test blob API connection
    try {
      if (token) {
        const { put } = await import("@vercel/blob")

        // Try a small test upload
        const testData = "test-blob-connection"
        const testFileName = `test/${Date.now()}-connection-test.txt`

        const blob = await put(testFileName, testData, {
          access: "public",
          addRandomSuffix: false,
        })

        diagnostics.api = {
          canConnect: true,
          testUploadUrl: blob.url,
          testUploadSize: blob.size,
        }

        // Clean up test file (optional)
        try {
          const { del } = await import("@vercel/blob")
          await del(blob.url)
          diagnostics.api.cleanupSuccessful = true
        } catch (cleanupError) {
          diagnostics.api.cleanupFailed = true
        }
      } else {
        diagnostics.api = {
          canConnect: false,
          error: "No BLOB_READ_WRITE_TOKEN found",
        }
      }
    } catch (apiError: any) {
      diagnostics.api = {
        canConnect: false,
        error: apiError.message || "Unknown API error",
        errorType: apiError.name || "Error",
      }
    }

    // Generate recommendations
    if (!diagnostics.env.tokenExists) {
      diagnostics.recommendations.push("Add BLOB_READ_WRITE_TOKEN to your environment variables")
      diagnostics.recommendations.push("Create a blob store in Vercel Dashboard → Storage → Blob")
    } else if (!diagnostics.api.canConnect) {
      diagnostics.recommendations.push("Check if your BLOB_READ_WRITE_TOKEN is valid")
      diagnostics.recommendations.push("Verify the blob store exists in your Vercel dashboard")
      diagnostics.recommendations.push("Try regenerating the token in Vercel dashboard")
    } else {
      diagnostics.recommendations.push("✅ Blob storage is configured correctly!")
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
