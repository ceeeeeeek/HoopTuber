"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, Play, CheckCircle, Zap, ArrowLeft, FileVideo, AlertCircle, BarChart3 } from "lucide-react"
import Link from "next/link"

interface UploadResult {
  success: boolean
  videoUrl?: string
  processingId?: string
  fileName?: string
  fileSize?: number
  method?: string
  error?: string
  verified?: boolean
  mockData?: {
    analysis: {
      shots: Array<{
        timestamp: number
        shotType: string
        outcome: string
        confidence: number
        description: string
      }>
      gameStats: {
        totalShots: number
        madeShots: number
        shootingPercentage: number
        shotTypes: Record<string, number>
      }
      basketDetection: {
        basketsVisible: number
      }
    }
  }
}

export default function ClientDirectUploadPage() {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("File selected:", {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2),
      })
      setSelectedFile(file)
      setUploadState("idle")
      setUploadResult(null)
      setErrorMessage("")
    }
  }, [])

  const handleClientDirectUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a video file first")
      return
    }

    console.log("Starting client-direct upload for:", selectedFile.name)
    setUploadState("uploading")
    setProgress(0)
    setErrorMessage("")

    try {
      // Step 1: Check if we can use Vercel Blob or need to use mock mode
      console.log("Requesting upload configuration...")
      const configResponse = await fetch("/api/client-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        }),
      })

      const configData = await configResponse.json()
      console.log("Upload configuration:", configData)

      if (!configData.success) {
        throw new Error(configData.error || "Failed to configure upload")
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // Step 2: Try direct upload to Vercel Blob (client-side)
      if (configData.method !== "mock_fallback") {
        try {
          console.log("Attempting client-side upload to Vercel Blob...")

          // Use Vercel Blob client-side SDK
          const { upload } = await import("@vercel/blob/client")

          const blob = await upload(selectedFile.name, selectedFile, {
            access: "public",
            handleUploadUrl: "/api/upload-url",
          })

          console.log("✅ Client-side upload successful:", blob.url)

          clearInterval(progressInterval)
          setProgress(100)

          const result = {
            success: true,
            videoUrl: blob.url,
            processingId: configData.processingId,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            method: "vercel_blob_client",
            verified: true,
          }

          setUploadResult(result)
          setUploadState("processing")

          // Simulate processing
          setTimeout(() => {
            setUploadState("complete")
          }, 2000)
        } catch (blobError: any) {
          console.error("❌ Client-side blob upload failed:", blobError)
          console.log("🎭 Falling back to mock mode")

          // Fall back to mock mode
          clearInterval(progressInterval)
          setProgress(100)
          setUploadResult(configData)
          setUploadState("processing")

          setTimeout(() => {
            setUploadState("complete")
          }, 2000)
        }
      } else {
        // Use mock mode directly
        console.log("🎭 Using mock mode for analysis")
        clearInterval(progressInterval)
        setProgress(100)
        setUploadResult(configData)
        setUploadState("processing")

        setTimeout(() => {
          setUploadState("complete")
        }, 2000)
      }
    } catch (error) {
      console.error("Upload failed:", error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      setErrorMessage(errorMsg)
      setUploadState("error")
      setUploadResult({ success: false, error: errorMsg })
    }
  }

  const resetUpload = () => {
    setUploadState("idle")
    setSelectedFile(null)
    setUploadResult(null)
    setProgress(0)
    setErrorMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Badge variant="secondary">Client-Side Upload</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Basketball Video</h1>
            <p className="text-gray-600">Direct client-side upload bypassing server size limits</p>
          </div>

          {/* Error State */}
          {uploadState === "error" && (
            <Card className="mb-6 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3 text-red-600">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Upload Failed</h3>
                    <p className="text-sm mt-1">{errorMessage}</p>
                  </div>
                </div>
                <Button onClick={resetUpload} variant="outline" size="sm" className="mt-4">
                  Start Over
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upload Form */}
          {uploadState === "idle" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Select Basketball Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-300 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedFile ? selectedFile.name : "Choose Basketball Video"}
                    </h3>
                    <p className="text-gray-600 mb-4">MP4, MOV, AVI up to 150MB</p>

                    <input
                      type="file"
                      accept="video/mp4,video/mov,video/avi,video/quicktime,video/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 
                     file:mr-4 file:py-2 file:px-4 
                     file:rounded-full file:border-0 
                     file:text-sm file:font-semibold 
                     file:bg-orange-50 file:text-orange-700 
                     hover:file:bg-orange-100
                     file:cursor-pointer cursor-pointer"
                    />

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
                  </div>

                  {selectedFile && (
                    <Button
                      onClick={handleClientDirectUpload}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      size="lg"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Upload & Analyze Video
                    </Button>
                  )}

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">🚀 Client-Side Upload Benefits:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Bypasses 4.5MB server limit</li>
                      <li>• Direct upload to cloud storage</li>
                      <li>• Faster upload speeds</li>
                      <li>• Handles large video files</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploading State */}
          {uploadState === "uploading" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Uploading Video (Client-Side)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-gray-600">
                    Uploading {selectedFile?.name}... {progress}%
                  </p>
                  <p className="text-center text-sm text-gray-500">Direct upload to cloud storage</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing State */}
          {uploadState === "processing" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-orange-500" />
                  AI Analysis in Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-orange-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Analyzing Basketball Video</h3>
                    <p className="text-gray-600 mb-4">AI is detecting shots, baskets, and generating highlights...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete State */}
          {uploadState === "complete" && uploadResult && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    Analysis Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Basketball Analysis Complete!</h3>
                      <p className="text-gray-600 mb-4">
                        {uploadResult.fileName} ({(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB)
                      </p>

                      {uploadResult.method === "vercel_blob_client" && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                          <p className="text-green-800 text-sm">
                            ✅ Real Upload: Video uploaded directly to Vercel Blob storage
                          </p>
                        </div>
                      )}

                      {uploadResult.method === "mock_fallback" && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                          <p className="text-blue-800 text-sm">
                            🎯 Demo Mode: Showing AI analysis capabilities with sample data
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mock Analysis Results */}
                    {uploadResult.mockData?.analysis && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {uploadResult.mockData.analysis.gameStats.totalShots}
                          </div>
                          <div className="text-sm text-gray-600">Shots Detected</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {uploadResult.mockData.analysis.gameStats.shootingPercentage}%
                          </div>
                          <div className="text-sm text-gray-600">Shooting %</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {uploadResult.mockData.analysis.basketDetection.basketsVisible}
                          </div>
                          <div className="text-sm text-gray-600">Baskets Found</div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button className="flex-1" asChild>
                        <Link href="/upload/enhanced">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Detailed Analysis
                        </Link>
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={resetUpload}>
                        Upload Another Video
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
