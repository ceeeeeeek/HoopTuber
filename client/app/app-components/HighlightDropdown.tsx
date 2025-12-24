"use client";

// CLAUDE DROPDOWN VERS 1
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
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HighlightReviewPanelProps {
  index: number;
  startTime: string;
  endTime: string;
  videoUrl: string;
  outcome?: string;
  shotType?: string;
  shotLocation?: string;
}

export default function HighlightReviewPanel({
  index,
  startTime,
  endTime,
  videoUrl,
  outcome: initialOutcome,
  shotType: initialShotType,
  shotLocation: initialShotLocation,
}: HighlightReviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shotType, setShotType] = useState(initialShotType || "");
  const [shotLocation, setShotLocation] = useState(initialShotLocation || "");
  const [shotResult, setShotResult] = useState(
    initialOutcome?.toLowerCase().includes("make") ? "made" : "missed"
  );

  const handleReset = () => {
    setShotType(initialShotType || "");
    setShotLocation(initialShotLocation || "");
    setShotResult(initialOutcome?.toLowerCase().includes("make") ? "made" : "missed");
  };

  const handleSave = () => {
    console.log("Saving highlight", {
      index,
      shotType,
      shotLocation,
      shotResult,
      startTime,
      endTime,
    });
    // Add your save logic here
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">Highlight {index + 1}</Badge>
          <span className="text-sm text-gray-600">Start: {startTime}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4 border-t">
              {/* Video Preview */}
              <div className="w-full">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Shot Type Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Shot Type
                </label>
                <Select value={shotType} onValueChange={setShotType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select shot type" />
                  </SelectTrigger>
                  <SelectContent className="w-[400px]">
                    <SelectItem value="Layup">Layup</SelectItem>
                    <SelectItem value="Midrange">Midrange</SelectItem>
                    <SelectItem value="3-Point Jump Shot">
                      3-Point Jump Shot
                    </SelectItem>
                    <SelectItem value="Free Throw">Free Throw</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shot Location Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Shot Location
                </label>
                <Select value={shotLocation} onValueChange={setShotLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select shot location" />
                  </SelectTrigger>
                  <SelectContent className="w-[400px]">
                    <SelectItem value="Left Corner">Left Corner</SelectItem>
                    <SelectItem value="Right Corner">Right Corner</SelectItem>
                    <SelectItem value="Top of Key">Top of Key</SelectItem>
                    <SelectItem value="Paint">Paint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shot Result Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Shot Result
                </label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={shotResult === "made" ? "default" : "outline"}
                    className={
                      shotResult === "made"
                        ? "flex-1 bg-green-500 hover:bg-green-600"
                        : "flex-1"
                    }
                    onClick={() => setShotResult("made")}
                  >
                    Made
                  </Button>
                  <Button
                    type="button"
                    variant={shotResult === "missed" ? "default" : "outline"}
                    className={
                      shotResult === "missed"
                        ? "flex-1 bg-red-500 hover:bg-red-600"
                        : "flex-1"
                    }
                    onClick={() => setShotResult("missed")}
                  >
                    Missed
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Reset Changes
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  Save & Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
