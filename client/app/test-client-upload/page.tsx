"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function TestClientUploadPage() {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkClientUpload() {
      try {
        setLoading(true)
        const response = await fetch("/api/test-client-upload")
        const data = await response.json()

        if (data.success) {
          setResults(data.diagnostics)
        } else {
          setError(data.error || "Unknown error")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to test client upload")
      } finally {
        setLoading(false)
      }
    }

    checkClientUpload()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Upload Test</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Testing client upload capabilities...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-green-700">Client upload test completed successfully</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Diagnostics Results:</h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Blob Storage Configured:</span>
                        {results?.blobConfigured ? (
                          <span className="text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" /> Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" /> No
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Vercel Environment:</span>
                        {results?.isVercelEnvironment ? (
                          <span className="text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" /> Yes
                          </span>
                        ) : (
                          <span className="text-yellow-600">No (Local Development)</span>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Can Import Blob Client:</span>
                        {results?.canImportBlob ? (
                          <span className="text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" /> Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" /> No
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Node Version:</span>
                        <span>{results?.nodeVersion}</span>
                      </div>
                    </div>

                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Environment:</span>
                        <span>{results?.environment}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-medium">Next Steps:</h3>

                  <div className="space-y-2">
                    {!results?.blobConfigured && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-yellow-800 mb-2">
                          <strong>Blob Storage Not Configured:</strong> You need to set up the //BLOB_READ_WRITE_TOKEN.
                        </p>
                        <Button asChild>
                          <Link href="/setup-storage">Setup Blob Storage</Link>
                        </Button>
                      </div>
                    )}

                    {!results?.canImportBlob && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-yellow-800">
                          <strong>Blob Client Import Failed:</strong> Make sure @vercel/blob is installed and properly
                          configured.
                        </p>
                      </div>
                    )}

                    {results?.blobConfigured && results?.canImportBlob && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-green-800 mb-2">
                          <strong>All Systems Ready!</strong> You can now try the client-side upload.
                        </p>
                        <div className="flex gap-2">
                          <Button asChild>
                            <Link href="/upload/client">Try Client Upload</Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href="/upload">Standard Upload</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
