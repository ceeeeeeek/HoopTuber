"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Zap, Target, BarChart3, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function TestAIPage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [highlightReel, setHighlightReel] = useState<any>(null)

  const runAITest = async () => {
    setTesting(true)
    setResults(null)
    setHighlightReel(null)

    try {
      // Simulate a video analysis with mock data
      const mockVideoData = {
        videoUrl: "mock://basketball-game.mp4",
        fileName: "basketball-game-demo.mp4",
        processingId: `test_${Date.now()}`,
      }

      console.log("Testing AI video processing...")

      // Test the AI processing endpoint
      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockVideoData),
      })

      const data = await response.json()
      console.log("AI Analysis Result:", data)

      if (data.success) {
        setResults(data.result)

        // Generate highlight reel
        const highlightResponse = await fetch("/api/create-highlight-reel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shots: data.result.analysis.shots,
            originalVideoUrl: mockVideoData.videoUrl,
            processingId: mockVideoData.processingId,
          }),
        })

        const highlightData = await highlightResponse.json()
        if (highlightData.success) {
          setHighlightReel(highlightData.highlightReel)
        }
      }
    } catch (error) {
      console.error("AI test failed:", error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Badge variant="secondary">AI Testing</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">🤖 Test AI Shot Recognition</h1>
            <p className="text-gray-600">
              Test the AI basketball analysis without file uploads - see the real AI in action!
            </p>
          </div>

          {/* Test Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                AI Analysis Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  This will simulate analyzing a 10-minute basketball game and demonstrate all AI capabilities:
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-900">Shot Detection</h4>
                    <p className="text-sm text-blue-800">AI identifies basketball shots</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-green-900">Analytics</h4>
                    <p className="text-sm text-green-800">Performance statistics</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Play className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-purple-900">Highlights</h4>
                    <p className="text-sm text-purple-800">Auto-generated reels</p>
                  </div>
                </div>
                <Button onClick={runAITest} disabled={testing} size="lg" className="bg-orange-500 hover:bg-orange-600">
                  {testing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Running AI Analysis...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Run AI Basketball Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    AI Analysis Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-orange-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">{results.analysis.shots.length}</div>
                      <div className="text-sm text-gray-600">Total Shots</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {results.analysis.shots.filter((shot: any) => shot.basket.made).length}
                      </div>
                      <div className="text-sm text-gray-600">Made Shots</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(
                          (results.analysis.shots.filter((shot: any) => shot.basket.made).length /
                            results.analysis.shots.length) *
                            100,
                        )}
                        %
                      </div>
                      <div className="text-sm text-gray-600">Shooting %</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(results.analysis.videoMetadata.duration / 60)}m
                      </div>
                      <div className="text-sm text-gray-600">Game Length</div>
                    </div>
                  </div>

                  {highlightReel && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">✅ Highlight Reel Generated!</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <strong>Duration:</strong> {Math.round(highlightReel.duration)}s
                        </div>
                        <div>
                          <strong>Clips:</strong> {highlightReel.clipCount}
                        </div>
                        <div>
                          <strong>Success Rate:</strong> {highlightReel.shootingPercentage}%
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue="shots" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="shots">Shot Analysis</TabsTrigger>
                  <TabsTrigger value="breakdown">Shot Breakdown</TabsTrigger>
                </TabsList>

                <TabsContent value="shots" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI-Detected Shots</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.analysis.shots.map((shot: any, index: number) => (
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
                                  {shot.basket.made ? "Made" : "Missed"} • Player {shot.player.jersey} • Confidence:{" "}
                                  {Math.round(shot.confidence * 100)}%
                                </div>
                              </div>
                            </div>
                            <Badge variant={shot.basket.made ? "default" : "secondary"}>
                              {shot.basket.made ? "✅ Made" : "❌ Missed"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="breakdown" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Shot Type Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">By Shot Type</h4>
                          <div className="space-y-2">
                            {Object.entries(
                              results.analysis.shots.reduce((acc: any, shot: any) => {
                                acc[shot.shotType] = (acc[shot.shotType] || 0) + 1
                                return acc
                              }, {}),
                            ).map(([type, count]) => (
                              <div key={type} className="flex justify-between">
                                <span className="capitalize">{type.replace("_", " ")}</span>
                                <span className="font-medium">{count as number}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">Performance Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Average Confidence</span>
                              <span className="font-medium">
                                {Math.round(
                                  (results.analysis.shots.reduce((sum: number, shot: any) => sum + shot.confidence, 0) /
                                    results.analysis.shots.length) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Best Shot</span>
                              <span className="font-medium">
                                {results.analysis.shots
                                  .filter((shot: any) => shot.basket.made)
                                  .sort((a: any, b: any) => b.confidence - a.confidence)[0]
                                  ?.shotType?.replace("_", " ") || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!results && !testing && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Test AI</h3>
                <p className="text-gray-600">
                  Click the button above to run a complete AI basketball analysis simulation
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
