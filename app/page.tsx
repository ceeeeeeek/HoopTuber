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
  Clock,
  MapPin,
  User,
} from "lucide-react"
import Link from "next/link"

interface GeminiShotEvent {
  Subject: string
  Location: string
  ShotType: string
  TimeStamp: string
  Outcome: string
}

interface UploadResult {
  success: boolean
  videoUrl?: string
  processingId?: string
  fileName?: string
  fileSize?: number
  method?: string
  verified?: boolean
  shotEvents?: GeminiShotEvent[]
  gameStats?: {
    totalShots: number
    madeShots: number
    shootingPercentage: number
    shotTypes: Record<string, number>
    locations: Record<string, number>
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

  // Helper function to format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    return timestamp || "0:00"
  }

  // Helper function to get shot outcome color
  const getShotOutcomeColor = (outcome: string): string => {
    return outcome.toLowerCase().includes('make') ? "bg-green-500" : "bg-red-500"
  }

  // Helper function to get shot outcome badge variant
  const getShotOutcomeBadge = (outcome: string): "default" | "secondary" => {
    return outcome.toLowerCase().includes('make') ? "default" : "secondary"
  }

  // Helper function to format shot type
  const formatShotType = (shotType: string): string => {
    return shotType.replace(/([A-Z])/g, ' $1').trim()
  }

  // Helper function to calculate game statistics
  const calculateGameStats = (shotEvents: GeminiShotEvent[]) => {
    const totalShots = shotEvents.length
    const madeShots = shotEvents.filter(shot => shot.Outcome.toLowerCase().includes('make')).length
    const shootingPercentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0

    const shotTypes: Record<string, number> = {}
    const locations: Record<string, number> = {}

    shotEvents.forEach(shot => {
      shotTypes[shot.ShotType] = (shotTypes[shot.ShotType] || 0) + 1
      locations[shot.Location] = (locations[shot.Location] || 0) + 1
    })

    return {
      totalShots,
      madeShots,
      shootingPercentage,
      shotTypes,
      locations
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    console.log("Starting basketball video analysis for:", selectedFile.name)
    setUploadState("uploading")
    setProgress(15)

    const formData = new FormData()
    formData.append("video", selectedFile)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        throw new Error("Failed to upload and process video")
      }

      const result = await response.json()
      console.log("Received result:", result)
      
      // Extract shot events from the response
      const shotEvents: GeminiShotEvent[] = result.shot_events || result.results?.shot_events || result || []
      
      console.log("Extracted shot events:", shotEvents)

      if (!Array.isArray(shotEvents)) {
        throw new Error("Invalid response format: expected array of shot events")
      }

      // Calculate game statistics
      const gameStats = calculateGameStats(shotEvents)

      setUploadResult({
        success: true,
        videoUrl: "",
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        method: "gemini_ai",
        verified: true,
        shotEvents,
        gameStats,
      })

      setUploadState("complete")
    } catch (error) {
      console.error("Upload error:", error)
      setUploadState("idle")
      // You might want to show an error state here
    }
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
                          🤖 Gemini AI Analysis: Detected{" "}
                          {uploadResult.gameStats?.totalShots || 0} shots with detailed player tracking and shot analysis
                        </p>
                      </div>
                    </div>

                    {/* Analysis Results */}
                    {uploadResult.gameStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {uploadResult.gameStats.totalShots}
                          </div>
                          <div className="text-sm text-gray-600">Shots Detected</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {uploadResult.gameStats.shootingPercentage}%
                          </div>
                          <div className="text-sm text-gray-600">Shooting %</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {uploadResult.gameStats.madeShots}
                          </div>
                          <div className="text-sm text-gray-600">Makes</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Object.keys(uploadResult.gameStats.shotTypes).length}
                          </div>
                          <div className="text-sm text-gray-600">Shot Types</div>
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

              {/* Detailed Shot Analysis */}
              {uploadResult.shotEvents && uploadResult.shotEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Shot-by-Shot Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {uploadResult.shotEvents.map((shot, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-4 h-4 rounded-full ${getShotOutcomeColor(shot.Outcome)}`}
                              />
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Shot #{index + 1} - {formatShotType(shot.ShotType)}
                                </div>
                              </div>
                            </div>
                            <Badge variant={getShotOutcomeBadge(shot.Outcome)}>
                              {shot.Outcome}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                <strong>Time:</strong> {formatTimestamp(shot.TimeStamp)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                <strong>Location:</strong> {shot.Location}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                <strong>Type:</strong> {formatShotType(shot.ShotType)}
                              </span>
                            </div>
                          </div>

                          {shot.Subject && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="flex items-start space-x-2">
                                <User className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div>
                                  <div className="font-medium text-gray-900 mb-1">Player Description:</div>
                                  <div className="text-sm text-gray-700">{shot.Subject}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 text-sm text-gray-600">
                            <strong>Summary:</strong> Player shoots a {formatShotType(shot.ShotType).toLowerCase()} from {shot.Location.toLowerCase()} at {formatTimestamp(shot.TimeStamp)} - {shot.Outcome.toLowerCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shot Type Breakdown */}
              {uploadResult.gameStats?.shotTypes && Object.keys(uploadResult.gameStats.shotTypes).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Shot Type Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(uploadResult.gameStats.shotTypes).map(([type, count]) => (
                        <div key={type} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-semibold text-gray-900">{formatShotType(type)}</div>
                          <div className="text-2xl font-bold text-orange-600">{count}</div>
                          <div className="text-sm text-gray-600">
                            {Math.round((count / uploadResult.gameStats!.totalShots) * 100)}% of shots
                          </div>
                        </div>
                      ))}
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