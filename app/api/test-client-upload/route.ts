import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if Vercel Blob is configured
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN

    // Check if we're running in a Vercel environment
    const isVercelEnvironment = !!process.env.VERCEL

    // Check if we can import the Vercel Blob client
    let canImportBlob = false
    try {
      // Just check if we can import it, don't actually use it
      await import("@vercel/blob")
      canImportBlob = true
    } catch (e) {
      console.error("Failed to import @vercel/blob:", e)
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        blobConfigured,
        isVercelEnvironment,
        canImportBlob,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
      },
      message: "Client upload test endpoint",
    })
  } catch (error) {
    console.error("Test client upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
