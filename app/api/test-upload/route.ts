import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function GET() {
  try {
    // Test if blob storage is working
    const testContent = `Test upload at ${new Date().toISOString()}`
    const testBlob = await put("test-uploads/test.txt", testContent, {
      access: "public",
    })

    return NextResponse.json({
      success: true,
      message: "Blob storage is working!",
      testUrl: testBlob.url,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test upload failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      },
      { status: 500 },
    )
  }
}
