"use client";
import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  start?: number; // seconds
  end?: number;   // seconds
  isPlaying?: boolean;
  onEnded?: () => void;
}

export default function VideoPlayer({
  videoUrl,
  start,
  end,
  isPlaying = false,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Seek and play when start changes
  useEffect(() => {
    if (!videoRef.current || start === undefined) return;
    videoRef.current.currentTime = start;
    if (isPlaying) videoRef.current.play();
  }, [start, isPlaying]);

  // Auto-stop when reaching the end timestamp
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || end === undefined) return;

    const handleTimeUpdate = () => {
      if (vid.currentTime >= end) {
        vid.pause();
        onEnded?.();
      }
    };

    vid.addEventListener("timeupdate", handleTimeUpdate);
    return () => vid.removeEventListener("timeupdate", handleTimeUpdate);
  }, [end, onEnded]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      muted
      className="rounded-xl w-full shadow-lg"
    />
  );
}
