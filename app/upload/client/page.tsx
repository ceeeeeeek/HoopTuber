"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Play,
  CheckCircle,
  Clock,
  Zap,
  ArrowLeft,
  AlertCircle,
  FileVideo,
  Info,
  ExternalLink,
  Settings,
} from "lucide-react"
import Link from "next/link"

export default function ClientUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [needsSetup, setNeedsSetup] = useState(false)

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setDebugInfo((prev) => [...prev, logMessage])
    console.log(logMessage)
  }

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      addDebugInfo(`File selected: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`)
      setSelectedFile(file)
      setUploadState("idle")
      setError(null)
      setResult(null)
      setDebugInfo([])
      setNeedsSetup(false)
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith("video/")) {
      addDebugInfo(`File dropped: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`)
      setSelectedFile(file)
      setUploadState("idle")
      setError(null)
      setResult(null)
      setDebugInfo([])
      setNeedsSetup(false)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleClientUpload = async () => {
    if (!selectedFile) {
      setError("Please select a video file first")
      return
    }

    setUploadState("uploading")
    setUploadProgress(0)
    setError(null)
    setNeedsSetup(false)

    try {
      addDebugInfo("Starting client-side upload...")

      // First, get an upload URL from our API
      addDebugInfo("Requesting upload URL...")
      const uploadUrlResponse = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          size: selectedFile.size,
        }),
      })

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json().catch(() => ({}))
        if (errorData.setupRequired) {
          setNeedsSetup(true)
        }
        throw new Error(errorData.error || `Failed to get upload URL: ${uploadUrlResponse.status}`)
      }

      const data = await uploadUrlResponse.json()
      const { uploadUrl, processingId } = data

      if (!uploadUrl) {
        throw new Error("No upload URL returned from server")
      }

      addDebugInfo(`Got upload URL: ${uploadUrl}`)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 15
        })
      }, 400)

      try {
        // Upload directly to Vercel Blob using the client
        addDebugInfo("Importing @vercel/blob/client...")
        const blobModule = await import("@vercel/blob/client")

        if (!blobModule || !blobModule.put) {
          throw new Error("Failed to load Vercel Blob client")
        }

        addDebugInfo("Uploading file to blob storage...")
        const blob = await blobModule.put(uploadUrl, selectedFile, {
          access: "public",
          handleUploadUrl: uploadUrl,
        })

        clearInterval(progressInterval)
        setUploadProgress(100)
        addDebugInfo(`Upload successful: ${blob.url}`)

        const result = {
          success: true,
          videoUrl: blob.url,
          processingId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          uploadedAt: new Date().toISOString(),
          method: "client_upload",
          blobInfo: {
            url: blob.url,
            pathname: blob.pathname,
            size: blob.size,
          },
        }

        setResult(result)
        setUploadState("processing")

        // Simulate processing
        setTimeout(() => {
          setUploadState("complete")
        }, 3000)
      } catch (blobError) {
        clearInterval(progressInterval)
        addDebugInfo(`Blob client error: ${blobError instanceof Error ? blobError.message : "Unknown blob error"}`)
        throw blobError
      }
    } catch (err) {
      addDebugInfo(`Upload error: ${err instanceof Error ? err.message : "Unknown error"}`)

      // Check if it's a configuration issue
      if (
        err instanceof Error &&
        (err.message.includes("BLOB_READ_WRITE_TOKEN") ||
          err.message.includes("not configured") ||
          err.message.includes("Failed to load"))
      ) {
        setNeedsSetup(true)
        addDebugInfo("Configuration required - blob storage needs setup")
      }

      setError(err instanceof Error ? err.message : "Upload failed")
      setUploadState("error")
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setUploadState("idle")
    setUploadProgress(0)
    setError(null)
    setResult(null)
    setDebugInfo([])
    setNeedsSetup(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Badge variant="secondary">Client-Side Upload</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Client-Side Video Upload</h1>
            <p className="text-gray-600">
              Upload your basketball video directly from your browser to Vercel Blob storage
            </p>
          </div>

          {/* Setup Required Banner */}
          {needsSetup && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Settings className="w-6 h-6 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-2">🔧 Blob Storage Setup Required</h3>
                    <p className="text-orange-800 text-sm mb-3">
                      To upload real videos, you need to configure Vercel Blob storage. This requires setting up a
                      BLOB_READ_WRITE_TOKEN.
                    </p>
                    <div className="flex gap-3">
                      <Button size="sm" asChild>
                        <Link href="/setup-storage">
                          <Settings className="w-4 h-4 mr-2" />
                          Setup Guide
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetUpload}>
                        Continue with Demo Mode
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              {uploadState === "idle" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Client-Side Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => document.getElementById("video-upload")?.click()}
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {selectedFile ? selectedFile.name : "Drop your video here or click to browse"}
                      </h3>
                      <p className="text-gray-600 mb-4">Supports MP4, MOV, AVI up to 100MB</p>

                      {selectedFile && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start space-x-3">
                          <FileVideo className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-left">
                            <p className="text-sm text-blue-800 font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-blue-600">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                            </p>
                          </div>
                        </div>
                      )}

                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="video-upload"
                      />
                    </div>

                    {selectedFile && (
                      <div className="mt-6 flex gap-3">
                        <Button onClick={handleClientUpload} className="flex-1 bg-blue-500 hover:bg-blue-600">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload to Blob Storage
                        </Button>
                        <Button onClick={resetUpload} variant="outline">
                          Clear
                        </Button>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">🚀 Client-Side Benefits:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Direct upload to Vercel Blob storage</li>
                        <li>• No server-side processing bottlenecks</li>
                        <li>• Better error handling and debugging</li>
                        <li>• Faster upload speeds</li>
                      </ul>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Need Real Video Storage?</p>
                        <p>
                          Follow our{" "}
                          <Link href="/setup-storage" className="underline hover:no-underline">
                            setup guide
                          </Link>{" "}
                          to configure Vercel Blob storage for real video uploads.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "uploading" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Uploading Video
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-center text-gray-600">
                        Uploading {selectedFile?.name}... {uploadProgress}%
                      </p>
                      <p className="text-center text-sm text-gray-500">Client-side upload to Vercel Blob</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "processing" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-blue-500" />
                      AI Processing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold">Analyzing Your Game</h3>
                      <p className="text-gray-600">Our AI is detecting baskets and creating your highlight reel...</p>
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>This usually takes 1-2 minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "complete" && result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      Upload Complete!
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Your Video is Ready!</h3>
                        <p className="text-gray-600">
                          Successfully uploaded to Vercel Blob storage and ready for AI analysis
                        </p>
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Client upload: Video stored in Vercel Blob storage
                        </div>
                      </div>

                      <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-white">
                            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-semibold mb-2">Basketball Video</p>
                            <p className="text-sm opacity-75">Ready for AI Analysis</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button className="flex-1" asChild>
                          <Link href="/feed">Share Video</Link>
                        </Button>
                        <Button variant="outline" className="flex-1">
                          Start AI Analysis
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(result.videoUrl, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Video
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "error" && error && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Upload Failed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-600 mb-4">{error}</p>
                    <div className="space-y-2">
                      <Button onClick={resetUpload} variant="outline" className="w-full">
                        Try Again
                      </Button>
                      {needsSetup ? (
                        <Button className="w-full" asChild>
                          <Link href="/setup-storage">
                            <Settings className="w-4 h-4 mr-2" />
                            Setup Blob Storage
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/test-storage">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Test Storage Configuration
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Debug Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
                    {debugInfo.length === 0 ? (
                      <p className="text-gray-500">No debug info yet. Select and upload a file to see logs.</p>
                    ) : (
                      debugInfo.map((log, index) => (
                        <div key={index} className="mb-1">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
