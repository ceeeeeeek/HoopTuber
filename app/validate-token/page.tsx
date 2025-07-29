"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function ValidateTokenPage() {
  const [validation, setValidation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const validateToken = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/validate-blob-token")
      const data = await response.json()
      setValidation(data)
    } catch (error) {
      setValidation({
        valid: false,
        error: "Failed to validate token",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Validate Blob Token</h1>
          <p className="text-gray-600">Check if your BLOB_READ_WRITE_TOKEN is working correctly</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Token Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={validateToken} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate Token"
              )}
            </Button>
          </CardContent>
        </Card>

        {validation && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validation.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validation.valid ? (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">✅ Token is working correctly!</p>
                    <p className="text-green-700 text-sm mt-1">Your blob storage is properly configured.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-red-800 font-medium">❌ Token validation failed</p>
                      <p className="text-red-700 text-sm mt-1">{validation.error}</p>
                    </div>

                    {validation.recommendation && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-blue-800 font-medium">💡 Recommendation:</p>
                        <p className="text-blue-700 text-sm mt-1">{validation.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}

                {validation.validation && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Token Details:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Exists: {validation.validation.tokenExists ? "✅" : "❌"}</div>
                      <div>Length: {validation.validation.tokenLength} characters</div>
                      <div>Format: {validation.validation.tokenFormat ? "✅" : "❌"}</div>
                      <div>Prefix: {validation.validation.tokenPrefix}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/setup-storage">Setup Guide</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/upload">Try Upload</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
