"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import DropdownMenu from "../../app-components/EditorDropdown";
import { Progress } from "@/components/ui/progress";

import  TimestampControls  from "../../app-components/TimestampControls" // optional
import  VideoPlayer from "../../app-components/VideoPlayer";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-web-service-docker.onrender.com";

export default function ReviewPage() {
  const { jobId } = useParams();
  const [timestamps, setTimestamps] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchJob = async () => {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/download`);
      const data = await res.json();

      setVideoUrl(data.url); // full video or highlight
      setTimestamps(data.shot_events || []); // Gemini timestamps
      setLoading(false);
    };

    fetchJob();
  }, [jobId]);

  const handleLabelChange = (index: number, newLabels: any) => {
    const updated = [...timestamps];
    updated[index] = { ...updated[index], ...newLabels };
    setTimestamps(updated);
  };

  const playSegment = (start: number, end: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      videoRef.current.play();
      const stopCheck = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime >= end) {
          videoRef.current.pause();
          clearInterval(stopCheck);
        }
      }, 200);
    }
  };

  if (loading) return <p className="text-center mt-12">Loading highlights...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>🏀 Review & Label Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="rounded-xl shadow-lg w-full mb-6"
            />
          )}

          {timestamps.map((t, i) => (
            <div
              key={i}
              className="border rounded-xl bg-white shadow-sm p-4 mb-6"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">
                  Highlight {i + 1} ({t.timestamp_start}s → {t.timestamp_end}s)
                </h3>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() =>
                    playSegment(Number(t.timestamp_start), Number(t.timestamp_end))
                  }
                >
                  ▶ Play
                </Button>
              </div>

              <DropdownMenu
                labels={{
                  player: t.subject || "",
                  shotType: t.shot_type || "",
                  result: t.outcome || "",
                  location: t.shot_location || "",
                }}
                onChange={(labels) => handleLabelChange(i, labels)}
              />
            </div>
          ))}

          <div className="text-center">
            <Button
              onClick={async () => {
                await fetch(`${API_BASE}/v2/labels`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ jobId, timestamps }),
                });
                alert("Saved!");
              }}
              className="bg-green-500 hover:bg-green-600"
            >
              Save Labels
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
