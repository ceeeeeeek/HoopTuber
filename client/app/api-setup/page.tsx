"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink, Key, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"

interface ApiStatus {
  googleApiKey: boolean
  blobToken: boolean
  environment: string
}

export default function ApiSetupPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/check-env")
      const data = await response.json()
      setApiStatus(data)
    } catch (error) {
      console.error("Failed to check API status:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const envVarInstructions = [
    {
      name: "GOOGLE_API_KEY",
      description: "Required for Gemini 2.0 Flash basketball video analysis",
      howToGet: "Get from Google AI Studio (aistudio.google.com)",
      example: "AIzaSyD...",
      required: true,
    },
    {
      name: "//BLOB_READ_WRITE_TOKEN",
      description: "Required for video file storage and uploads",
      howToGet: "Get from Vercel Dashboard > Storage > Blob",
      example: "vercel_blob_rw_...",
      required: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber Setup</span>
          </Link>
          <Badge variant="secondary">API Configuration</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">🔧 API Setup & Configuration</h1>
            <p className="text-gray-600">
              Configure your API keys to enable real Gemini basketball analysis and video storage
            </p>
          </div>

          {/* Current Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Current API Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  <span className="ml-3">Checking API configuration...</span>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold">Google AI API</div>
                      <div className="text-sm text-gray-600">For Gemini basketball analysis</div>
                    </div>
                    {apiStatus?.googleApiKey ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold">Vercel Blob Storage</div>
                      <div className="text-sm text-gray-600">For video file uploads</div>
                    </div>
                    {apiStatus?.blobToken ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Environment:</strong> {apiStatus?.environment || "Unknown"}
                  {!apiStatus?.googleApiKey && (
                    <span className="block mt-1">
                      ⚠️ Without Google API key, you'll see enhanced mock analysis instead of real Gemini results.
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="google-ai" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google-ai">Google AI Setup</TabsTrigger>
              <TabsTrigger value="vercel-blob">Vercel Blob Setup</TabsTrigger>
              <TabsTrigger value="testing">Test Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="google-ai" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🤖 Google AI API Key Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Why You Need This:</h4>
                    <p className="text-sm text-orange-800">
                      The Google AI API key enables real Gemini 2.0 Flash analysis of basketball videos. Without it,
                      you'll see realistic mock data instead of actual AI analysis.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Step 1: Get Your API Key</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          Go to{" "}
                          <a
                            href="https://aistudio.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center"
                          >
                            Google AI Studio <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </li>
                        <li>Sign in with your Google account</li>
                        <li>Click "Get API Key" in the top right</li>
                        <li>Create a new API key or use an existing one</li>
                        <li>Make sure it has access to Gemini models</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Step 2: Add to Environment Variables</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm">GOOGLE_API_KEY=your_api_key_here</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard("GOOGLE_API_KEY=your_api_key_here", "google")}
                            >
                              {copied === "google" ? "Copied!" : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600">Add this to your .env.local file</p>
                        </div>

                        <div className="text-sm space-y-2">
                          <p>
                            <strong>For local development:</strong>
                          </p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>
                              Create/edit <code className="bg-gray-100 px-1 rounded">.env.local</code> in your project
                              root
                            </li>
                            <li>Add the line above with your actual API key</li>
                            <li>Restart your development server</li>
                          </ul>
                        </div>

                        <div className="text-sm space-y-2">
                          <p>
                            <strong>For Vercel deployment:</strong>
                          </p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Go to your Vercel project dashboard</li>
                            <li>Navigate to Settings → Environment Variables</li>
                            <li>
                              Add <code className="bg-gray-100 px-1 rounded">GOOGLE_API_KEY</code> with your API key
                            </li>
                            <li>Redeploy your application</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vercel-blob" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>📁 Vercel Blob Storage Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Optional but Recommended:</h4>
                    <p className="text-sm text-blue-800">
                      Vercel Blob storage enables real video uploads. Without it, the app will use mock analysis but
                      still provide excellent basketball insights.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Step 1: Create Blob Store</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          Go to{" "}
                          <a
                            href="https://vercel.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center"
                          >
                            Vercel Dashboard <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </li>
                        <li>Navigate to Storage → Create Database</li>
                        <li>Select "Blob" storage type</li>
                        <li>Create your blob store</li>
                        <li>Copy the connection token</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Step 2: Add Environment Variable</h4>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm">//BLOB_READ_WRITE_TOKEN=your_token_here</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard("//BLOB_READ_WRITE_TOKEN=your_token_here", "blob")}
                          >
                            {copied === "blob" ? "Copied!" : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600">Add this to your .env.local file</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🧪 Test Your Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Button asChild className="h-auto p-4">
                      <Link href="/upload/enhanced" className="block">
                        <div className="text-center">
                          <div className="text-lg font-semibold mb-1">Test Gemini Analysis</div>
                          <div className="text-sm opacity-90">Upload a basketball video to test AI analysis</div>
                        </div>
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-auto p-4">
                      <Link href="/test-storage" className="block">
                        <div className="text-center">
                          <div className="text-lg font-semibold mb-1">Test Blob Storage</div>
                          <div className="text-sm opacity-90">Verify video upload capabilities</div>
                        </div>
                      </Link>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={checkApiStatus} variant="outline" className="w-full" disabled={loading}>
                      {loading ? "Checking..." : "Refresh API Status"}
                    </Button>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">✅ What Success Looks Like:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Processing method shows "gemini_2_0_flash_direct_success"</li>
                      <li>• AI model shows "gemini-2.0-flash-exp"</li>
                      <li>• Shot descriptions are specific and contextual</li>
                      <li>• Technical details show "configured" API key status</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Fallback Mode:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Processing method shows "enhanced_mock_analysis"</li>
                      <li>• AI model shows "mock_basketball_ai_v3"</li>
                      <li>• Still provides excellent basketball analysis</li>
                      <li>• All features work, just using simulated data</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">🚀 Quick Start:</h4>
            <p className="text-sm text-gray-700 mb-3">
              Want to test immediately? The app works great without any API keys - you'll get realistic basketball
              analysis using our enhanced simulation system.
            </p>
            <Button asChild>
              <Link href="/upload/enhanced">Try Basketball Analysis Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
