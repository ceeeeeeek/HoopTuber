//app/upload/page.tsx (app\upload\page.tsx VERSION as of 10/28/25)

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

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
import Link from "next/link"
import ProfileDropdown from "../app-components/ProfileDropdown"
import HighlightReviewPanel from "../app-components/HighlightReviewPanel"
// "https://hooptuber-fastapi-web-service-docker.onrender.com"
// "http://localhost:8000"
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-devtest.onrender.com";
console.log("API_BASE =", process.env.NEXT_PUBLIC_API_BASE);


interface GeminiShotEvent {
  id: string;
  timestamp_end: string,
  timestamp_start: string,
  outcome: string,
  subject: string,
  shot_type: string,
  shot_location: string
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
  const router = useRouter();
  const { data: session } = useSession();
  console.log("SESSION DEBUG:", session);
  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (!data?.user) {
        router.push("/login?next=/upload");
      }
    };

    checkSession();
  }, [router]);








  // UNCHANGED: base UI states
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

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
    if (!file.name.endsWith(".mp4")) {
      alert("This file will be converted to an mp4 file.");
    }
    setSelectedFile(file);
    setUploadState("idle");
    setUploadResult(null);
    setProgress(0);
    setStatusMessage("");
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
    const madeShots = shotEvents.filter((s) => s.outcome.toLowerCase().includes("make")).length;
    const shootingPercentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;

    const shotTypes: Record<string, number> = {};
    const locations: Record<string, number> = {};
    for (const s of shotEvents) {
      shotTypes[s.shot_type] = (shotTypes[s.shot_type] || 0) + 1;
      locations[s.shot_location] = (locations[s.shot_location] || 0) + 1;
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
  let pollCount = 0;
  pollRef.current = window.setInterval(async () => {
    try {
      pollCount++;
      const res = await fetch(`${API_BASE}/jobs/${id}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: JobRecord = await res.json();

      if (data.status === "error" || data.status === "publish_error") {
        stopPolling();
        setUploadState("idle");
        setStatusMessage("");
        console.error("Job failed:", data.error || "unknown");
        return;
      }

      if (data.status === "done" && data.outputGcsUri) {
        // Finalizing stage
        setProgress(95);
        setStatusMessage("Applying final touches...");

        // Fetch final download + analysis
        const dlRes = await fetch(`${API_BASE}/jobs/${id}/download`);
        if (dlRes.ok) {
          const j = await dlRes.json();

          const shotEvents: GeminiShotEvent[] = j.shot_events || [];
          const gameStats = shotEvents.length > 0 ? calculateGameStats(shotEvents) : undefined;

          setDownloadUrl(j.url);
          setUploadResult((prev) => ({
            ...(prev || { success: true }),
            videoUrl: j.url,
            processingId: id,
            shotEvents,
            gameStats,
          }));
        }

        setProgress(100);
        setStatusMessage("Complete!");
        stopPolling();
        setUploadState("complete");
      } else {
        // Still processing - gradually increase progress from 50% to 90%
        setUploadState("processing");
        const currentProgress = Math.min(50 + (pollCount * 5), 90);
        setProgress(currentProgress);

        // Update status messages based on progress
        if (currentProgress < 65) {
          setStatusMessage("Analyzing video...");
        } else if (currentProgress < 80) {
          setStatusMessage("Detecting shots and movements...");
        } else {
          setStatusMessage("Generating highlights...");
        }
      }
    } catch (e) {
      console.warn("Polling error:", e);
    }
  }, 3000);
};


  // NEW: cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // ------- CHANGED: upload now talks to FastAPI upload endpoint -------
  // ---- upload handler (CHANGED TO SIGNED URL FLOW)----
  const handleUpload = async () => {
  if (!selectedFile) return;

  try {
    setUploadState("uploading");
    setProgress(5);
    setStatusMessage("Preparing upload...");

    // Request a signed upload URL from FastAPI
    const res = await fetch(`${API_BASE}/generate_upload_url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-email": session?.user?.email || "",
      },
      body: JSON.stringify({
        filename: selectedFile.name,
        userId: null, // CHANGE LATER, NEED TO CHANGE FOR OTHER LOGINS (regular logins etc)
        contentType: selectedFile.type || "video/mp4",
      }),
    });
    if (!res.ok) throw new Error("Failed to get signed URL");
    const { uploadUrl, gcsUri, jobId } = await res.json();

    setProgress(10);
    setStatusMessage("Uploading video...");

    // Upload directly to GCS
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type || "video/mp4" },
      body: selectedFile,
    });
    if (!upload.ok) throw new Error("GCS upload failed");

    setProgress(40);
    setStatusMessage("Processing upload...");

    // Tell FastAPI the upload is complete (publish job to Pub/Sub)
    const pub = await fetch(`${API_BASE}/publish_job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, videoGcsUri: gcsUri }),
    });
    if (!pub.ok) throw new Error("Failed to publish job");

    setProgress(50);
    setStatusMessage("Analyzing video...");
    setUploadState("processing");
    setJobId(jobId);

    // Initialize frontend state & begin polling job status
    setUploadResult({
      success: true,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      method: "signed_url_v1",
      verified: true,
      shotEvents: [],
    });

    startPolling(jobId);
  } catch (err) {
    console.error("Upload error:", err);
    alert("Upload failed: " + (err as Error).message);
    setUploadState("idle");
    setStatusMessage("");
  }
};


    // UNCHANGED: reset, with added cleanup of new state
  const resetUpload = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setUploadResult(null);
    setProgress(0);
    setStatusMessage("");
    setJobId(null); // NEW: reset job id
    setDownloadUrl(null); // NEW: reset signed URL
    stopPolling(); // NEW: stop any active poller
  };
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function startPlayback() {
    setPlaying(true);
    setEnded(false);
    // give the <video> a tick to mount before playing
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  }

  // const handleDownload = async () =>{
  //   const response = await fetch(downloadUrl);
  //   const blob = await response.blob();
  //   const link = document.createElement('a');
  //   link.href = window.URL.createObjectURL(blob);
  //   link.download = 'highlight.mp4';
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  // NEW: download handler - Should directly download from signed URL
  const handleDownload = () => {
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "hooptuber_highlight.mp4";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  // COOLDOWN STATES:
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [isCooling, setIsCooling] = useState(false);

    useEffect(() => {
    if (!isCooling || cooldown === null) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCooling]);

  // FETCHING FASTAPI RELOAD RATE LIMIT STATUS
  // Always re-check FastAPI cooldown when upload state changes to "idle"
  useEffect(() => {
    const checkCooldown = async () => {
      try {
        const res = await fetch(`${API_BASE}/ratelimit/status`);
        if (!res.ok) return;
        const data = await res.json();
        console.log("Cooldown status: ", data);
        if (!data.allowed && data.retry_after > 0) {
          setCooldown(data.retry_after);
          setIsCooling(true);
        } else {
          setIsCooling(false);
          setCooldown(null);
        }
      } catch (err) {
        console.error("Cooldown check failed:", err);
      }
    };

    // 👇 Run it on first load AND every time user returns to idle state
    if (uploadState === "idle") {
      checkCooldown();
    }
  }, [uploadState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <Image
              src="/hooptubericon2.png"
              alt="HoopTuber Logo"
              className="w-8 h-8 object-contain"
              width={32}
              height={32}
              priority
            />
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Basketball AI</Badge>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto"> 

     
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

                {isCooling ? (
                  <Card>
                      <CardHeader>
                        <CardTitle>Cooldown Active</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>You can upload again in {cooldown} seconds.</p>
                        <Progress value={(cooldown / 60) * 100} />
                      </CardContent>
                    </Card>
                    ) : (

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
                
                    )}

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
            </div>
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
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 font-medium">
                        {statusMessage}
                      </p>
                      <p className="text-sm text-gray-500">
                        {progress}%
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-gray-500 text-sm">
                    {selectedFile?.name}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
          
          {/* Complete */}
          {uploadState === "complete" && uploadResult && (
            <div className="space-y-6 w-full max-w-6xl mx-auto">
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

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-2">AI Analysis Complete!</h3>
                      <p className="text-gray-600 mb-4">
                        {uploadResult.fileName} ({(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      <div className="relative w-full max-w-md mx-auto">

                     
                      <video
                ref={videoRef}
                className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                src={downloadUrl}
               
                muted // muted to allow autoplay
                playsInline
                controls            // controls appear once playing starts
                onEnded={() => setEnded(true)}
              />

                      {uploadResult.shotEvents && uploadResult.shotEvents.length > 0 && (
                        <div className="mt-8 space-y-4">
                          <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Zap className="w-4 h-4 mr-2 text-orange-500" />
                            Review & Edit Highlights
                          </h3>
                          <div className="w-full max-w-6xl mx-auto space-y-6"> 
                          {uploadResult.shotEvents.map((shot, idx) => (
                            <HighlightReviewPanel
                              key={idx}
                              index={idx}
                              startTime={shot.timestamp_start}
                              endTime={shot.timestamp_end}
                              videoUrl={`${API_BASE}/stream/${uploadResult.processingId || uploadResult.processingId}#t=${shot.timestamp_start}`}
                              outcome={shot.outcome}
                              shotType={shot.shot_type}
                              shotLocation={shot.shot_location}
                            />
                          ))}
                          </div>
                        </div>
                      )}
                      {/* NEW: show highlight download when ready */}
                      {downloadUrl && (
                        <Button 
                          onClick={handleDownload}
                          className="bg-orange-500 hover:bg-orange-600 mt-4"
                          >
                          <Download className="w-4 h-4 mr-2" />
                            Download Highlight
                          
                        </Button>
                      )}
                      
                       </div>
                    </div>
                    {/*
                    
                    UPLOAD RESULTS STATS COMMENTED OUT FOR NOW:
                    Testing new analysis, will avoid displaying status until verified
                    */}

                    {/* {uploadResult.gameStats && (
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
                    )} */}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button className="flex-1" asChild>
                                                  {jobId && (
                            <Link href={`/upload/${jobId}`}>
                              <Button className="flex-1">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                View Detailed Analysis
                              </Button>
                            </Link>
                          )}

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
                  </CardContent>
                </Card>
              )}
            </div>
          )}
      </div>
    
  );
}