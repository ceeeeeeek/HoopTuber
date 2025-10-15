"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, Play, CheckCircle, Zap, ArrowLeft, AlertCircle, FileVideo, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function SafeUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setDebugInfo((prev) => [...prev, logMessage])
    console.log(logMessage)
  }

  const isVideoFile = (file: File): boolean => {
    try {
      const fileType = file?.type || ""
      const fileName = file?.name || ""

      addDebugInfo(`Checking file: name="${fileName}", type="${fileType}", size=${file?.size || 0}`)

      // Check by MIME type first
      if (fileType && typeof fileType === "string" && fileType.startsWith("video/")) {
        addDebugInfo(`Valid video MIME type: ${fileType}`)
        return true
      }

      // Fallback to file extension
      const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]
      const hasVideoExtension = videoExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))

      if (hasVideoExtension) {
        addDebugInfo(`Valid video file extension detected`)
        return true
      }

      addDebugInfo(`Not a video file - type: "${fileType}", name: "${fileName}"`)
      return false
    } catch (err) {
      addDebugInfo(`Error checking file type: ${err instanceof Error ? err.message : "Unknown error"}`)
      return false
    }
  }

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file) {
        addDebugInfo("No file selected")
        return
      }

      addDebugInfo(`File selected from input: ${file.name}`)

      if (isVideoFile(file)) {
        setSelectedFile(file)
        setUploadState("idle")
        setError(null)
        setResult(null)
        setDebugInfo([])
      } else {
        setError("Please select a valid video file (MP4, MOV, AVI, etc.)")
      }
    } catch (err) {
      addDebugInfo(`Error in file select: ${err instanceof Error ? err.message : "Unknown error"}`)
      setError("Error selecting file")
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    try {
      event.preventDefault()
      const file = event.dataTransfer.files?.[0]

      if (!file) {
        addDebugInfo("No file dropped")
        return
      }

      addDebugInfo(`File dropped: ${file.name}`)

      if (isVideoFile(file)) {
        setSelectedFile(file)
        setUploadState("idle")
        setError(null)
        setResult(null)
        setDebugInfo([])
      } else {
        setError("Please drop a valid video file (MP4, MOV, AVI, etc.)")
      }
    } catch (err) {
      addDebugInfo(`Error in file drop: ${err instanceof Error ? err.message : "Unknown error"}`)
      setError("Error dropping file")
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleSafeUpload = async () => {
    if (!selectedFile) {
      setError("Please select a video file first")
      return
    }

    setUploadState("uploading")
    setUploadProgress(0)
    setError(null)

    try {
      addDebugInfo("Starting safe upload...")

      // Validate file one more time
      if (!isVideoFile(selectedFile)) {
        throw new Error("Invalid video file")
      }

      // Create FormData safely
      const formData = new FormData()
      formData.append("video", selectedFile)
      formData.append("filename", selectedFile.name || "video.mp4")
      formData.append("contentType", selectedFile.type || "video/mp4")

      addDebugInfo("FormData created, sending to server...")

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      // Upload to our safe API
      const response = await fetch("/api/safe-upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      addDebugInfo(`Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        addDebugInfo(`Error response: ${errorText}`)
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      addDebugInfo(`Upload successful: ${JSON.stringify(data)}`)

      setResult(data)
      setUploadState("processing")

      // Simulate processing
      setTimeout(() => {
        setUploadState("complete")
      }, 2000)
    } catch (err) {
      addDebugInfo(`Upload error: ${err instanceof Error ? err.message : "Unknown error"}`)
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Badge variant="secondary">Safe Upload</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Safe Upload Test</h1>
            <p className="text-gray-600">Upload with comprehensive error handling and null checks</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              {uploadState === "idle" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Safe Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-300 transition-colors cursor-pointer"
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
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg flex items-start space-x-3">
                          <FileVideo className="w-5 h-5 text-purple-600 mt-0.5" />
                          <div className="text-left">
                            <p className="text-sm text-purple-800 font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-purple-600">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || "unknown type"}
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
                        <Button onClick={handleSafeUpload} className="flex-1 bg-purple-500 hover:bg-purple-600">
                          <Upload className="w-4 h-4 mr-2" />
                          Safe Upload
                        </Button>
                        <Button onClick={resetUpload} variant="outline">
                          Clear
                        </Button>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">🛡️ Safe Upload Features:</h4>
                      <ul className="text-sm text-purple-800 space-y-1">
                        <li>• Comprehensive null checks</li>
                        <li>• Fallback file type detection</li>
                        <li>• Detailed error logging</li>
                        <li>• Safe property access</li>
                      </ul>
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
                      <p className="text-center text-sm text-gray-500">Safe upload in progress</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "processing" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-purple-500" />
                      Processing Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="w-8 h-8 text-purple-500 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold">Upload Processing</h3>
                      <p className="text-gray-600">Your video is being processed safely...</p>
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
                        <p className="text-gray-600">Successfully uploaded using safe error handling</p>
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Safe upload: No errors encountered
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button className="flex-1" asChild>
                          <Link href="/feed">Share Video</Link>
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
