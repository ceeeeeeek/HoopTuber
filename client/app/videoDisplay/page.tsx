// videoDisplay/page.tsx

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pause,
  Zap,
  FastForward,
  Upload,
  FileVideo,
  Brain,
  CheckCircle,
} from "lucide-react";
import ClipDropdownPanel from "@/app/app-components/ClipDropdownPanel";
import ProfileDropdown from "../app-components/ProfileDropdown";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-web-service-docker.onrender.com";

interface GeminiShotEvent {
  id: string;
  timestamp_end: string;
  timestamp_start: string;
  outcome: string;
  subject: string;
  shot_type: string;
  shot_location: string;
}

interface HighlightData {
  ok: boolean;
  jobId: string;
  sourceVideoUrl: string;
  rawEvents: GeminiShotEvent[];
  ranges: [number, number][]; // [start_seconds, end_seconds]
}

export default function VideoDisplayPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Session check
  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (!data?.user) {
        router.push("/login?next=/videoDisplay");
      }
    };
    checkSession();
  }, [router]);

  // Upload states
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "complete">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  // Highlight data states
  const [highlightData, setHighlightData] = useState<HighlightData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Video playback states
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState<number | null>(null);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Edit states
  const [editedEvents, setEditedEvents] = useState<Map<number, Partial<GeminiShotEvent>>>(new Map());
  const [editedRanges, setEditedRanges] = useState<Map<number, [number, number]>>(new Map());

  // File select handler
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".mp4")) {
      alert("This file will be converted to an mp4 file.");
    }
    setSelectedFile(file);
    setUploadState("idle");
    setHighlightData(null);
    setProgress(0);
    setStatusMessage("");
    setJobId(null);
    setError(null);
  }, []);
  const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);  // ← Browser can read this without uploading!
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);  // ← Creates local blob URL
  });
};

    // NEW: Upload handler with client-side direct upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadState("uploading");
      setProgress(5);
      setStatusMessage("Initializing upload...");
      const videoDuration = await getVideoDuration(selectedFile);
      console.log("Video duration:", videoDuration, "seconds");
      // Step 1: Get signed upload URL from backend
      const initResponse = await fetch(`${API_BASE}/vertex/upload/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-email": session?.user?.email || "",
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type || "video/mp4",
          userId: session?.user?.email,
          videoDurationSec: Math.floor(videoDuration)
        }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Init failed: ${initResponse.statusText}`);
      }

      const { jobId: newJobId, uploadUrl, videoGcsUri } = await initResponse.json();
      console.log("Upload initialized:", { jobId: newJobId, videoGcsUri });

      setJobId(newJobId);
      setProgress(10);
      setStatusMessage("Uploading video to cloud storage...");

      // Step 2: Upload directly to GCS using signed URL with progress tracking
      await uploadToGCS(uploadUrl, selectedFile, (percent) => {
        // Map upload progress from 10% to 50%
        const mappedProgress = 10 + (percent * 0.4);
        setProgress(mappedProgress);
        setStatusMessage(`Uploading video... ${Math.floor(percent)}%`);
      });

      console.log("Upload to GCS complete");
      setProgress(50);
      setStatusMessage("Finalizing upload...");

      // Step 3: Notify backend that upload is complete
      const completeResponse = await fetch(`${API_BASE}/vertex/upload/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-email": session?.user?.email || "",
        },
        body: JSON.stringify({
          jobId: newJobId,
          userId: session?.user?.email,
        }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Complete failed: ${completeResponse.statusText}`);
      }

      console.log("Upload complete, analysis queued");
      setProgress(55);
      setUploadState("processing");
      setStatusMessage("Analyzing video with Vertex AI...");

      // Step 4: Poll for results
      pollForResults(newJobId);

    } catch (err) {
      console.error("Upload error:", err);
      setError((err as Error).message);
      alert("Upload failed: " + (err as Error).message);
      setUploadState("idle");
    }
  };

  // NEW: Helper function to upload to GCS with progress tracking
  const uploadToGCS = (
    signedUrl: string, 
    file: File, 
    onProgress: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 201) {
          console.log("GCS upload successful");
          resolve();
        } else {
          console.error("GCS upload failed:", xhr.status, xhr.responseText);
          reject(new Error(`Upload to GCS failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        console.error("GCS upload network error");
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        console.error("GCS upload aborted");
        reject(new Error("Upload was aborted"));
      });

      // Send the request
      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      
      // Important: Don't set other headers - signed URL handles auth
      xhr.send(file);
    });
  };

  // Poll for analysis results
  const pollForResults = async (jobId: string) => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const response = await fetch(`${API_BASE}/vertex/jobs/${jobId}/result`);

        if (response.ok) {
          const data: HighlightData = await response.json();
          console.log("Vertex analysis complete:", data);

          setHighlightData(data);
          setUploadState("complete");
          setProgress(100);
          setStatusMessage("Analysis complete!");
          return;
        }

        if (response.status === 409) {
          // Still processing
          const progressPercent = Math.min(50 + (attempts * 0.5), 95);
          setProgress(progressPercent);
          setStatusMessage(`Analyzing video... (${Math.floor(progressPercent)}%)`);

          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            throw new Error("Analysis timeout - please check back later");
          }
        } else if (response.status === 404) {
          throw new Error("Job not found");
        } else {
          throw new Error(`Analysis failed: ${response.statusText}`);
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError((err as Error).message);
        setUploadState("idle");
      }
    };

    poll();
  };

  // Reset for new upload
  const resetUpload = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setHighlightData(null);
    setProgress(0);
    setStatusMessage("");
    setJobId(null);
    setError(null);
    setCurrentHighlightIndex(null);
    setIsSequencePlaying(false);
    setIsPlaying(false);
  };

  // Helper to get the current (possibly edited) range for a highlight
  const getRange = (index: number): [number, number] => {
    if (editedRanges.has(index)) {
      return editedRanges.get(index)!;
    }
    return highlightData?.ranges[index] || [0, 0];
  };

  // Helper to get the current (possibly edited) event for a highlight
  const getEvent = (index: number): GeminiShotEvent => {
    const originalEvent = highlightData?.rawEvents[index];
    if (!originalEvent) return {} as GeminiShotEvent;

    if (editedEvents.has(index)) {
      return { ...originalEvent, ...editedEvents.get(index) };
    }
    return originalEvent;
  };

  // Callback to handle updates from ClipDropdownPanel
  const handleEventUpdate = (
    index: number,
    updatedEvent: Partial<GeminiShotEvent>,
    updatedRange: [number, number]
  ) => {
    // Update edited events
    setEditedEvents((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, { ...newMap.get(index), ...updatedEvent });
      return newMap;
    });

    // Update edited ranges
    setEditedRanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, updatedRange);
      return newMap;
    });
  };

  // Sequential playback logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !highlightData) return;

    const handleTimeUpdate = () => {
      if (!isSequencePlaying || currentHighlightIndex === null) return;

      const [_, endTime] = getRange(currentHighlightIndex);

      if (video.currentTime >= endTime) {
        const nextIndex = currentHighlightIndex + 1;

        if (nextIndex < highlightData.ranges.length) {
          const [nextStartTime] = getRange(nextIndex);
          console.log(`Skipping to highlight #${nextIndex + 1} at ${nextStartTime}s`);
          video.currentTime = nextStartTime;
          setCurrentHighlightIndex(nextIndex);
        } else {
          console.log("All highlights finished.");
          video.pause();
          setIsSequencePlaying(false);
          setIsPlaying(false);
          setCurrentHighlightIndex(null);
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentHighlightIndex, highlightData, isSequencePlaying, editedRanges]);

  // Play all highlights sequentially
  const handlePlayAll = () => {
    const video = videoRef.current;
    if (!video || !highlightData || highlightData.ranges.length === 0) return;

    const [firstStart] = getRange(0);
    video.currentTime = firstStart;
    setCurrentHighlightIndex(0);
    setIsSequencePlaying(true);
    video.play().then(() => setIsPlaying(true));
  };

  // Play single clip
  const handleHighlightClick = (index: number) => {
    const video = videoRef.current;
    if (!video || !highlightData) return;

    const [startTime] = getRange(index);
    video.currentTime = startTime;
    setCurrentHighlightIndex(index);
    setIsSequencePlaying(true);
    video.play().then(() => setIsPlaying(true));
  };

  // Preview single clip
  const handlePreviewClick = (index: number) => {
    const video = videoRef.current;
    if (!video || !highlightData) return;

    const [startTime] = getRange(index);
    video.currentTime = startTime;
    setCurrentHighlightIndex(index);
    setIsSequencePlaying(true);
    video.play().then(() => setIsPlaying(true));
    console.log(`Previewing highlight #${index + 1} with range: ${getRange(index)}`);
  };

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
            <Badge variant="secondary">Vertex AI Analysis</Badge>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">HoopTuber AI Video Analysis</h1>
            <p className="text-gray-600">Upload your basketball footage for advanced AI-powered highlight detection</p>
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
                    <p className="text-gray-600 mb-4">MP4 - Any size supported</p>

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
                          <p className="text-sm text-green-600 mt-1">✅ Ready for Vertex AI analysis</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFile && (
                    <Button onClick={handleUpload} className="w-full bg-orange-500 hover:bg-orange-600" size="lg">
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze with Vertex AI
                    </Button>
                  )}
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
                  {uploadState === "uploading" ? "Uploading Video" : "Processing with Vertex AI"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 font-medium">{statusMessage}</p>
                      <p className="text-sm text-gray-500">{Math.floor(progress)}%</p>
                    </div>
                  </div>
                  <p className="text-center text-gray-500 text-sm">{selectedFile?.name}</p>
                  {jobId && (
                    <p className="text-center text-xs text-gray-400">Job ID: {jobId}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete - Show Video Player and Highlights */}
          {uploadState === "complete" && highlightData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    Analysis Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-gray-600">
                      Found {highlightData.rawEvents.length} highlights in your video
                    </p>
                    <Button onClick={resetUpload} variant="outline">
                      Analyze Another Video
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Video Player */}
              <Card className="overflow-hidden">
                <div className="bg-black relative aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    src={highlightData.sourceVideoUrl}
                    controls
                    muted={true}
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Overlay badge showing current highlight */}
                  {currentHighlightIndex !== null && isSequencePlaying && (
                    <div className="absolute top-4 right-4 animate-in fade-in duration-300">
                      <Badge className="bg-orange-500/90 hover:bg-orange-600 border-none text-white px-3 py-1 shadow-lg backdrop-blur-sm">
                        Playing Highlight {currentHighlightIndex + 1} of {highlightData.ranges.length}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handlePlayAll}
                        size="lg"
                        className={`${
                          isSequencePlaying ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"
                        } transition-all`}
                      >
                        {isSequencePlaying && isPlaying ? (
                          <>
                            <Pause className="w-5 h-5 mr-2" /> Stop Sequence
                          </>
                        ) : (
                          <>
                            <FastForward className="w-5 h-5 mr-2" /> Play Full Highlight Reel
                          </>
                        )}
                      </Button>

                      <p className="text-sm text-gray-500">
                        {isSequencePlaying
                          ? "Auto-skipping non-highlight segments..."
                          : "Watch highlights sequentially"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Highlights List with Editable Panels */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-orange-500" />
                    Highlight Segments
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Click any highlight to play, or expand to edit details and timestamps
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {highlightData.rawEvents.map((event, index) => {
                      const currentEvent = getEvent(index);
                      const currentRange = getRange(index);
                      const isActive = currentHighlightIndex === index;

                      return (
                        <ClipDropdownPanel
                          key={event.id || index}
                          index={index}
                          event={currentEvent}
                          range={currentRange}
                          isActive={isActive}
                          isPlaying={isPlaying}
                          onPlayClick={handleHighlightClick}
                          onPreviewClick={handlePreviewClick}
                          onEventUpdate={handleEventUpdate}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600 text-center">{error}</p>
                <Button onClick={resetUpload} variant="outline" className="w-full mt-4">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
