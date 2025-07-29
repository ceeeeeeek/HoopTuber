import { NextResponse } from "next/server"
import { put, list } from "@vercel/blob"

export async function GET() {
  try {
    console.log("Testing blob storage...")

    // Check if environment variable exists
    const token = process.env.BLOB_READ_WRITE_TOKEN
    console.log("Token exists:", !!token)
    console.log("Token length:", token?.length || 0)

    // Test creating a simple file
    const testContent = `Test file created at ${new Date().toISOString()}`
    const testBlob = await put(`test/test-file-${Date.now()}.txt`, testContent, {
      access: "public",
      addRandomSuffix: true,
    })

    console.log("Test file created:", testBlob.url)

    // Test listing files
    const { blobs } = await list({
      limit: 5,
    })

    console.log("Found blobs:", blobs.length)

    return NextResponse.json({
      success: true,
      message: "Blob storage is working correctly!",
      testFile: testBlob.url,
      existingBlobs: blobs.length,
      tokenConfigured: !!token,
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    console.error("Blob storage test failed:", error)

    // Check if it's just a "file already exists" error
    if (error instanceof Error && error.message.includes("blob already exists")) {
      // Try again with a unique filename
      try {
        const uniqueTestContent = `Test file created at ${new Date().toISOString()}`
        const uniqueTestBlob = await put(
          `test/test-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`,
          uniqueTestContent,
          {
            access: "public",
            addRandomSuffix: true,
          },
        )

        const { blobs } = await list({
          limit: 5,
        })

        const token = process.env.BLOB_READ_WRITE_TOKEN

        return NextResponse.json({
          success: true,
          message: "Blob storage is working correctly! (resolved naming conflict)",
          testFile: uniqueTestBlob.url,
          existingBlobs: blobs.length,
          tokenConfigured: !!token,
          environment: process.env.NODE_ENV,
        })
      } catch (retryError) {
        return NextResponse.json(
          {
            success: false,
            error: retryError instanceof Error ? retryError.message : "Unknown error",
            tokenConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
            environment: process.env.NODE_ENV,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokenConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
        environment: process.env.NODE_ENV,
      },
      { status: 500 },
    )
  }
}
