"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function BlobDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      //const response = await fetch("/api/blob-diagnostics")
      //const data = await response.json()
      const response = await fetch("/api/blob-diagnostics")
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
      setDiagnostics(data)
    } catch (error) {
      setDiagnostics({
        error: "Failed to run diagnostics",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            HoopTuber - Blob Diagnostics
          </Link>
          <Badge variant="secondary">Debug Tool</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Blob Storage Diagnostics</h1>
            <p className="text-gray-600">Check your Vercel Blob configuration and troubleshoot issues</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Run Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={runDiagnostics} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  "Check Blob Configuration"
                )}
              </Button>
            </CardContent>
          </Card>

          {diagnostics && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Environment Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>//BLOB_READ_WRITE_TOKEN exists</span>
                      {diagnostics.env?.tokenExists ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Token length</span>
                      <span className="font-mono">{diagnostics.env?.tokenLength || 0} characters</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Token format</span>
                      <span className="font-mono text-sm">{diagnostics.env?.tokenPrefix || "none"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Blob API Test</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>API Connection</span>
                      {diagnostics.api?.canConnect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    {diagnostics.api?.error && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-red-800 text-sm">{diagnostics.api.error}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {diagnostics.recommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {diagnostics.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <span className="text-orange-500 mt-1">•</span>
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link href="/setup-storage">Setup Guide</Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/upload/safe">Try Safe Upload</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
