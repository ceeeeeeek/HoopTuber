import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if blob token is available
    const token = process.env.BLOB_READ_WRITE_TOKEN || ""
    const tokenLength = token.length
    const tokenPrefix = token.startsWith("vercel_blob_rw_") ? "vercel_blob_rw_" : token.substring(0, 10)

    // Check other environment variables
    const nodeEnv = process.env.NODE_ENV || "unknown"
    const vercelEnv = process.env.VERCEL_ENV || null
    const isVercel = !!process.env.VERCEL || !!vercelEnv

    return NextResponse.json({
      hasToken: tokenLength > 0,
      tokenLength,
      tokenPrefix,
      nodeEnv,
      vercelEnv,
      isVercel,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Environment check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
