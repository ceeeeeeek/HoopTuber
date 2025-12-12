"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, MapPin, Clock, Play, Pause } from "lucide-react";

interface GeminiShotEvent {
  id: string;
  timestamp_end: string;
  timestamp_start: string;
  outcome: string;
  subject: string;
  shot_type: string;
  shot_location: string;
}

interface ClipDropdownPanelProps {
  index: number;
  event: GeminiShotEvent;
  range: [number, number]; // [start_seconds, end_seconds]
  isActive?: boolean;
  isPlaying?: boolean;
  onPlayClick: (index: number) => void;
  onPreviewClick: (index: number) => void;
  onEventUpdate: (index: number, updatedEvent: Partial<GeminiShotEvent>, updatedRange: [number, number]) => void;
}

// Helper to format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Helper to parse time input (supports MM:SS or just seconds)
const parseTimeInput = (input: string): number => {
  if (!input) return 0;

  // If it's just a number, treat as seconds
  if (!input.includes(":")) {
    return parseFloat(input) || 0;
  }

  // Parse MM:SS format
  const parts = input.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
};

export default function ClipDropdownPanel({
  index,
  event,
  range,
  isActive = false,
  isPlaying = false,
  onPlayClick,
  onPreviewClick,
  onEventUpdate,
}: ClipDropdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Local state for editable fields
  const [outcome, setOutcome] = useState(event.outcome);
  const [subject, setSubject] = useState(event.subject || "");
  const [shotType, setShotType] = useState(event.shot_type);
  const [shotLocation, setShotLocation] = useState(event.shot_location);
  const [startTimeInput, setStartTimeInput] = useState(formatTime(range[0]));
  const [endTimeInput, setEndTimeInput] = useState(formatTime(range[1]));

  // Helper to get badge color
  const getShotOutcomeColor = (outcome?: string) => {
  if (!outcome) return "bg-gray-500";
  return outcome.toLowerCase().includes("make")
    ? "bg-green-500"
    : "bg-red-500";
  };
  // Handler to emit updates to parent
  const handleUpdate = () => {
    const updatedStartSeconds = parseTimeInput(startTimeInput);
    const updatedEndSeconds = parseTimeInput(endTimeInput);

    onEventUpdate(
      index,
      {
        outcome,
        subject,
        shot_type: shotType,
        shot_location: shotLocation,
      },
      [updatedStartSeconds, updatedEndSeconds]
    );
  };

  // Auto-update parent when any field changes
  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case "outcome":
        setOutcome(value);
        break;
      case "subject":
        setSubject(value);
        break;
      case "shotType":
        setShotType(value);
        break;
      case "shotLocation":
        setShotLocation(value);
        break;
      case "startTime":
        setStartTimeInput(value);
        break;
      case "endTime":
        setEndTimeInput(value);
        break;
    }

    // Debounced update would be better, but for now we update immediately
    setTimeout(() => handleUpdate(), 0);
  };

  return (
    <div
      className={`rounded-lg border-2 transition-all bg-white
        ${isActive
          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-200"
          : "border-gray-200 hover:border-orange-200"
        }`}
    >
      {/* Header - Always Visible */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${isActive ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600 group-hover:bg-orange-200"}`}
          >
            {index + 1}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getShotOutcomeColor(outcome)}>
                {outcome}
              </Badge>
              <span className="font-medium text-gray-900">{shotType}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> {shotLocation}
              </span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {startTimeInput} - {endTimeInput}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className={isActive ? "text-orange-600" : "text-gray-400 group-hover:text-orange-500"}
            onClick={(e) => {
              e.stopPropagation();
              onPlayClick(index);
            }}
          >
            {isActive && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expandable Editor Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-gray-200"
          >
            <div className="p-6 space-y-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Edit Highlight Details</h3>

              {/* Outcome Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Outcome</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={outcome.toLowerCase().includes("make") ? "default" : "outline"}
                    className={
                      outcome.toLowerCase().includes("make")
                        ? "flex-1 bg-green-500 hover:bg-green-600"
                        : "flex-1"
                    }
                    onClick={() => handleFieldChange("outcome", "Make")}
                  >
                    Make
                  </Button>
                  <Button
                    type="button"
                    variant={!outcome.toLowerCase().includes("make") ? "default" : "outline"}
                    className={
                      !outcome.toLowerCase().includes("make")
                        ? "flex-1 bg-red-500 hover:bg-red-600"
                        : "flex-1"
                    }
                    onClick={() => handleFieldChange("outcome", "Miss")}
                  >
                    Miss
                  </Button>
                </div>
              </div>

              {/* Subject / Player Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Subject / Player</label>
                <Input
                  value={subject}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  placeholder="Enter player name"
                  className="w-full"
                />
              </div>

              {/* Shot Type Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Shot Type</label>
                <Select
                  value={shotType}
                  onValueChange={(value) => handleFieldChange("shotType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shot type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Layup">Layup</SelectItem>
                    <SelectItem value="Dunk">Dunk</SelectItem>
                    <SelectItem value="Midrange Jump Shot">Midrange Jump Shot</SelectItem>
                    <SelectItem value="3-Point Jump Shot">3-Point Jump Shot</SelectItem>
                    <SelectItem value="Hook Shot">Hook Shot</SelectItem>
                    <SelectItem value="Free Throw">Free Throw</SelectItem>
                    <SelectItem value="Floater">Floater</SelectItem>
                    <SelectItem value="Step-back">Step-back</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shot Location Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Shot Location</label>
                <Select
                  value={shotLocation}
                  onValueChange={(value) => handleFieldChange("shotLocation", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Left Corner">Left Corner</SelectItem>
                    <SelectItem value="Right Corner">Right Corner</SelectItem>
                    <SelectItem value="Top of Key">Top of Key</SelectItem>
                    <SelectItem value="Left Wing">Left Wing</SelectItem>
                    <SelectItem value="Right Wing">Right Wing</SelectItem>
                    <SelectItem value="Paint">Paint</SelectItem>
                    <SelectItem value="Free Throw Line">Free Throw Line</SelectItem>
                    <SelectItem value="Baseline">Baseline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range Inputs */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Time Range (MM:SS)</label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={startTimeInput}
                    onChange={(e) => handleFieldChange("startTime", e.target.value)}
                    placeholder="0:00"
                    className="flex-1"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    value={endTimeInput}
                    onChange={(e) => handleFieldChange("endTime", e.target.value)}
                    placeholder="0:00"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Format: MM:SS (e.g., 1:23) or seconds (e.g., 83)
                </p>
              </div>

              {/* Preview Button */}
              <div className="pt-2">
                <Button
                  onClick={() => {
                    // Ensure parent state is updated before preview
                    handleUpdate();
                    // Trigger preview playback
                    setTimeout(() => onPreviewClick(index), 50);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  variant="default"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Preview with Current Edits
                </Button>
              </div>

              {/* Info Banner */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  Changes are saved in local state immediately. Backend saving not yet implemented.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
