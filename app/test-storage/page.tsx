"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Loader2, Database, Upload, List } from "lucide-react"

interface TestResult {
  success: boolean
  message?: string
  error?: string
  details?: any
  testUrl?: string
  environment?: string
  hasToken?: boolean
  tokenLength?: number
}

export default function TestStoragePage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const runTest = async (testName: string, endpoint: string) => {
    setTesting(true)
    try {
      const response = await fetch(endpoint)
      const result = await response.json()

      setResults((prev) => [
        ...prev,
        {
          ...result,
          testName,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } catch (error) {
      setResults((prev) => [
        ...prev,
        {
          success: false,
          error: error instanceof Error ? error.message : "Test failed",
          testName,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setTesting(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Storage Configuration Test</h1>
          <p className="text-gray-600">Test your Vercel Blob storage configuration and troubleshoot issues</p>
        </div>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Storage Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                onClick={() => runTest("Storage Configuration", "/api/test-storage")}
                disabled={testing}
                className="flex items-center justify-center"
              >
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Test Storage Config
              </Button>

              <Button
                onClick={() => runTest("Blob Operations", "/api/test-blob")}
                disabled={testing}
                variant="outline"
                className="flex items-center justify-center"
              >
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Test Blob Upload
              </Button>

              <Button onClick={clearResults} variant="outline" className="flex items-center justify-center">
                <List className="w-4 h-4 mr-2" />
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className={result.success ? "border-green-200" : "border-red-200"}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                    )}
                    {result.testName}
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>{result.success ? "PASS" : "FAIL"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.message && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">✅ {result.message}</p>
                    </div>
                  )}

                  {result.error && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-red-800 font-medium">❌ {result.error}</p>
                    </div>
                  )}

                  {result.testUrl && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        <strong>Test File:</strong>{" "}
                        <a
                          href={result.testUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          {result.testUrl}
                        </a>
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Environment:</strong> {result.environment || "Unknown"}
                    </div>
                    <div>
                      <strong>Token Configured:</strong> {result.hasToken ? "✅ Yes" : "❌ No"}
                    </div>
                    {result.tokenLength && (
                      <div>
                        <strong>Token Length:</strong> {result.tokenLength} characters
                      </div>
                    )}
                    <div>
                      <strong>Test Time:</strong> {result.timestamp}
                    </div>
                  </div>

                  {result.details && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        View Technical Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {results.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tests Run Yet</h3>
              <p className="text-gray-600 mb-4">Click the buttons above to test your storage configuration</p>
            </CardContent>
          </Card>
        )}

        {/* Troubleshooting Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-red-600 mb-2">❌ If tests fail:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Check that BLOB_READ_WRITE_TOKEN is set in your environment variables</li>
                  <li>• Verify the token has the correct permissions</li>
                  <li>• Ensure you're on a Vercel deployment or have blob storage configured locally</li>
                  <li>• Try refreshing the page and running tests again</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-green-600 mb-2">✅ If tests pass:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Your blob storage is configured correctly</li>
                  <li>• You can proceed with video uploads</li>
                  <li>• The upload system should work without fallback mode</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600 mb-2">🔧 Environment Setup:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Add BLOB_READ_WRITE_TOKEN to your .env.local file</li>
                  <li>• Get the token from your Vercel dashboard → Storage → Blob</li>
                  <li>• Restart your development server after adding the token</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
