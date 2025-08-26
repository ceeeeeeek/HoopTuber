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
  Zap,
  ArrowLeft,
  FileVideo,
  BarChart3,
  Brain,
  Target,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

interface UploadResult {
  success: boolean
  videoUrl?: string
  processingId?: string
  fileName?: string
  fileSize?: number
  method?: string
  verified?: boolean
  mockData?: {
    analysis: {
      shots: Array<{
        timestamp: number
        shotType: string
        outcome: string
        confidence: number
        description: string
        playerPosition: { x: number; y: number }
      }>
      gameStats: {
        totalShots: number
        madeShots: number
        shootingPercentage: number
        shotTypes: Record<string, number>
        quarterBreakdown: Array<{ quarter: number; shots: number; made: number }>
      }
      basketDetection: {
        basketsVisible: number
        courtDimensions: { width: number; height: number }
      }
      playerTracking: {
        playersDetected: number
        movementAnalysis: Array<{
          playerId: number
          avgSpeed: number
          distanceCovered: number
          timeOnCourt: number
        }>
      }
      highlights: Array<{
        timestamp: number
        type: string
        description: string
        importance: number
      }>
    }
  }
}

export default function UploadPage() {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete">("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [progress, setProgress] = useState(0)

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
      setProgress(0)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return;

    console.log("Starting basketball video analysis for:", selectedFile.name)
    setUploadState("uploading")
    setProgress(15)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
      })

      if (!response.ok){
        throw new Error("Failed to upload and process video")
      }
      const result = await response.json(); // this should be your analysis result
    setUploadResult({
      success: true,
      videoUrl: "", // optional
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      method: "fastapi",
      verified: true,
      mockData: result, // this is your actual result
    })

    setUploadState("complete");
    } catch (error){
      console.error("Upload error:", error)
      setUploadState("idle")
    }
  }

  const createBasketballAnalysis = (): UploadResult => {
    // Generate realistic shot data based on video duration estimate
    const estimatedDuration = Math.min(Math.max((selectedFile!.size / (1024 * 1024)) * 30, 60), 300) // 30s per MB, 1-5 min range
    const shotsPerMinute = 2.5
    const totalShots = Math.round((estimatedDuration / 60) * shotsPerMinute)
    const madeShots = Math.round(totalShots * (0.65 + Math.random() * 0.25)) // 65-90% shooting

    const shotTypes = ["jump_shot", "layup", "three_pointer", "dunk", "hook_shot", "fadeaway"]
    const outcomes = ["made", "missed"]

    const shots = Array.from({ length: totalShots }, (_, i) => {
      const timestamp = (estimatedDuration / totalShots) * i + Math.random() * 10
      const shotType = shotTypes[Math.floor(Math.random() * shotTypes.length)]
      const outcome = i < madeShots ? "made" : "missed"
      const confidence = 0.8 + Math.random() * 0.15

      return {
        timestamp: Math.round(timestamp * 10) / 10,
        shotType,
        outcome,
        confidence,
        description: generateShotDescription(shotType, outcome),
        playerPosition: {
          x: Math.round(Math.random() * 100),
          y: Math.round(Math.random() * 100),
        },
      }
    })

    // Sort shots by timestamp
    shots.sort((a, b) => a.timestamp - b.timestamp)

    // Generate quarter breakdown
    const quarterBreakdown = Array.from({ length: 4 }, (_, i) => {
      const quarterShots = shots.filter(
        (shot) => shot.timestamp >= (estimatedDuration / 4) * i && shot.timestamp < (estimatedDuration / 4) * (i + 1),
      )
      return {
        quarter: i + 1,
        shots: quarterShots.length,
        made: quarterShots.filter((shot) => shot.outcome === "made").length,
      }
    })

    // Generate shot type breakdown
    const shotTypeBreakdown = shotTypes.reduce(
      (acc, type) => {
        acc[type] = shots.filter((shot) => shot.shotType === type).length
        return acc
      },
      {} as Record<string, number>,
    )

    // Generate player tracking data
    const playersDetected = 2 + Math.floor(Math.random() * 4) // 2-5 players
    const playerTracking = Array.from({ length: playersDetected }, (_, i) => ({
      playerId: i + 1,
      avgSpeed: Math.round((3 + Math.random() * 4) * 10) / 10, // 3-7 m/s
      distanceCovered: Math.round((estimatedDuration / 60) * (200 + Math.random() * 300)), // 200-500m per minute
      timeOnCourt: Math.round((0.7 + Math.random() * 0.3) * estimatedDuration), // 70-100% of video
    }))

    // Generate highlights
    const highlights = shots
      .filter((shot) => shot.outcome === "made" && (shot.shotType === "dunk" || shot.shotType === "three_pointer"))
      .map((shot) => ({
        timestamp: shot.timestamp,
        type: shot.shotType === "dunk" ? "Slam Dunk" : "Three Pointer",
        description: shot.description,
        importance: shot.shotType === "dunk" ? 0.95 : 0.85,
      }))
      .slice(0, 5) // Top 5 highlights

    return {
      success: true,
      videoUrl: `/api/mock-video/${Date.now()}/${encodeURIComponent(selectedFile!.name)}`,
      processingId: `ai_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: selectedFile!.name,
      fileSize: selectedFile!.size,
      method: "ai_simulation",
      verified: true,
      mockData: {
        analysis: {
          shots,
          gameStats: {
            totalShots,
            madeShots,
            shootingPercentage: Math.round((madeShots / totalShots) * 100),
            shotTypes: shotTypeBreakdown,
            quarterBreakdown,
          },
          basketDetection: {
            basketsVisible: 1 + Math.floor(Math.random() * 2), // 1-2 baskets
            courtDimensions: { width: 28, height: 15 }, // Standard court in meters
          },
          playerTracking: {
            playersDetected,
            movementAnalysis: playerTracking,
          },
          highlights,
        },
      },
    }
  }

  const generateShotDescription = (shotType: string, outcome: string): string => {
    const descriptions = {
      jump_shot: {
        made: ["Clean mid-range jumper", "Smooth jump shot", "Perfect form jump shot"],
        missed: ["Jump shot off the rim", "Contested jump shot missed", "Jump shot falls short"],
      },
      layup: {
        made: ["Easy layup conversion", "Fast break layup", "Smooth layup finish"],
        missed: ["Layup off the rim", "Contested layup missed", "Rushed layup attempt"],
      },
      three_pointer: {
        made: ["Deep three-pointer!", "Corner three swished", "Long-range bomb"],
        missed: ["Three-point attempt missed", "Long shot off target", "Three-pointer falls short"],
      },
      dunk: {
        made: ["Powerful slam dunk!", "Thunderous dunk", "Emphatic finish"],
        missed: ["Dunk attempt missed", "Failed dunk try", "Rim rejection"],
      },
      hook_shot: {
        made: ["Classic hook shot", "Smooth hook finish", "Unstoppable hook"],
        missed: ["Hook shot missed", "Hook attempt off target", "Hook shot falls short"],
      },
      fadeaway: {
        made: ["Beautiful fadeaway", "Contested fadeaway made", "Perfect fadeaway jumper"],
        missed: ["Fadeaway missed", "Difficult fadeaway attempt", "Fadeaway off the mark"],
      },
    }

    const options = descriptions[shotType as keyof typeof descriptions]?.[
      outcome as keyof typeof descriptions.jump_shot
    ] || [`${shotType.replace("_", " ")} ${outcome}`]
    return options[Math.floor(Math.random() * options.length)]
  }

  const resetUpload = () => {
    setUploadState("idle")
    setSelectedFile(null)
    setUploadResult(null)
    setProgress(0)
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
          <Badge variant="secondary">Basketball AI</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Basketball Video</h1>
            <p className="text-gray-600">
              Upload your basketball footage for AI-powered analysis and highlight generation
            </p>
          </div>

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
                    <p className="text-gray-600 mb-4">MP4, MOV, AVI - Any size supported</p>

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
                          <p className="text-sm text-green-600 mt-1">✅ Ready for AI analysis</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFile && (
                    <Button onClick={handleUpload} className="w-full bg-orange-500 hover:bg-orange-600" size="lg">
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze Basketball Video
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-blue-900 mb-1">Shot Detection</h4>
                      <p className="text-sm text-blue-700">AI identifies every shot attempt with precision</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-green-900 mb-1">Performance Stats</h4>
                      <p className="text-sm text-green-700">Detailed shooting percentages and analytics</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-purple-900 mb-1">Auto Highlights</h4>
                      <p className="text-sm text-purple-700">Best moments automatically identified</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-2">🏀 Advanced Basketball AI</h4>
                    <p className="text-sm text-orange-800">
                      Our AI analyzes your video using advanced computer vision to detect shots, track player movement,
                      identify baskets, and generate comprehensive game statistics.
                    </p>
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
                  <Brain className="w-5 h-5 mr-2 text-orange-500" />
                  Processing Basketball Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-gray-600">
                    Analyzing {selectedFile?.name}... {progress}%
                  </p>
                  <p className="text-center text-sm text-gray-500">
                    AI is processing your basketball footage •{" "}
                    {selectedFile && `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                  </p>
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
                      <Brain className="w-8 h-8 text-orange-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Finalizing Basketball Analysis</h3>
                    <p className="text-gray-600 mb-4">Generating insights, highlights, and performance metrics...</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-500">🎯</div>
                      <div className="text-sm text-gray-600">Shot Analysis</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">📊</div>
                      <div className="text-sm text-gray-600">Performance Stats</div>
                    </div>
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
                    Basketball Analysis Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">AI Analysis Complete!</h3>
                      <p className="text-gray-600 mb-4">
                        {uploadResult.fileName} ({(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB)
                      </p>

                      <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 mb-4">
                        <p className="text-green-800 text-sm">
                          🤖 AI Analysis: Advanced computer vision detected{" "}
                          {uploadResult.mockData?.analysis.gameStats.totalShots} shots with{" "}
                          {uploadResult.mockData?.analysis.playerTracking.playersDetected} players tracked
                        </p>
                      </div>
                    </div>

                    {/* Analysis Results */}
                    {uploadResult.mockData?.analysis && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
                            {uploadResult.mockData.analysis.playerTracking.playersDetected}
                          </div>
                          <div className="text-sm text-gray-600">Players Tracked</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {uploadResult.mockData.analysis.highlights.length}
                          </div>
                          <div className="text-sm text-gray-600">Key Highlights</div>
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
                        Analyze Another Video
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shot Analysis Preview */}
              {uploadResult.mockData?.analysis.shots && (
                <Card>
                  <CardHeader>
                    <CardTitle>Shot Analysis Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {uploadResult.mockData.analysis.shots.slice(0, 5).map((shot, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                shot.outcome === "made" ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <div>
                              <div className="font-medium">
                                {shot.shotType.replace("_", " ").toUpperCase()} at {shot.timestamp}s
                              </div>
                              <div className="text-sm text-gray-600">
                                {shot.description} • {Math.round(shot.confidence * 100)}% confidence
                              </div>
                            </div>
                          </div>
                          <Badge variant={shot.outcome === "made" ? "default" : "secondary"}>{shot.outcome}</Badge>
                        </div>
                      ))}
                      {uploadResult.mockData.analysis.shots.length > 5 && (
                        <div className="text-center pt-2">
                          <p className="text-sm text-gray-500">
                            +{uploadResult.mockData.analysis.shots.length - 5} more shots detected
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}