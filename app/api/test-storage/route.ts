import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Testing storage configuration...")

    // Check environment variables
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
    const tokenLength = process.env.BLOB_READ_WRITE_TOKEN?.length || 0

    console.log("Environment check:")
    console.log("- BLOB_READ_WRITE_TOKEN exists:", hasToken)
    console.log("- Token length:", tokenLength)

    if (!hasToken) {
      return NextResponse.json({
        success: false,
        error: "BLOB_READ_WRITE_TOKEN not configured",
        environment: process.env.NODE_ENV,
        hasToken: false,
        recommendation: "Add BLOB_READ_WRITE_TOKEN to your environment variables",
      })
    }

    // Try to import and test blob module
    try {
      const { put } = await import("@vercel/blob")
      console.log("Blob module imported successfully")

      // Test with a very small file
      const testContent = `Storage test at ${new Date().toISOString()}`
      const uniqueFileName = `test/storage-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`

      console.log("Attempting test upload...")
      const testBlob = await put(uniqueFileName, testContent, {
        access: "public",
        addRandomSuffix: true,
      })

      console.log("Test upload successful:", testBlob.url)

      return NextResponse.json({
        success: true,
        message: "✅ Blob storage is working perfectly!",
        testUrl: testBlob.url,
        environment: process.env.NODE_ENV,
        hasToken: true,
        tokenLength,
        note: "Your BLOB_READ_WRITE_TOKEN is configured correctly",
      })
    } catch (blobError: any) {
      console.error("Blob operation failed:", blobError)

      // Parse the error more carefully
      let errorMessage = "Unknown blob error"
      let errorDetails = {}

      if (blobError instanceof Error) {
        errorMessage = blobError.message
        errorDetails = {
          name: blobError.name,
          stack: blobError.stack?.split("\n").slice(0, 3), // First 3 lines of stack
        }
      }

      // Check for specific error patterns
      if (errorMessage.includes("Request En") || errorMessage.includes("Unexpected token")) {
        errorMessage = "Blob API returned HTML instead of JSON - possible authentication or network issue"
      }

      return NextResponse.json({
        success: false,
        error: "Blob storage operation failed",
        details: errorMessage,
        errorDetails,
        environment: process.env.NODE_ENV,
        hasToken: true,
        tokenLength,
        recommendation: "Check if your BLOB_READ_WRITE_TOKEN is valid and has correct permissions",
      })
    }
  } catch (error) {
    console.error("Storage test failed:", error)

    return NextResponse.json({
      success: false,
      error: "Storage test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      environment: process.env.NODE_ENV,
      recommendation: "Check your environment configuration and network connection",
    })
  }
}
