//app/upload/page.tsx - - Tuesday 11-04-25 Version
"use client";

//React + hooks
import { useEffect, useRef, useState, useCallback } from "react";
//UI kit
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
//routing helper
import { useRouter } from "next/navigation";
//read the signed-in user so we can pass x-owner-email to FastAPI
import { useSession } from "next-auth/react";
import {
  //icons
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
  //Clock, MapPin, User,  // (kept imported in case you re-enable the legacy section)
  Download, //UNCHANGED in your file: used for the download button
} from "lucide-react";
import Link from "next/link";
import ProfileDropdown from "../app-components/ProfileDropdown";

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
console.log("[Upload] API_BASE =", API_BASE);




//types used by the “legacy immediate analysis” section and job polling
interface GeminiShotEvent {
  Subject: string;
  Location: string;
  ShotType: string;
  TimeStamp: string;
  Outcome: string;
}

interface UploadResult {
  success: boolean;
  videoUrl?: string;     
  processingId?: string;  
  fileName?: string;      
  fileSize?: number;      
  method?: string;        
  verified?: boolean;     
  shotEvents?: GeminiShotEvent[]; 
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
  //protect route; bounce to /login if no session
  const router = useRouter();
  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session", { method: "GET", credentials: "include" });
      const data = await res.json();
      if (!data?.user) router.push("/login?next=/upload");
    };
    checkSession();
  }, [router]);

  //read session so we can pass x-owner-email on /upload
  const { data: session } = useSession();                 
  const ownerEmail = session?.user?.email ?? undefined;   

  //base UI state
  const [uploadState, setUploadState] =
    useState<"idle" | "uploading" | "processing" | "complete">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);

  //job + download tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  //keep a browser-safe interval id (number vs NodeJS.Timer)
  const pollRef = useRef<number | null>(null); 

  //file chooser
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

  //a few helpers still used in optional/legacy render
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

  // ---- polling controls (browser-safe) ----
  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);   
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
          //fetch signed URL + (optional) shot events
          const dlRes = await fetch(`${API_BASE}/jobs/${id}/download`);
          if (dlRes.ok) {
            const j = await dlRes.json();
            const shotEvents: GeminiShotEvent[] = j.shot_events || [];
            const gameStats =
              shotEvents.length > 0 ? calculateGameStats(shotEvents) : undefined;

            setDownloadUrl(j.url ?? null);
            setUploadResult((prev) => ({
              ...(prev || { success: true }),
              videoUrl: j.url,
              processingId: id,
              shotEvents,
              gameStats,
            }));
          }
          stopPolling();
          setUploadState("complete");
        } else {
          setUploadState("processing");
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    }, 3000);
  };

  //cleanup any live poller on unmount
  useEffect(() => () => stopPolling(), []);

  //This is where the upload logic lives
  // ------- Upload → enqueue job (now with identity header + error surfacing) -------
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setProgress(15);

    const formData = new FormData();
    formData.append("video", selectedFile);

    //progress interval typed as number (browser)
    let progressInterval: number | null = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (progressInterval !== null) {
            window.clearInterval(progressInterval);
            progressInterval = null;
          }
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const url = `${API_BASE}/upload`;
      console.log("[Upload] POST", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "x-owner-email": session?.user?.email ?? "" },
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${txt}`);
      }
      const json = await res.json();
      const jobFromJson = json?.jobId as string | undefined;

      if (progressInterval !== null) {
        window.clearInterval(progressInterval);
        progressInterval = null;
      }
      setProgress(100);

      //prefer queue flow if we got a jobId
      if (jobFromJson) {                       
        setJobId(jobFromJson);
        setUploadState("processing");
        setUploadResult({
          success: true,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          method: "queue_v1",
          verified: true,
          shotEvents: [], //no immediate events in queue flow
        });
        startPolling(jobFromJson);
        return;
      }

      //legacy immediate-analysis fallback
      const shotEvents: GeminiShotEvent[] =
        json?.shot_events || json?.results?.shot_events || (Array.isArray(json) ? json : []);
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

  //reset UX
  const resetUpload = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setUploadResult(null);
    setProgress(0);
    setJobId(null);
    setDownloadUrl(null);
    stopPolling();
  };

  //simple player helpers
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  function startPlayback() {
    setPlaying(true);
    setEnded(false);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  }

  //direct browser download via signed URL
  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "hooptuber_highlight.mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  //======== UI (preserved styling) ========
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header (UNCHANGED look) */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Basketball AI</Badge>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Basketball Video</h1>
            <p className="text-gray-600">
              Upload your basketball footage for AI-powered analysis and highlight generation
            </p>
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
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedFile ? selectedFile.name : "Choose Basketball Video"}
                    </h3>
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
                          <p className="text-sm text-blue-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                          </p>
                          <p className="text-sm text-green-600 mt-1">✅ Ready for AI analysis</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFile && (
                    <Button
                      onClick={handleUpload}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      size="lg"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze Basketball Video
                    </Button>
                  )}

                  {/*3 feature cards */}
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

          {/*Uploading / Processing*/}
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
                    {uploadState === "uploading" ? "Uploading" : "Analyzing"} {selectedFile?.name}
                    … {progress}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/*Complete*/}
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

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-2">AI Analysis Complete!</h3>
                      <p className="text-gray-600 mb-4">
                        {uploadResult.fileName} ({(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB)
                      </p>

                      {/*Preview */}
                      <div className="relative w-full max-w-md mx-auto">
                        <video
                          ref={videoRef}
                          className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                          src={downloadUrl ?? undefined}
                          muted
                          playsInline
                          controls
                          onEnded={() => setEnded(true)}
                        />
                        {downloadUrl && (
                          <Button onClick={handleDownload} className="bg-orange-500 hover:bg-orange-600 mt-4">
                            <Download className="w-4 h-4 mr-2" />
                            Download Highlight
                          </Button>
                        )}
                        {/*Show in Dashboard Button */}
                        <Link href="/dashboard">
                          <Button variant="secondary" className="mt-2">
                            Show in Dashboard
                          </Button>
                        </Link>
                      </div>
                    </div>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
