"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, AlertCircle, CheckCircle, FileVideo } from "lucide-react"

export default function DebugUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadState("idle")
      setLogs([])
      setResult(null)
      setError(null)
      addLog(`File selected: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      addLog("ERROR: No file selected")
      return
    }

    setUploadState("uploading")
    setError(null)
    setResult(null)

    try {
      addLog("Creating FormData...")
      const formData = new FormData()
      formData.append("video", selectedFile)
      addLog("FormData created successfully")

      addLog("Sending upload request to /api/upload...")
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      addLog(`Response received with status: ${response.status}`)

      const data = await response.json()
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`)

      if (data.success) {
        setResult(data)
        setUploadState("success")
        addLog("Upload completed successfully!")
      } else {
        setError(data.error || "Upload failed")
        setUploadState("error")
        addLog(`Upload failed: ${data.error}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      setUploadState("error")
      addLog(`Upload error: ${errorMessage}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Upload Page</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>File Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>

                {selectedFile && (
                  <div className="p-3 bg-gray-50 rounded flex items-start space-x-3">
                    <FileVideo className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">Type: {selectedFile.type}</p>
                      <p className="text-sm text-gray-600">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadState === "uploading"}
                  className="w-full"
                >
                  {uploadState === "uploading" ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            {uploadState === "success" && result && (
              <Card className="border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center text-green-600 mb-4">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Upload Successful!</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Processing ID:</strong> {result.processingId}
                    </p>
                    <p>
                      <strong>File Name:</strong> {result.fileName}
                    </p>
                    <p>
                      <strong>File Size:</strong> {result.fileSize} bytes
                    </p>
                    <p>
                      <strong>Video URL:</strong>{" "}
                      <a
                        href={result.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Video
                      </a>
                    </p>
                    <p>
                      <strong>Uploaded At:</strong> {new Date(result.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {uploadState === "error" && error && (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Upload Failed</span>
                  </div>
                  <p className="text-red-600 mt-2">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Debug Logs */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Debug Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500">No logs yet. Select and upload a file to see debug information.</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
