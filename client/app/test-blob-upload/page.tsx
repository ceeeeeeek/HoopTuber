"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"

export default function TestBlobUploadPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const runBlobTest = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-blob-upload", {
        method: "POST",
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: "Failed to run test",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setTesting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Blob Upload Test</h1>
          <p className="text-gray-600">Test your Vercel Blob configuration</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run Blob Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={runBlobTest} disabled={testing} className="w-full">
              {testing ? "Testing..." : "Test Blob Upload"}
            </Button>
          </CardContent>
        </Card>

        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResult.success ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium">✅ Blob upload working correctly!</p>
                  <p className="text-green-700 text-sm mt-1">
                    Test file uploaded successfully to: {testResult.blobUrl}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-800 font-medium">❌ Blob upload failed</p>
                    <p className="text-red-700 text-sm mt-1">{testResult.error}</p>
                  </div>

                  {testResult.errorDetails && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Error Details:</h4>
                      <pre className="text-xs text-yellow-700 overflow-auto">
                        {JSON.stringify(testResult.errorDetails, null, 2)}
                      </pre>
                    </div>
                  )}

                  {testResult.troubleshooting && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Troubleshooting Steps:</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        {testResult.troubleshooting.steps.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Check your browser console and server logs for detailed error information
          </p>
        </div>
      </div>
    </div>
  )
}
