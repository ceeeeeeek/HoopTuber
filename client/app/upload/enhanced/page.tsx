"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Play, CheckCircle, Clock, Zap, ArrowLeft, FileVideo, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ProcessingStatus {
  processingId: string
  status: string
  progress: number
  stage: string
  estimatedTimeRemaining: number
}

interface ShotData {
  timestamp: number
  confidence: number
  shotType: string
  player: {
    position: { x: number; y: number }
    jersey?: string
  }
  basket: {
    position: { x: number; y: number }
    made: boolean
  }
  clipStart: number
  clipEnd: number
  description: string
  outcome: string
}

interface AnalysisResult {
  shots: ShotData[]
  videoMetadata: {
    duration: number
    resolution: { width: number; height: number }
    fps: number
  }
  highlightClips?: any[]
  processingMethod: string
  aiModel: string
}

export default function EnhancedUploadPage() {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle")
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [videoMetadata, setVideoMetadata] = useState<any>(null)
  const [highlightReel, setHighlightReel] = useState<any>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)

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
      // Reset states when new file is selected
      setUploadState("idle")
      setProcessingStatus(null)
      setAnalysisResult(null)
      setHighlightReel(null)
      setError(null)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error("No file selected")
      return
    }

    console.log("🎥 Starting REAL Gemini analysis test for:", selectedFile.name)
    setUploadState("uploading")
    setError(null)

    try {
      // Step 1: Upload the video file first
      setProcessingStatus({
        processingId: `test_${Date.now()}`,
        status: "uploading",
        progress: 10,
        stage: "Uploading video file...",
        estimatedTimeRemaining: 30,
      })

      const formData = new FormData()
      formData.append("video", selectedFile)

      console.log("📤 Uploading video file...")
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const uploadData = await uploadResponse.json()
      console.log("📤 Upload response:", uploadData)

      let videoUrl: string

      if (uploadData.success && uploadData.videoUrl) {
        console.log("✅ Video uploaded successfully to:", uploadData.videoUrl)
        videoUrl = uploadData.videoUrl
        setUploadResult(uploadData)
      } else {
        console.log("⚠️ Upload failed, using direct file analysis...")
        // If upload fails, we'll send the file directly to Gemini
        setProcessingStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: 20,
                stage: "Upload failed, preparing direct file analysis...",
                estimatedTimeRemaining: 25,
              }
            : null,
        )
      }

      // Step 2: Analyze with Gemini
      setUploadState("processing")
      setProcessingStatus((prev) =>
        prev
          ? {
              ...prev,
              progress: 30,
              stage: "Preparing video for Gemini analysis...",
              estimatedTimeRemaining: 25,
            }
          : null,
      )

      setTimeout(() => {
        setProcessingStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: 50,
                stage: "Sending video to Gemini 2.0 Flash...",
                estimatedTimeRemaining: 20,
              }
            : null,
        )
      }, 2000)

      setTimeout(() => {
        setProcessingStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: 70,
                stage: "Gemini analyzing basketball footage...",
                estimatedTimeRemaining: 15,
              }
            : null,
        )
      }, 4000)

      // Test the REAL Gemini API with direct file upload
      console.log("🤖 Calling Gemini 2.0 Flash API with direct file...")

      const analysisFormData = new FormData()
      analysisFormData.append("video", selectedFile)
      analysisFormData.append("fileName", selectedFile.name)
      analysisFormData.append("processingId", `test_${Date.now()}`)

      const analysisResponse = await fetch("/api/analyze-video-gemini-direct", {
        method: "POST",
        body: analysisFormData,
      })

      console.log("📊 Gemini response status:", analysisResponse.status)
      const analysisData = await analysisResponse.json()
      console.log("📊 Gemini response data:", analysisData)

      setProcessingStatus((prev) =>
        prev
          ? {
              ...prev,
              progress: 90,
              stage: "Processing Gemini results...",
              estimatedTimeRemaining: 5,
            }
          : null,
      )

      if (analysisData.success) {
        console.log("✅ REAL Gemini analysis successful!")
        console.log("🏀 Analysis method:", analysisData.result.analysis.processingMethod)
        console.log("🤖 AI model used:", analysisData.result.analysis.aiModel)
        console.log("📈 Shots detected:", analysisData.result.analysis.shots.length)

        setAnalysisResult(analysisData.result.analysis)

        // Generate highlight reel from real analysis
        if (analysisData.result.analysis.highlightClips) {
          const highlightResponse = await fetch("/api/generate-highlight-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              processingId: analysisData.result.processingId,
              clips: analysisData.result.analysis.highlightClips,
              originalVideoUrl: uploadData?.videoUrl || "local_file",
            }),
          })

          const highlightData = await highlightResponse.json()
          if (highlightData.success) {
            setHighlightReel(highlightData.result)
            console.log("🎬 Highlight reel generated!")
          }
        }

        setProcessingStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: 100,
                stage: "Analysis complete!",
                estimatedTimeRemaining: 0,
              }
            : null,
        )

        setUploadState("complete")
      } else {
        console.error("❌ Gemini analysis failed:", analysisData.error)
        setError(
          `Gemini Analysis Failed: ${analysisData.error}\n\nDetails: ${analysisData.details || "No additional details"}`,
        )
        setUploadState("error")
      }
    } catch (error) {
      console.error("💥 Upload/Analysis error:", error)
      setError(`Analysis Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setUploadState("error")
    }
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
          <Badge variant="secondary">Gemini 2.0 Flash Testing</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">🤖 Gemini Basketball Analysis Test</h1>
            <p className="text-gray-600">
              Test Gemini 2.0 Flash's ability to analyze basketball videos and detect shots
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Testing Goal:</strong> Verify if Gemini can accurately identify basketball shots, baskets, and
                create highlight reels from real game footage.
              </p>
            </div>
          </div>

          {uploadState === "idle" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Basketball Video for Gemini Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* File Input */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-300 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedFile ? selectedFile.name : "Select Basketball Video"}
                    </h3>
                    <p className="text-gray-600 mb-4">MP4, MOV, AVI - Test Gemini's basketball analysis</p>

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
                      id="video-upload-input"
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
                      onClick={handleUpload}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      disabled={uploadState !== "idle"}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Test Gemini 2.0 Flash Analysis
                    </Button>
                  )}

                  {/* Testing Info */}
                  <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-1">✅ What We're Testing:</h4>
                      <ul className="text-green-800 space-y-1">
                        <li>• Basketball shot detection</li>
                        <li>• Basket/hoop identification</li>
                        <li>• Player tracking</li>
                        <li>• Highlight clip generation</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-1">🔍 Analysis Method:</h4>
                      <ul className="text-orange-800 space-y-1">
                        <li>• Real Gemini 2.0 Flash API</li>
                        <li>• Direct file processing</li>
                        <li>• Actual video analysis</li>
                        <li>• Live error reporting</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(uploadState === "uploading" || uploadState === "processing") && processingStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-orange-500" />🤖 Gemini 2.0 Flash Analysis in Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-orange-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{processingStatus.stage}</h3>
                    <p className="text-gray-600 mb-4">Testing real Gemini basketball analysis...</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Analysis Progress</span>
                      <span>{processingStatus.progress}%</span>
                    </div>
                    <Progress value={processingStatus.progress} className="w-full" />
                  </div>

                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>
                      {processingStatus.estimatedTimeRemaining > 0
                        ? `${processingStatus.estimatedTimeRemaining} seconds remaining`
                        : "Finalizing analysis..."}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Real-time test:</strong> This is calling the actual Gemini 2.0 Flash API to analyze your
                      basketball video. Any errors or successes will show the true capabilities of the AI model.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadState === "error" && error && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Gemini Analysis Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Error Details:</h4>
                    <pre className="text-sm text-red-800 whitespace-pre-wrap">{error}</pre>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">🔧 Troubleshooting:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Check if GOOGLE_API_KEY is set in environment variables</li>
                      <li>• Verify the API key has access to Gemini 2.0 Flash</li>
                      <li>• Ensure the video file is not corrupted</li>
                      <li>• Check if you've exceeded API quota limits</li>
                      <li>• Try a smaller video file (under 10MB)</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => {
                      setUploadState("idle")
                      setError(null)
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadState === "complete" && analysisResult && (
            <div className="space-y-6">
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />✅ Gemini Analysis Successful!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{analysisResult.shots.length}</div>
                        <div className="text-sm text-gray-600">Shots Detected</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {analysisResult.shots.filter((shot) => shot.basket.made).length}
                        </div>
                        <div className="text-sm text-gray-600">Made Shots</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-purple-600">{analysisResult.processingMethod}</div>
                        <div className="text-sm text-gray-600">Analysis Method</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-orange-600">{analysisResult.aiModel}</div>
                        <div className="text-sm text-gray-600">AI Model</div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">🎯 Analysis Results:</h4>
                      <p className="text-sm text-blue-800">
                        Gemini {analysisResult.processingMethod.includes("gemini") ? "successfully" : "failed to"}{" "}
                        analyze your basketball video.
                        {analysisResult.processingMethod.includes("mock") && " Showing fallback demo data."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="shots" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="shots">Shot Analysis</TabsTrigger>
                  <TabsTrigger value="technical">Technical Details</TabsTrigger>
                </TabsList>

                <TabsContent value="shots" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detected Basketball Shots</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.shots.map((shot, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-3 h-3 rounded-full ${shot.basket.made ? "bg-green-500" : "bg-red-500"}`}
                              />
                              <div>
                                <div className="font-medium">
                                  {shot.shotType.replace("_", " ").toUpperCase()} at {Math.round(shot.timestamp)}s
                                </div>
                                <div className="text-sm text-gray-600">
                                  {shot.outcome} • Confidence: {Math.round(shot.confidence * 100)}%
                                </div>
                                <div className="text-xs text-gray-500">{shot.description}</div>
                              </div>
                            </div>
                            <Badge variant={shot.basket.made ? "default" : "secondary"}>
                              {shot.basket.made ? "Made" : "Missed"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="technical" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Technical Analysis Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Processing Information</h4>
                            <div className="space-y-1 text-sm">
                              <div>
                                <strong>Method:</strong> {analysisResult.processingMethod}
                              </div>
                              <div>
                                <strong>AI Model:</strong> {analysisResult.aiModel}
                              </div>
                              <div>
                                <strong>Video Duration:</strong> {Math.round(analysisResult.videoMetadata.duration)}s
                              </div>
                              <div>
                                <strong>Resolution:</strong> {analysisResult.videoMetadata.resolution.width}x
                                {analysisResult.videoMetadata.resolution.height}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Analysis Quality</h4>
                            <div className="space-y-1 text-sm">
                              <div>
                                <strong>Shots Detected:</strong> {analysisResult.shots.length}
                              </div>
                              <div>
                                <strong>Average Confidence:</strong>{" "}
                                {Math.round(
                                  (analysisResult.shots.reduce((sum, shot) => sum + shot.confidence, 0) /
                                    analysisResult.shots.length) *
                                    100,
                                )}
                                %
                              </div>
                              <div>
                                <strong>Success Rate:</strong>{" "}
                                {Math.round(
                                  (analysisResult.shots.filter((shot) => shot.basket.made).length /
                                    analysisResult.shots.length) *
                                    100,
                                )}
                                %
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold mb-2">🔍 Test Results Summary</h4>
                          <p className="text-sm text-gray-700">
                            {analysisResult.processingMethod.includes("gemini")
                              ? "✅ Gemini 2.0 Flash successfully analyzed the basketball video and detected shots with AI."
                              : "❌ Gemini analysis failed - showing fallback demo data. Check API configuration."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
