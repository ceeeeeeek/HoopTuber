"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Database, Key, Settings, ArrowLeft, RefreshCw, Code } from "lucide-react"
import Link from "next/link"

export default function StorageDiagnosticsPage() {
  const [loading, setLoading] = useState(true)
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    addLog("Starting storage diagnostics...")

    try {
      // Check environment variables
      addLog("Checking environment variables...")
      const envResponse = await fetch("/api/check-env")
      const envData = await envResponse.json()

      if (envData.hasToken) {
        addLog(`✅ //BLOB_READ_WRITE_TOKEN found (${envData.tokenLength} characters)`)
        setTokenInfo({
          exists: true,
          length: envData.tokenLength,
          prefix: envData.tokenPrefix,
          isValid: envData.tokenLength > 20 && envData.tokenPrefix === "vercel_blob_rw_",
        })
      } else {
        addLog("❌ //BLOB_READ_WRITE_TOKEN not found")
        setTokenInfo({
          exists: false,
          isValid: false,
        })
      }

      // Test blob operations
      addLog("Testing blob storage operations...")
      const testResponse = await fetch("/api/test-blob-detailed")
      const testData = await testResponse.json()

      setDiagnosticResults(testData)

      if (testData.success) {
        addLog("✅ Blob storage test successful!")
        addLog(`Created test file: ${testData.testUrl}`)
      } else {
        addLog(`❌ Blob storage test failed: ${testData.error}`)
        if (testData.errorDetails) {
          addLog(`Error details: ${JSON.stringify(testData.errorDetails)}`)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      addLog(`❌ Diagnostic error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Storage Diagnostics</span>
          </Link>
          <Badge variant="outline">Technical Tool</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Storage Status
                </div>
                <Button size="sm" variant="outline" onClick={runDiagnostics} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Running..." : "Run Diagnostics"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Running storage diagnostics...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Token Status */}
                  <div
                    className={`p-4 rounded-lg ${tokenInfo?.exists ? (tokenInfo?.isValid ? "bg-green-50" : "bg-yellow-50") : "bg-red-50"}`}
                  >
                    <div className="flex items-center">
                      <Key
                        className={`w-5 h-5 mr-3 ${tokenInfo?.exists ? (tokenInfo?.isValid ? "text-green-500" : "text-yellow-500") : "text-red-500"}`}
                      />
                      <div>
                        <h3
                          className={`font-semibold ${tokenInfo?.exists ? (tokenInfo?.isValid ? "text-green-800" : "text-yellow-800") : "text-red-800"}`}
                        >
                          {tokenInfo?.exists
                            ? tokenInfo?.isValid
                              ? "✅ //BLOB_READ_WRITE_TOKEN Found"
                              : "⚠️ //BLOB_READ_WRITE_TOKEN May Be Invalid"
                            : "❌ //BLOB_READ_WRITE_TOKEN Missing"}
                        </h3>
                        {tokenInfo?.exists ? (
                          <p className={`text-sm ${tokenInfo?.isValid ? "text-green-700" : "text-yellow-700"}`}>
                            Token length: {tokenInfo.length} characters
                            {tokenInfo.prefix && <span> • Prefix: {tokenInfo.prefix}</span>}
                          </p>
                        ) : (
                          <p className="text-sm text-red-700">No token found in environment variables</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Test Results */}
                  {diagnosticResults && (
                    <div className={`p-4 rounded-lg ${diagnosticResults.success ? "bg-green-50" : "bg-red-50"}`}>
                      <div className="flex items-center">
                        {diagnosticResults.success ? (
                          <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
                        )}
                        <div>
                          <h3
                            className={`font-semibold ${diagnosticResults.success ? "text-green-800" : "text-red-800"}`}
                          >
                            {diagnosticResults.success ? "✅ Blob Storage Working" : "❌ Blob Storage Error"}
                          </h3>
                          <p className={`text-sm ${diagnosticResults.success ? "text-green-700" : "text-red-700"}`}>
                            {diagnosticResults.success
                              ? `Successfully created test file`
                              : `Error: ${diagnosticResults.error}`}
                          </p>
                        </div>
                      </div>

                      {diagnosticResults.success && diagnosticResults.testUrl && (
                        <div className="mt-2 p-2 bg-green-100 rounded text-sm">
                          <a
                            href={diagnosticResults.testUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-700 hover:underline flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            View test file
                          </a>
                        </div>
                      )}

                      {!diagnosticResults.success && diagnosticResults.errorDetails && (
                        <div className="mt-2 p-2 bg-red-100 rounded">
                          <details className="text-sm text-red-700">
                            <summary className="cursor-pointer font-medium">View Error Details</summary>
                            <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-auto whitespace-pre-wrap">
                              {JSON.stringify(diagnosticResults.errorDetails, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Environment Info */}
                  {diagnosticResults && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">Environment Information</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                        <div>
                          <strong>Node Environment:</strong> {diagnosticResults.environment || "Unknown"}
                        </div>
                        <div>
                          <strong>Runtime:</strong> {diagnosticResults.runtime || "Unknown"}
                        </div>
                        <div>
                          <strong>Vercel Environment:</strong> {diagnosticResults.isVercel ? "Yes" : "No"}
                        </div>
                        <div>
                          <strong>Token Configured:</strong> {diagnosticResults.hasToken ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="w-5 h-5 mr-2" />
                Diagnostic Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No logs yet. Run diagnostics to see detailed information.</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Troubleshooting Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Common Authentication Issues:</h3>
                  <ul className="space-y-2 text-sm text-yellow-700">
                    <li className="flex items-start">
                      <span className="font-bold mr-2">1.</span>
                      <span>
                        <strong>Missing Token:</strong> Ensure //BLOB_READ_WRITE_TOKEN is set in your environment
                        variables
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2">2.</span>
                      <span>
                        <strong>Invalid Token:</strong> The token should start with "vercel_blob_rw_" and be at least 40
                        characters
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2">3.</span>
                      <span>
                        <strong>Token Permissions:</strong> The token might not have write permissions
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2">4.</span>
                      <span>
                        <strong>Environment Issues:</strong> The token might not be accessible in the current
                        environment
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Next Steps:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="font-bold mr-2">1.</span>
                      <div>
                        <strong>Continue in Demo Mode:</strong> You can use the app in demo mode without setting up blob
                        storage
                        <div className="mt-2">
                          <Button size="sm" asChild>
                            <Link href="/test-ai">Continue with Demo Mode</Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <span className="font-bold mr-2">2.</span>
                      <div>
                        <strong>Setup Guide:</strong> Follow our detailed setup guide for blob storage
                        <div className="mt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href="/setup-storage">View Setup Guide</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
