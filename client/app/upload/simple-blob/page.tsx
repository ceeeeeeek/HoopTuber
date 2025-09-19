"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, Play, CheckCircle, Zap, ArrowLeft, AlertCircle, FileVideo, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function SimpleBlobUploadPage() {
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

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      addDebugInfo(
        `File selected: ${file.name} (${file.type || "unknown"}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      )
      setSelectedFile(file)
      setUploadState("idle")
      setError(null)
      setResult(null)
      setDebugInfo([])
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      const fileType = file.type || ""
      const fileName = file.name || ""
      const isVideo =
        fileType.startsWith("video/") ||
        fileName.toLowerCase().endsWith(".mp4") ||
        fileName.toLowerCase().endsWith(".mov") ||
        fileName.toLowerCase().endsWith(".avi")

      if (isVideo) {
        addDebugInfo(
          `File dropped: ${fileName} (${fileType || "unknown type"}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        )
        setSelectedFile(file)
        setUploadState("idle")
        setError(null)
        setResult(null)
        setDebugInfo([])
      } else {
        addDebugInfo(`Invalid file type: ${fileType || "unknown"} for file: ${fileName}`)
      }
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleSimpleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a video file first")
      return
    }

    setUploadState("uploading")
    setUploadProgress(0)
    setError(null)

    try {
      addDebugInfo("Starting simple blob upload...")

      // Create FormData for traditional upload
      const formData = new FormData()
      formData.append("video", selectedFile)
      formData.append("filename", selectedFile.name)
      formData.append("contentType", selectedFile.type || "video/mp4")

      addDebugInfo("Sending file to server...")

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

      // Upload to our simple blob API
      const response = await fetch("/api/simple-blob-upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      addDebugInfo(`Response status: ${response.status}`)
      addDebugInfo(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Badge variant="secondary">Simple Blob Upload</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Simple Blob Upload</h1>
            <p className="text-gray-600">
              Upload your basketball video using a traditional server-side approach to Vercel Blob
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              {uploadState === "idle" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Simple Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-300 transition-colors cursor-pointer"
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
                        <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-start space-x-3">
                          <FileVideo className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="text-left">
                            <p className="text-sm text-green-800 font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-green-600">
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
                        <Button onClick={handleSimpleUpload} className="flex-1 bg-green-500 hover:bg-green-600">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload to Blob Storage
                        </Button>
                        <Button onClick={resetUpload} variant="outline">
                          Clear
                        </Button>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">🔧 Simple Upload Benefits:</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Traditional server-side upload approach</li>
                        <li>• Better error handling and debugging</li>
                        <li>• No client-side Blob API complications</li>
                        <li>• Works with standard FormData</li>
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
                      <p className="text-center text-sm text-gray-500">Server-side upload to Vercel Blob</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "processing" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-green-500" />
                      Processing Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="w-8 h-8 text-green-500 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold">Upload Processing</h3>
                      <p className="text-gray-600">Your video is being processed and stored...</p>
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
                          Successfully uploaded to Vercel Blob storage using server-side approach
                        </p>
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Simple upload: Video stored successfully
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
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/test-storage">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Test Storage Configuration
                        </Link>
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
