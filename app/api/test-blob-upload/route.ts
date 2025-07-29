import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== BLOB UPLOAD TEST ===")

    // Check environment
    const token = process.env.BLOB_READ_WRITE_TOKEN
    console.log("Token exists:", !!token)
    console.log("Token length:", token?.length || 0)
    console.log("Token prefix:", token?.substring(0, 20) || "none")
    console.log("Node env:", process.env.NODE_ENV)
    console.log("Vercel env:", process.env.VERCEL_ENV)

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "No BLOB_READ_WRITE_TOKEN found",
        debug: { tokenExists: false },
      })
    }

    // Try to import blob
    console.log("Importing @vercel/blob...")
    const { put } = await import("@vercel/blob")
    console.log("Blob module imported successfully")

    // Create test data
    const testData = `Test upload at ${new Date().toISOString()}`
    const testFileName = `test-uploads/test-${Date.now()}.txt`

    console.log("Attempting test upload...")
    console.log("Filename:", testFileName)
    console.log("Data size:", testData.length)

    // Try the upload with detailed error catching
    const blob = await put(testFileName, testData, {
      access: "public",
      addRandomSuffix: false,
    })

    console.log("Upload successful!")
    console.log("Blob URL:", blob.url)
    console.log("Blob size:", blob.size)

    // Try to clean up
    try {
      const { del } = await import("@vercel/blob")
      await del(blob.url)
      console.log("Cleanup successful")
    } catch (cleanupError) {
      console.warn("Cleanup failed:", cleanupError)
    }

    return NextResponse.json({
      success: true,
      message: "Blob upload test successful",
      blobUrl: blob.url,
      blobSize: blob.size,
    })
  } catch (error: any) {
    console.error("=== BLOB TEST ERROR ===")
    console.error("Error message:", error.message)
    console.error("Error name:", error.name)
    console.error("Error status:", error.status)
    console.error("Error response:", error.response)
    console.error("Full error:", error)

    // Try to get more details from the error
    let errorDetails = {
      message: error.message,
      name: error.name,
      status: error.status,
      statusText: error.statusText,
      type: typeof error,
      toString: error.toString(),
    }

    // Check if it's a fetch error
    if (error.message?.includes("fetch")) {
      errorDetails = {
        ...errorDetails,
        fetchError: true,
        possibleCause: "Network or CORS issue",
      }
    }

    // Check if it's a JSON parsing error
    if (error.message?.includes("JSON") || error.message?.includes("Unexpected token")) {
      errorDetails = {
        ...errorDetails,
        jsonError: true,
        possibleCause: "API returned HTML instead of JSON - likely auth issue",
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errorDetails,
        troubleshooting: {
          steps: [
            "1. Check if BLOB_READ_WRITE_TOKEN is correct",
            "2. Verify blob store exists in Vercel dashboard",
            "3. Try regenerating the token",
            "4. Make sure you're using the right Vercel account",
          ],
        },
      },
      { status: 500 },
    )
  }
}
