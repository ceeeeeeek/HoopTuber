//app/upload/page.tsx (app\upload\page.tsx VERSION as of Thursday 09-11-25)

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  Upload,
  Play,
  CheckCircle,
  Zap,
  ArrowLeft,
  FileVideo,
  BarChart3,
  Brain,
  Target,
  TrendingUp,
  Clock,
  MapPin,
  User,
  Download, // NEW: icon for download button
} from "lucide-react";
import Link from "next/link";



const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

interface GeminiShotEvent {
  Subject: string;
  Location: string;
  ShotType: string;
  TimeStamp: string;
  Outcome: string;
}

interface GeminiShotEvent {
  Subject: string
  Location: string
  ShotType: string
  TimeStamp: string
  Outcome: string
}

interface UploadResult {
  success: boolean;
  videoUrl?: string; // NEW: signed URL once worker completes
  processingId?: string; // NEW: mirrors jobId
  fileName?: string;
  fileSize?: number;
  method?: string;
  verified?: boolean;
  shotEvents?: GeminiShotEvent[]; // UNCHANGED: legacy immediate analysis support
  gameStats?: {
    totalShots: number;
    madeShots: number;
    shootingPercentage: number;
    shotTypes: Record<string, number>;
    locations: Record<string, number>;
  };
}

interface JobRecord {
  jobId: string;
  status: "queued" | "processing" | "done" | "error" | "publish_error";
  videoGcsUri?: string;
  outputGcsUri?: string;
  error?: string;
}



export default function UploadPage() {

  // UNCHANGED: base UI states
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);

  // NEW: track job id and downloadable URL from worker output
  // Job + download tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // CHANGED: browser timers use number, not NodeJS.Timer
  // keep polling interval id (browser timers return number)
  const pollRef = useRef<number | null>(null);

  // UNCHANGED: file select handler, with a bit of reset for new states
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadState("idle");
    setUploadResult(null);
    setProgress(0);
    setJobId(null);
    setDownloadUrl(null);
  }, []);

  // ---- UNCHANGED helpers for UI ----
  const formatTimestamp = (ts: string) => ts || "0:00";
  const getShotOutcomeColor = (outcome: string) =>
    outcome.toLowerCase().includes("make") ? "bg-green-500" : "bg-red-500";
  const getShotOutcomeBadge = (outcome: string): "default" | "secondary" =>
    outcome.toLowerCase().includes("make") ? "default" : "secondary";
  const formatShotType = (shotType: string) => shotType.replace(/([A-Z])/g, " $1").trim();

  const calculateGameStats = (shotEvents: GeminiShotEvent[]) => {
    const totalShots = shotEvents.length;
    const madeShots = shotEvents.filter((s) => s.Outcome.toLowerCase().includes("make")).length;
    const shootingPercentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;

    const shotTypes: Record<string, number> = {};
    const locations: Record<string, number> = {};
    for (const s of shotEvents) {
      shotTypes[s.ShotType] = (shotTypes[s.ShotType] || 0) + 1;
      locations[s.Location] = (locations[s.Location] || 0) + 1;
    }

    return { totalShots, madeShots, shootingPercentage, shotTypes, locations };
  };

  // NEW: polling helpers for queue-based flow
  // ---- polling controls ----
  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current); // CHANGED: window.clearInterval(number)
      pollRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${id}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: JobRecord = await res.json();

        if (data.status === "error" || data.status === "publish_error") {
          stopPolling();
          setUploadState("idle");
          console.error("Job failed:", data.error || "unknown");
          return;
        }

        if (data.status === "done" && data.outputGcsUri) {
          // NEW: grab signed download URL when output is ready
          const dlRes = await fetch(`${API_BASE}/jobs/${id}/download`);
          if (dlRes.ok) {
            const j = await dlRes.json();
            setDownloadUrl(j.url);
            setUploadResult((prev) => ({
              ...(prev || { success: true }),
              videoUrl: j.url,
              processingId: id,
            }));
          }
          stopPolling();
          setUploadState("complete");
        } else {
          // queued/processing – keep waiting
          setUploadState("processing");
        }
      } catch (e) {
        // transient errors are fine; keep polling
        console.warn("Polling error:", e);
      }
    }, 3000);
  };

  // NEW: cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // ------- CHANGED: upload now talks to FastAPI upload endpoint -------
  // ---- upload handler ----
  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadState("uploading");
    setProgress(15);

    const formData = new FormData();
    formData.append("video", selectedFile);

    // CHANGED: progress interval typed as number
    // visual progress during POST (client-side only)
    let progressInterval: number | null = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (progressInterval !== null) {
            window.clearInterval(progressInterval); // CHANGED
            progressInterval = null;
          }
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const response = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });

      if (progressInterval !== null) {
        window.clearInterval(progressInterval); // CHANGED
        progressInterval = null;
      }
      setProgress(100);

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const result = await response.json(); // { ok, jobId, status, videoGcsUri } OR legacy events // NEW: expect { jobId } in queue flow
      
      // New queue-based flow – start polling
      if (result?.jobId) {
        setJobId(result.jobId);
        setUploadState("processing");
        setUploadResult({
          success: true,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          method: "queue_v1",
          verified: true,
          shotEvents: [], // no immediate events in queue flow
        });
        startPolling(result.jobId);
        return;
      }

      // UNCHANGED: legacy immediate analysis path (array of events)
      // Legacy: immediate analysis response (array of shot events)
      const shotEvents: GeminiShotEvent[] =
        result.shot_events || result.results?.shot_events || (Array.isArray(result) ? result : []);
      if (!Array.isArray(shotEvents)) throw new Error("Invalid response format: expected jobId or shot events array");

      const gameStats = calculateGameStats(shotEvents);
      setUploadResult({
        success: true,
        videoUrl: "",
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        method: "gemini_ai",
        verified: true,
        shotEvents,
        gameStats,
      });
      setUploadState("complete");
    } catch (err) {
      console.error("Upload error:", err);
      setUploadState("idle");
    }
  };

    // UNCHANGED: reset, with added cleanup of new state
  const resetUpload = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setUploadResult(null);
    setProgress(0);
    setJobId(null); // NEW: reset job id
    setDownloadUrl(null); // NEW: reset signed URL
    stopPolling(); // NEW: stop any active poller
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Badge variant="secondary">Basketball AI</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Basketball Video</h1>
            <p className="text-gray-600">Upload your basketball footage for AI-powered analysis and highlight generation</p>
          </div>

          {/* Upload Form */}
          {uploadState === "idle" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Select Basketball Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-300 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{selectedFile ? selectedFile.name : "Choose Basketball Video"}</h3>
                    <p className="text-gray-600 mb-4">MP4, MOV, AVI - Any size supported</p>

                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 file:cursor-pointer cursor-pointer"
                    />

                    {selectedFile && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start space-x-3">
                        <FileVideo className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-left">
                          <p className="text-sm text-blue-800 font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-blue-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}</p>
                          <p className="text-sm text-green-600 mt-1">✅ Ready for AI analysis</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFile && (
                    <Button onClick={handleUpload} className="w-full bg-orange-500 hover:bg-orange-600" size="lg">
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze Basketball Video
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-blue-900 mb-1">Shot Detection</h4>
                      <p className="text-sm text-blue-700">AI identifies every shot attempt with precision</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-green-900 mb-1">Performance Stats</h4>
                      <p className="text-sm text-green-700">Detailed shooting percentages and analytics</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-purple-900 mb-1">Auto Highlights</h4>
                      <p className="text-sm text-purple-700">Best moments automatically identified</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploading / Processing */}
          {(uploadState === "uploading" || uploadState === "processing") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-orange-500" />
                  {uploadState === "uploading" ? "Uploading Video" : "Processing Video"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-gray-600">
                    {uploadState === "uploading" ? "Uploading" : "Analyzing"} {selectedFile?.name}... {progress}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete */}
          {uploadState === "complete" && uploadResult && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    Basketball Analysis Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">AI Analysis Complete!</h3>
                      <p className="text-gray-600 mb-4">
                        {uploadResult.fileName} ({(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB)
                      </p>

                      {/* NEW: show highlight download when ready */}
                      {downloadUrl && (
                        <Button asChild className="bg-orange-500 hover:bg-orange-600">
                          <a href={downloadUrl} target="_blank" rel="noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            Download Highlight
                          </a>
                        </Button>
                      )}
                    </div>

                    {uploadResult.gameStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{uploadResult.gameStats.totalShots}</div>
                          <div className="text-sm text-gray-600">Shots Detected</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{uploadResult.gameStats.shootingPercentage}%</div>
                          <div className="text-sm text-gray-600">Shooting %</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{uploadResult.gameStats.madeShots}</div>
                          <div className="text-sm text-gray-600">Makes</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Object.keys(uploadResult.gameStats.shotTypes).length}
                          </div>
                          <div className="text-sm text-gray-600">Shot Types</div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button className="flex-1" asChild>
                        <Link href="/upload/enhanced">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Detailed Analysis
                        </Link>
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={resetUpload}>
                        Analyze Another Video
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shot-by-shot (legacy immediate analysis) */}
              {uploadResult.shotEvents && uploadResult.shotEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Shot-by-Shot Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {uploadResult.shotEvents.map((shot, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full ${getShotOutcomeColor(shot.Outcome)}`} />
                              <div className="font-semibold text-gray-900">
                                Shot #{idx + 1} - {formatShotType(shot.ShotType)}
                              </div>
                            </div>
                            <Badge variant={getShotOutcomeBadge(shot.Outcome)}>{shot.Outcome}</Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                <strong>Time:</strong> {formatTimestamp(shot.TimeStamp)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                <strong>Location:</strong> {shot.Location}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                <strong>Type:</strong> {formatShotType(shot.ShotType)}
                              </span>
                            </div>
                          </div>

                          {shot.Subject && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="flex items-start space-x-2">
                                <User className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div>
                                  <div className="font-medium text-gray-900 mb-1">Player Description:</div>
                                  <div className="text-sm text-gray-700">{shot.Subject}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 text-sm text-gray-600">
                            <strong>Summary:</strong> Player shoots a {formatShotType(shot.ShotType).toLowerCase()} from{" "}
                            {shot.Location.toLowerCase()} at {formatTimestamp(shot.TimeStamp)} –{" "}
                            {shot.Outcome.toLowerCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
