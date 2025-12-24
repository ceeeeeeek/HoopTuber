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
import { ChevronDown, ChevronUp, MapPin, Clock, Play, Pause, Save, X, Trash2 } from "lucide-react";

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
  isDeleting?: boolean;
  onPlayClick: (index: number) => void;
  onPreviewClick: (index: number) => void;
  onEventUpdate: (index: number, updatedEvent: Partial<GeminiShotEvent>, updatedRange: [number, number]) => void;
  isNewHighlight?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: (index: number) => void;
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
  isDeleting = false,
  onPlayClick,
  onPreviewClick,
  onEventUpdate,
  isNewHighlight = false,
  onSave,
  onCancel,
  onDelete,
}: ClipDropdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(isNewHighlight); // Auto-expand if new highlight
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Delete confirmation state

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
    // 1. Update the UI state (so the input box shows what you typed)
    switch (field) {
      case "outcome": setOutcome(value); break;
      case "subject": setSubject(value); break;
      case "shotType": setShotType(value); break;
      case "shotLocation": setShotLocation(value); break;
      case "startTime": setStartTimeInput(value); break;
      case "endTime": setEndTimeInput(value); break;
    }

    // 2. DETERMINE THE FRESH VALUES
    // If the field matches what we are typing, use the raw 'value'. 
    // Otherwise, use the existing state.
    const nextOutcome = field === "outcome" ? value : outcome;
    const nextSubject = field === "subject" ? value : subject;
    const nextShotType = field === "shotType" ? value : shotType;
    const nextShotLocation = field === "shotLocation" ? value : shotLocation;
    
    // THIS FIXES THE BUG:
    // If we are typing the end time, use 'value' ("0:12"), NOT 'endTimeInput' ("0:1")
    const nextStartTime = field === "startTime" ? value : startTimeInput;
    const nextEndTime = field === "endTime" ? value : endTimeInput;

    // 3. Parse immediately using the FRESH values
    const updatedStartSeconds = parseTimeInput(nextStartTime);
    const updatedEndSeconds = parseTimeInput(nextEndTime);

    // 4. Send to Parent (bypassing handleUpdate entirely)
    onEventUpdate(
      index,
      {
        outcome: nextOutcome,
        subject: nextSubject,
        shot_type: nextShotType,
        shot_location: nextShotLocation,
      },
      [updatedStartSeconds, updatedEndSeconds]
    );
  };
  // Auto-update parent when any field changes
  // const handleFieldChange = (field: string, value: string) => {
  //   switch (field) {
  //     case "outcome":
  //       setOutcome(value);
  //       break;
  //     case "subject":
  //       setSubject(value);
  //       break;
  //     case "shotType":
  //       setShotType(value);
  //       break;
  //     case "shotLocation":
  //       setShotLocation(value);
  //       break;
  //     case "startTime":
  //       setStartTimeInput(value);
  //       break;
  //     case "endTime":
  //       setEndTimeInput(value);
  //       break;
  //   }

  //   // Debounced update would be better, but for now we update immediately
  //   setTimeout(() => handleUpdate(), 0);
  // };

  return (
    <motion.div
      layout
      initial={{ opacity: 1, height: "auto" }}
      animate={isDeleting ? { opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" } : { opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`rounded-lg border-2 transition-all bg-white overflow-hidden
        ${isNewHighlight
          ? "border-green-500 bg-green-50 ring-1 ring-green-200"
          : isActive
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
              ${isNewHighlight
                ? "bg-green-500 text-white"
                : isActive
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-600 group-hover:bg-orange-200"
              }`}
          >
            {isNewHighlight ? "+" : index + 1}
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

              {/* Shot Type and Shot Location Dropdowns - Side by Side */}
              <div className="flex gap-4">
                {/* Shot Type Dropdown */}
                <div className="space-y-2 flex-1">
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
                <div className="space-y-2 flex-1">
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

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {isNewHighlight ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={onCancel}
                      variant="outline"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        handleUpdate();
                        onSave?.();
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      variant="default"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <>
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

                    {/* Save and Delete Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          handleUpdate();
                          onSave?.();
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        variant="default"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>

                      {showDeleteConfirm ? (
                        <div className="flex-1 flex gap-2">
                          <Button
                            onClick={() => setShowDeleteConfirm(false)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            No
                          </Button>
                          <Button
                            onClick={() => {
                              onDelete?.(index);
                              setShowDeleteConfirm(false);
                            }}
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                          >
                            Yes
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowDeleteConfirm(true)}
                          variant="destructive"
                          className="flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>

                    {showDeleteConfirm && (
                      <p className="text-sm text-red-600 text-center font-medium">
                        Are you sure you want to delete this highlight?
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Info Banner */}
              {!isNewHighlight && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    Changes are saved in local state immediately. Backend saving not yet implemented.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
