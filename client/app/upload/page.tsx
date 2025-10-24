//client/app/upload/page.tsx - 10-23-25 Thursday Update
"use client";

import { useEffect, useRef, useState, useCallback } from "react";                         // PRESERVED
import { useRouter, useSearchParams } from "next/navigation";                             // NEW: useSearchParams
import Link from "next/link";                                                             // PRESERVED

import { Button } from "@/components/ui/button";                                          // PRESERVED
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";         // PRESERVED
import { Progress } from "@/components/ui/progress";                                      // PRESERVED
import { Badge } from "@/components/ui/badge";                                            // PRESERVED
import SelectFromDashboard from "./SelectFromDashboard";                                  // NEW

import {
  Upload, Play, CheckCircle, Zap, ArrowLeft, FileVideo, BarChart3,
  Brain, Target, TrendingUp, Clock, MapPin, User, Download,
} from "lucide-react";                                                                    // PRESERVED

import ProfileDropdown from "../app-components/ProfileDropdown";                          // PRESERVED

// PRESERVED: API base (works with your FastAPI)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
console.log("API_BASE =", process.env.NEXT_PUBLIC_API_BASE);

// PRESERVED: types
interface GeminiShotEvent {
  Subject: string
  Location: string
  ShotType: string
  TimeStamp: string
  Outcome: string
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
  const router = useRouter();
  const searchParams = useSearchParams();                                                // NEW

  // PRESERVED: ensure user is logged in (and cache email for API writes)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session", { method: "GET", credentials: "include", cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!data?.user) {
        router.push("/login?next=/upload")
        return
      }
      setUserEmail((data.user as any)?.email)
    }
    checkSession()
  }, [router])

  // PRESERVED: base UI states
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);

  // PRESERVED + NEW
  const [jobId, setJobId] = useState<string | null>(null);                                // NEW
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);                    // NEW

  // PRESERVED: timer ref
  const pollRef = useRef<number | null>(null);

  // PRESERVED: manual file select
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

  // NEW: adopt a RAW from a URL (dashboard handoff)
  const adoptRawFromUrl = useCallback(async (url: string, fileName = "raw-video.mp4") => {
    try {
      const res = await fetch(url, { credentials: "omit" }); // signed URLs typically work with omit
      if (!res.ok) throw new Error(`Failed to fetch RAW: ${res.status}`);
      const blob = await res.blob();
      const ext = (fileName.split(".").pop() || "mp4").toLowerCase();
      const mime = blob.type || (ext === "mov" ? "video/quicktime" : "video/mp4");
      const file = new File([blob], fileName, { type: mime });
      setSelectedFile(file);
      setUploadState("idle");
      setUploadResult(null);
      setProgress(0);
      setJobId(null);
      setDownloadUrl(null);
    } catch (e) {
      console.warn("Unable to auto-select RAW (CORS or URL issue).", e);
    }
  }, []);

  // NEW: when navigating from dashboard, auto-select the chosen RAW
  useEffect(() => {
    (async () => {
      // 1) Highest priority: explicit URL + optional filename
      const rawUrl = searchParams.get("rawUrl");
      const rawName = searchParams.get("fileName") || undefined;
      if (rawUrl) {
        await adoptRawFromUrl(rawUrl, rawName);
        return;
      }

      // 2) Next: rawId -> resolve via GET /api/rawVideos (no API change required)
      const rawId = searchParams.get("rawId");
      if (rawId) {
        try {
          const r = await fetch("/api/rawVideos?limit=200", { cache: "no-store" });
          const j = await r.json();
          if (j?.success) {
            const hit = (j.videos as any[]).find((x) => x.id === rawId);
            if (hit?.url) {
              await adoptRawFromUrl(hit.url, hit.fileName || "raw-video.mp4");
              return;
            }
          }
        } catch {}
      }

      // 3) Fallback: sessionStorage “stash” created by the dashboard
      try {
        const stash = sessionStorage.getItem("ht:rawForUpload");
        if (stash) {
          const it = JSON.parse(stash) as { url: string; fileName?: string };
          if (it?.url) {
            await adoptRawFromUrl(it.url, it.fileName || "raw-video.mp4");
            sessionStorage.removeItem("ht:rawForUpload");
          }
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, adoptRawFromUrl]);

  // PRESERVED helpers
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

  // PRESERVED polling
  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // NEW: persist to dashboard via your Next.js API routes
  const persistResultsToDashboard = async (args: {
    rawGcsUri?: string; highlightUrl?: string; filename: string; size: number;
    jobId: string; shotEvents?: GeminiShotEvent[];
  }) => {
    try {
      await fetch("/api/rawVideos", {
        method: "POST",
        body: JSON.stringify({
          fileName: args.filename,
          size: args.size,
          sourceUri: args.rawGcsUri ?? null,
          jobId: args.jobId,
          ownerEmail: userEmail ?? null,
        }),
      })
      if (args.highlightUrl) {
        await fetch("/api/highlightVideos", {
          method: "POST",
          body: JSON.stringify({
            jobId: args.jobId,
            downloadUrl: args.highlightUrl,
            ownerEmail: userEmail ?? null,
            stats: args.shotEvents ? calculateGameStats(args.shotEvents) : null,
          }),
        })
      }
    } catch (e) {
      console.warn("Note: could not persist to Firestore yet:", e)
    }
  }

  const startPolling = (id: string, filename: string, size: number) => {
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

            // NEW: write raw + highlight entries used by /dashboard
            await persistResultsToDashboard({
              rawGcsUri: data.videoGcsUri,
              highlightUrl: j.url,
              filename,
              size,
              jobId: id,
              shotEvents,
            })
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

  useEffect(() => () => stopPolling(), []);

  // PRESERVED upload handler (now calls startPolling with filename/size)
  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadState("uploading");
    setProgress(15);

    const formData = new FormData();
    formData.append("video", selectedFile);

    let progressInterval: number | null = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (progressInterval !== null) { window.clearInterval(progressInterval); progressInterval = null; }
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const response = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });

      if (progressInterval !== null) { window.clearInterval(progressInterval); progressInterval = null; }
      setProgress(100);

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const result = await response.json();

      if (result?.jobId) {
        setJobId(result.jobId);
        setUploadState("processing");
        setUploadResult({
          success: true,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          method: "queue_v1",
          verified: true,
          shotEvents: [],
        });
        startPolling(result.jobId, selectedFile.name, selectedFile.size); // NEW
        return;
      }

      // Legacy direct analysis path
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

  // PRESERVED reset
  const resetUpload = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setUploadResult(null);
    setProgress(0);
    setJobId(null);
    setDownloadUrl(null);
    stopPolling();
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

                  {/* NEW: pick an existing RAW from your dashboard */}
                  <SelectFromDashboard
                    onSelect={async (item) => {
                      if (!item) return;
                      sessionStorage.setItem("ht:rawForUpload", JSON.stringify({ url: item.url, fileName: item.fileName }));
                      await adoptRawFromUrl(item.url, item.fileName);
                    }}
                  />

                  {/* Divider */}
                  <div className="text-center text-sm text-gray-500">or upload from your computer</div>

                  {/* PRESERVED: dropzone + input */}
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
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || "video/mp4"}
                          </p>
                          <p className="text-sm text-green-600 mt-1">✅ Ready for AI analysis</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRESERVED: analyze button */}
                  {selectedFile && (
                    <Button onClick={handleUpload} className="w-full bg-orange-500 hover:bg-orange-600" size="lg">
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze Basketball Video
                    </Button>
                  )}

                  {/* PRESERVED: feature cards */}
                  {/* ... unchanged marketing cards ... */}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploading / Processing / Complete sections stay the same as you had */}
          {/* ... (unchanged sections omitted here for brevity) ... */}
        </div>
      </div>
    </div>
  );
}
