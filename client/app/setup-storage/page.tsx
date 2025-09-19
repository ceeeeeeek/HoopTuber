"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ExternalLink, Copy, Database, Settings, ArrowRight, Eye, EyeOff } from "lucide-react"

export default function SetupStoragePage() {
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🔧 Find Your Vercel Blob Token</h1>
          <p className="text-gray-600">Step-by-step guide to locate and configure your //BLOB_READ_WRITE_TOKEN</p>
        </div>

        {/* Current Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Current Storage Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <p className="font-semibold text-green-900">Token Found! ✅</p>
                  <p className="text-sm text-green-700">Ready to configure your environment</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-500">
                Ready to Setup
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Token Location */}
        <div className="space-y-6">
          {/* Step 1: Navigate to Correct Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  1
                </span>
                Navigate to the RIGHT Section in Vercel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-yellow-800 font-medium mb-2">⚠️ Common Mistake:</p>
                  <p className="text-yellow-700 text-sm">
                    You're probably looking at the "Documentation" or "Code Examples" tab. You need to find the
                    <strong> "Connect" or "Environment Variables"</strong> section instead.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">❌ Wrong Section (What you're seeing):</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>
                        • Code examples with <code>import {`{ put }`}</code>
                      </li>
                      <li>• Documentation snippets</li>
                      <li>• Sample code only</li>
                      <li>• No actual token visible</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">✅ Right Section (What you need):</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• "Connect" or "Settings" tab</li>
                      <li>• Environment variables section</li>
                      <li>• Actual token strings</li>
                      <li>• Copy button next to tokens</li>
                    </ul>
                  </div>
                </div>

                <Button asChild>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Vercel Dashboard
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Detailed Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  2
                </span>
                Exact Navigation Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3">📍 Follow this exact path:</h4>
                  <ol className="text-sm text-blue-700 space-y-2">
                    <li>
                      <strong>1.</strong> Go to Vercel Dashboard
                    </li>
                    <li>
                      <strong>2.</strong> Select your project (or create a new one)
                    </li>
                    <li>
                      <strong>3.</strong> Click <strong>"Storage"</strong> in the left sidebar
                    </li>
                    <li>
                      <strong>4.</strong> Click <strong>"Create Database"</strong> → <strong>"Blob"</strong> (if you
                      don't have one)
                    </li>
                    <li>
                      <strong>5.</strong> Once created, click on your blob store name
                    </li>
                    <li>
                      <strong>6.</strong> Look for <strong>"Connect"</strong> or <strong>".env.local"</strong> tab
                    </li>
                    <li>
                      <strong>7.</strong> Find the section with environment variables
                    </li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded text-center">
                    <div className="text-2xl mb-2">🏠</div>
                    <div className="text-sm font-medium">Dashboard</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded text-center">
                    <div className="text-2xl mb-2">💾</div>
                    <div className="text-sm font-medium">Storage</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded text-center">
                    <div className="text-2xl mb-2">🔗</div>
                    <div className="text-sm font-medium">Connect Tab</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: What the Token Looks Like */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  3
                </span>
                What You're Looking For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">The token will be in a section that looks like this:</p>

                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
                  <div className="text-gray-400 mb-2"># Environment Variables for your project</div>
                  <div className="flex items-center justify-between">
                    <span>//BLOB_READ_WRITE_TOKEN=</span>
                    <Button size="sm" variant="outline" onClick={() => setShowToken(!showToken)} className="ml-2">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="text-yellow-400">
                    {showToken
                      ? "vercel_blob_rw_1234567890_abcdefghijklmnopqrstuvwxyz1234567890"
                      : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                  </div>
                  <div className="mt-2 text-gray-400 text-xs">
                    ↑ This is what the actual token looks like (yours will be different)
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">✅ Signs you found it:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>
                        • Starts with <code>vercel_blob_rw_</code>
                      </li>
                      <li>• Very long string (50+ characters)</li>
                      <li>• Has a "Copy" button next to it</li>
                      <li>• In "Environment Variables" section</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">❌ Not the right thing:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Code examples with imports</li>
                      <li>• Documentation text</li>
                      <li>• URLs or endpoints</li>
                      <li>• Anything in a "Docs" tab</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Alternative Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  4
                </span>
                Alternative: Create New Blob Store
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">If you can't find an existing token, create a new blob store:</p>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">🆕 Create Fresh Blob Store:</h4>
                  <ol className="text-sm text-orange-700 space-y-1">
                    <li>1. Go to Vercel Dashboard → Storage</li>
                    <li>2. Click "Create Database" → "Blob"</li>
                    <li>3. Name it "hooptuber-videos" or similar</li>
                    <li>4. After creation, click on the store name</li>
                    <li>5. Look for "Connect" or ".env.local" tab</li>
                    <li>6. Copy the //BLOB_READ_WRITE_TOKEN</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button asChild>
                    <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Create New Blob Store
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://vercel.com/docs/storage/vercel-blob" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Official Blob Docs
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 5: Add to Environment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  5
                </span>
                Add Token to Your Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Create/Update .env.local file:</h4>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400"># Add this to your .env.local file</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("//BLOB_READ_WRITE_TOKEN=paste_your_token_here")}
                      >
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div>//BLOB_READ_WRITE_TOKEN=paste_your_token_here</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">📁 File Location:</h4>
                    <p className="text-sm text-blue-700">
                      Create <code>.env.local</code> in your project root (same folder as package.json)
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">🔄 After Adding:</h4>
                    <p className="text-sm text-yellow-700">
                      Restart your development server with <code>npm run dev</code>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 6: Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  6
                </span>
                Test Your Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">Verify everything is working:</p>

                <div className="flex gap-3">
                  <Button asChild>
                    <a href="/test-storage">
                      <Settings className="w-4 h-4 mr-2" />
                      Test Storage Now
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/upload">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Try Upload
                    </a>
                  </Button>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>✅ Success:</strong> Storage test passes, uploads work without "mock_fallback" mode
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Still Can't Find It? */}
        <Card className="mt-8 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-800">🤔 Still Can't Find the Token?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">If you're still seeing only code examples, you might need to:</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">🔍 Check These Places:</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Project Settings → Environment Variables</li>
                    <li>• Storage → [Your Blob Store] → Settings</li>
                    <li>• Storage → [Your Blob Store] → Connect</li>
                    <li>• Look for tabs like ".env.local" or "Environment"</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Or Try This:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Create a completely new blob store</li>
                    <li>
                      • Use Vercel CLI: <code>vercel env ls</code>
                    </li>
                    <li>• Check if you have the right permissions</li>
                    <li>• Contact Vercel support if needed</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>🚀 Quick Alternative:</strong> The app works perfectly in demo mode! You can continue
                  developing and testing all features without setting up blob storage right now.
                </p>
                <Button className="mt-2" variant="outline" asChild>
                  <a href="/upload">Continue with Demo Mode</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
