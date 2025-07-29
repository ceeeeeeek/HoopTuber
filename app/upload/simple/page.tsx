"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, AlertCircle, CheckCircle } from "lucide-react"

export default function SimpleUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      console.log("Starting upload for file:", selectedFile.name, selectedFile.type, selectedFile.size)

      const formData = new FormData()
      formData.append("video", selectedFile)

      console.log("Sending request to /api/upload...")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("Response data:", data)

      if (data.success) {
        setResult(data)
        console.log("Upload successful!")
      } else {
        setError(data.error || "Upload failed")
        console.error("Upload failed:", data.error)
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Simple Upload Test</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Video File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded">
                <p>
                  <strong>File:</strong> {selectedFile.name}
                </p>
                <p>
                  <strong>Type:</strong> {selectedFile.type}
                </p>
                <p>
                  <strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Error:</span>
              </div>
              <p className="text-red-600 mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center text-green-600 mb-4">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Upload Successful!</span>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Processing ID:</strong> {result.processingId}
                </p>
                <p>
                  <strong>File Name:</strong> {result.fileName}
                </p>
                <p>
                  <strong>File Size:</strong> {result.fileSize} bytes
                </p>
                <p>
                  <strong>Video URL:</strong>{" "}
                  <a
                    href={result.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Video
                  </a>
                </p>
                <p>
                  <strong>Uploaded At:</strong> {new Date(result.uploadedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Check the browser console (F12) for detailed logs during upload. This page will show you exactly what's
              happening with your upload request.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
