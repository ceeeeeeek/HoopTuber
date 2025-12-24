// videoDisplay/page.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Pause,
  Zap,
  FastForward,
  Upload,
  FileVideo,
  Brain,
  CheckCircle,
  Plus,
  X,
} from "lucide-react";
import ClipDropdownPanel from "@/app/app-components/ClipDropdownPanel";
import ProfileDropdown from "../../app-components/ProfileDropdown";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-web-service-docker.onrender.com";

// ... (Interfaces remain the same) ...
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
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: session } = useSession();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [highlightData, setHighlightData] = useState<HighlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which highlight we are currently inside
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState<number | null>(null);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false); // New state for "Play All" mode
  const [isPlaying, setIsPlaying] = useState(false);

  // State for edited events - stores user modifications
  const [editedEvents, setEditedEvents] = useState<Map<number, Partial<GeminiShotEvent>>>(new Map());
  const [editedRanges, setEditedRanges] = useState<Map<number, [number, number]>>(new Map());
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // New highlight states
  const [isAddingNewHighlight, setIsAddingNewHighlight] = useState(false);
  const [newHighlight, setNewHighlight] = useState<{event: Partial<GeminiShotEvent>, range: [number, number]} | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Fetch highlight data on mount
  useEffect(() => {
    if (!jobId) return;

    const fetchHighlightData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/jobs/${jobId}/highlight-data`);

        if (!response.ok) {
          // Check if this is an analysis failure error
          if (response.status === 500) {
            const errorData = await response.json();
            if (errorData.detail && errorData.detail.includes("Analysis failed")) {
              throw new Error("No highlights generated for this video");
            }
          }
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data: HighlightData = await response.json();
        console.log("Fetched highlight data:", data.sourceVideoUrl);
        // Sort ranges by start time to ensure sequential playback works correctly
        // (Optional safety check, assuming API returns sorted)
        // data.ranges.sort((a, b) => a[0] - b[0]);

        setHighlightData(data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchHighlightData();
  }, [jobId]);

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

  // Callback to handle updates for new highlight
  const handleNewHighlightUpdate = (
    _index: number,
    updatedEvent: Partial<GeminiShotEvent>,
    updatedRange: [number, number]
  ) => {
    setNewHighlight({ event: updatedEvent, range: updatedRange });
  };

  // Handler for adding a new highlight
  const handleAddNewHighlight = () => {
    setIsAddingNewHighlight(true);
    setNewHighlight({
      event: {
        outcome: "Make",
        subject: "",
        shot_type: "Layup",
        shot_location: "Paint",
      },
      range: [0, 0]
    });
  };

  // Handler for saving new highlight
  const handleSaveNewHighlight = async () => {
    if (!newHighlight || !jobId) return;

    try {
      const response = await fetch(`${API_BASE}/jobs/${jobId}/shot-events/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-email": session?.user?.email || "",
        },
        body: JSON.stringify({
          timestamp_start: newHighlight.range[0].toString(),
          timestamp_end: newHighlight.range[1].toString(),
          outcome: newHighlight.event.outcome || "Make",
          subject: newHighlight.event.subject || "",
          shot_type: newHighlight.event.shot_type || "Layup",
          shot_location: newHighlight.event.shot_location || "Paint",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save highlight: ${response.statusText}`);
      }

      // Show success alert
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);

      // Reset new highlight state
      setIsAddingNewHighlight(false);
      setNewHighlight(null);

      // Refresh highlight data
      if (jobId) {
        const refreshResponse = await fetch(`${API_BASE}/jobs/${jobId}/highlight-data`);
        if (refreshResponse.ok) {
          const data: HighlightData = await refreshResponse.json();
          setHighlightData(data);
        }
      }
    } catch (err) {
      console.error("Error saving new highlight:", err);
      alert("Failed to save highlight: " + (err as Error).message);
    }
  };

  // Handler for canceling new highlight
  const handleCancelNewHighlight = () => {
    setIsAddingNewHighlight(false);
    setNewHighlight(null);
  };

  // Handler for deleting a highlight
  const handleDeleteHighlight = async (index: number) => {
    if (!highlightData || !jobId) return;

    const eventToDelete = highlightData.rawEvents[index];
    if (!eventToDelete) return;

    // Set deleting state to trigger fade-out animation
    setDeletingIndex(index);

    try {
      const response = await fetch(`${API_BASE}/jobs/${jobId}/shot-events/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-email": session?.user?.email || "",
        },
        body: JSON.stringify({
          event_id: eventToDelete.id,
        }),
      });

      if (!response.ok) {
        setDeletingIndex(null); // Reset on error
        throw new Error(`Failed to delete highlight: ${response.statusText}`);
      }

      const data = await response.json();

      // Wait for animation to complete before updating data
      setTimeout(() => {
        // Update highlight data with new shot events
        if (data.shotEvents) {
          setHighlightData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              rawEvents: data.shotEvents,
              ranges: data.shotEvents.map((event: GeminiShotEvent) => [
                parseFloat(event.timestamp_start),
                parseFloat(event.timestamp_end),
              ]),
            };
          });

          // Clear any edits for deleted highlight
          setEditedEvents((prev) => {
            const newMap = new Map(prev);
            newMap.delete(index);
            return newMap;
          });

          setEditedRanges((prev) => {
            const newMap = new Map(prev);
            newMap.delete(index);
            return newMap;
          });

          // Reset current highlight if it was playing
          if (currentHighlightIndex === index) {
            setCurrentHighlightIndex(null);
            setIsSequencePlaying(false);
          }
        }

        // Reset deleting state
        setDeletingIndex(null);
      }, 300); // Match animation duration
    } catch (err) {
      console.error("Error deleting highlight:", err);
      alert("Failed to delete highlight: " + (err as Error).message);
      setDeletingIndex(null);
    }
  };

  // --- THE SEQUENTIAL PLAYBACK LOGIC ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !highlightData) return;

    const handleTimeUpdate = () => {
      if (!isSequencePlaying || currentHighlightIndex === null) return;

      const [_, endTime] = getRange(currentHighlightIndex);

      // Buffer of 0.3s to prevent skipping too early, but ensure we catch the end
      if (video.currentTime >= endTime) {
        // We reached the end of the current clip. Is there a next one?
        const nextIndex = currentHighlightIndex + 1;

        if (nextIndex < highlightData.ranges.length) {
          // YES: Jump to the start of the next clip
          const [nextStartTime] = getRange(nextIndex);
          console.log(`Skipping to highlight #${nextIndex + 1} at ${nextStartTime}s`);

          video.currentTime = nextStartTime;
          setCurrentHighlightIndex(nextIndex);
          // Video keeps playing automatically
        } else {
          // NO: We finished the last highlight
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


  // 1. Play All (Start sequence from beginning)
  const handlePlayAll = () => {
    const video = videoRef.current;
    if (!video || !highlightData || highlightData.ranges.length === 0) return;

    // Start at the very first highlight (use edited range if available)
    const [firstStart] = getRange(0);
    video.currentTime = firstStart;

    setCurrentHighlightIndex(0);
    setIsSequencePlaying(true); // Enable the skipping logic

    video.play().then(() => setIsPlaying(true));
  };

  // 2. Play Single Clip (Jump to specific, disable sequence)
  const handleHighlightClick = (index: number) => {
    const video = videoRef.current;
    if (!video || !highlightData) return;

    const [startTime] = getRange(index);
    video.currentTime = startTime;

    setCurrentHighlightIndex(index);
    setIsSequencePlaying(true); // Treat this as starting the sequence from this point
    // If you prefer it to STOP after this clip, set isSequencePlaying(false) here.

    video.play().then(() => setIsPlaying(true));
  };

  // 3. Preview Single Clip with Edited Range (plays only that one segment)
  const handlePreviewClick = (index: number) => {
    const video = videoRef.current;
    if (!video || !highlightData) return;

    // Always use the current edited range for preview
    const [startTime] = getRange(index);
    video.currentTime = startTime;

    setCurrentHighlightIndex(index);
    setIsSequencePlaying(true); // Enable auto-stop at end of this clip

    video.play().then(() => setIsPlaying(true));

    console.log(`Previewing highlight #${index + 1} with range: ${getRange(index)}`);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* ... Header ... */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
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
            <Badge variant="secondary">AI Analysis</Badge>
            <ProfileDropdown />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">Loading highlight data...</p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {!loading && error && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-red-600 font-semibold text-lg mb-2">Error</p>
                <p className="text-gray-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && highlightData && (
            <div className="space-y-6">
              {/* Two-Column Layout: Resizable Video + Scrollable Highlights */}
              <PanelGroup direction="horizontal" className="gap-6">
                {/* Left Panel: Video Player */}
                <Panel defaultSize={50} minSize={30}>
                  <div className="lg:sticky lg:top-6 lg:self-start">
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
                        <div className="flex flex-col gap-4">
                          {/* MAIN ACTION: Play All Sequence */}
                          <Button
                            onClick={handlePlayAll}
                            size="lg"
                            className={`w-full ${isSequencePlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} transition-all`}
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

                          <p className="text-sm text-gray-500 text-center">
                             {isSequencePlaying
                               ? "Auto-skipping non-highlight segments..."
                               : "Watch highlights sequentially"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Panel>

                {/* Resize Handle */}
                <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-orange-300 transition-colors rounded-full cursor-col-resize" />

                {/* Right Panel: Scrollable Highlights List */}
                <Panel defaultSize={50} minSize={30}>
                  <Card className="lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden flex flex-col h-full">
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-orange-500" />
                        Highlight Segments ({highlightData.rawEvents.length})
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Click any highlight to play, or expand to edit details and timestamps
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                      <div className="space-y-3 pr-2">
                        {/* Success Alert */}
                        {showSuccessAlert && (
                          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-in fade-in duration-300">
                            <p className="text-sm text-green-800 font-medium">
                              Highlight successfully added!
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSuccessAlert(false)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {highlightData.rawEvents.map((event, index) => {
                          const currentEvent = getEvent(index);
                          const currentRange = getRange(index);
                          const isActive = currentHighlightIndex === index;
                          const isDeleting = deletingIndex === index;

                          return (
                            <ClipDropdownPanel
                              key={event.id || index}
                              index={index}
                              event={currentEvent}
                              range={currentRange}
                              isActive={isActive}
                              isPlaying={isPlaying}
                              isDeleting={isDeleting}
                              onPlayClick={handleHighlightClick}
                              onPreviewClick={handlePreviewClick}
                              onEventUpdate={handleEventUpdate}
                              onDelete={handleDeleteHighlight}
                            />
                          );
                        })}

                        {/* New Highlight Panel */}
                        {isAddingNewHighlight && newHighlight && (
                          <ClipDropdownPanel
                            key="new-highlight"
                            index={-1}
                            event={{
                              id: "new",
                              timestamp_start: newHighlight.range[0].toString(),
                              timestamp_end: newHighlight.range[1].toString(),
                              outcome: newHighlight.event.outcome || "Make",
                              subject: newHighlight.event.subject || "",
                              shot_type: newHighlight.event.shot_type || "Layup",
                              shot_location: newHighlight.event.shot_location || "Paint",
                            }}
                            range={newHighlight.range}
                            isActive={false}
                            isPlaying={false}
                            onPlayClick={() => {}}
                            onPreviewClick={handlePreviewClick}
                            onEventUpdate={handleNewHighlightUpdate}
                            isNewHighlight={true}
                            onSave={handleSaveNewHighlight}
                            onCancel={handleCancelNewHighlight}
                          />
                        )}

                        {/* Add Highlight Button */}
                        {!isAddingNewHighlight && (
                          <Button
                            onClick={handleAddNewHighlight}
                            variant="outline"
                            className="w-full border-dashed border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 py-6"
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            Add New Highlight
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Panel>
              </PanelGroup>

              {/* ... Stats Section (Unchanged) ... */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}