"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

import {
  CheckCircle,
  Zap,
  ArrowLeft,
  BarChart3,
  Brain,
  Target,
  Download,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import ProfileDropdown from "../../app-components/ProfileDropdown";
import HighlightReviewPanel from "../../app-components/HighlightReviewPanel";

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

interface JobData {
  jobId: string;
  status: string;
  progress: number;
  videoUrl?: string;
  fileName?: string;
  fileSize?: number;
  shotEvents?: GeminiShotEvent[];
  gameStats?: {
    totalShots: number;
    madeShots: number;
    shootingPercentage: number;
    shotTypes: Record<string, number>;
    locations: Record<string, number>;
  };
}

export default function ViewUploadPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch job data from API
  useEffect(() => {
    const fetchJobData = async () => {
      if (!jobId) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/job_status/${jobId}`, {
          headers: {
            "x-owner-email": session?.user?.email || "",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch job data");
        }

        const data = await res.json();
        setJobData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching job data:", err);
        setError((err as Error).message);
        setLoading(false);
      }
    };

    fetchJobData();

    // Poll for updates if job is still processing
    const interval = setInterval(() => {
      if (jobData?.status === "processing" || jobData?.status === "uploading") {
        fetchJobData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId, session?.user?.email, jobData?.status]);

  const handleDownload = () => {
    if (!jobData?.videoUrl) return;
    const link = document.createElement("a");
    link.href = jobData.videoUrl;
    link.download = "hooptuber_highlight.mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/upload" className="flex items-center space-x-2">
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
        <div className="max-w-6xl mx-auto">
          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
                  <p className="text-gray-600">Loading video analysis...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => router.push("/upload")}>
                  Back to Upload
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Processing State */}
          {!loading && !error && jobData && (jobData.status === "processing" || jobData.status === "uploading") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-orange-500" />
                  Processing Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Progress value={jobData.progress} className="w-full" />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 font-medium">
                        Analyzing basketball footage...
                      </p>
                      <p className="text-sm text-gray-500">
                        {jobData.progress}%
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-gray-500 text-sm">
                    {jobData.fileName}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete State */}
          {!loading && !error && jobData && jobData.status === "complete" && (
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
                      {jobData.fileName && jobData.fileSize && (
                        <p className="text-gray-600 mb-4">
                          {jobData.fileName} ({(jobData.fileSize / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                      <div className="relative w-full max-w-md mx-auto">
                        {jobData.videoUrl && (
                          <video
                            ref={videoRef}
                            className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                            src={jobData.videoUrl}
                            muted
                            playsInline
                            controls
                            onEnded={() => setEnded(true)}
                          />
                        )}

                        {jobData.shotEvents && jobData.shotEvents.length > 0 && (
                          <div className="mt-8 space-y-4">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <Zap className="w-4 h-4 mr-2 text-orange-500" />
                              Review & Edit Highlights
                            </h3>
                            <div className="w-full max-w-6xl mx-auto space-y-6">
                              {jobData.shotEvents.map((shot, idx) => (
                                <HighlightReviewPanel
                                  key={idx}
                                  index={idx}
                                  startTime={shot.timestamp_start}
                                  endTime={shot.timestamp_end}
                                  videoUrl={`${API_BASE}/stream/${jobId}#t=${shot.timestamp_start}`}
                                  outcome={shot.outcome}
                                  shotType={shot.shot_type}
                                  shotLocation={shot.shot_location}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {jobData.videoUrl && (
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

                    {jobData.gameStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{jobData.gameStats.totalShots}</div>
                          <div className="text-sm text-gray-600">Shots Detected</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{jobData.gameStats.shootingPercentage}%</div>
                          <div className="text-sm text-gray-600">Shooting %</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{jobData.gameStats.madeShots}</div>
                          <div className="text-sm text-gray-600">Makes</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Object.keys(jobData.gameStats.shotTypes).length}
                          </div>
                          <div className="text-sm text-gray-600">Shot Types</div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button className="flex-1" asChild>
                        <Link href="/dashboard">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Dashboard
                        </Link>
                      </Button>
                      <Button variant="outline" className="flex-1" asChild>
                        <Link href="/upload">
                          Analyze Another Video
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {jobData.shotEvents && jobData.shotEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Shot-by-Shot Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {jobData.shotEvents.map((shot, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">Shot #{idx + 1}</span>
                            <Badge variant={shot.outcome.toLowerCase().includes("make") ? "default" : "secondary"}>
                              {shot.outcome}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>Type: {shot.shot_type}</div>
                            <div>Location: {shot.shot_location}</div>
                            <div>Start: {shot.timestamp_start}</div>
                            <div>End: {shot.timestamp_end}</div>
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
