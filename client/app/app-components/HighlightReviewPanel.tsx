"use client";

// UPDATED DROPDOWN VERS 2
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

interface HighlightReviewPanelProps {
  index: number;
  startTime: string;
  endTime: string;
  videoUrl: string;
  outcome?: string;
  shotType?: string;
  shotLocation?: string;
  subject?: string;
}

export default function HighlightReviewPanel({
  index,
  startTime,
  endTime,
  videoUrl,
  outcome: initialOutcome,
  shotType: initialShotType,
  shotLocation: initialShotLocation,
  subject = "LeBron James",
}: HighlightReviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shotType, setShotType] = useState(initialShotType || "");
  const [shotLocation, setShotLocation] = useState(initialShotLocation || "");
  const [shotResult, setShotResult] = useState(
    initialOutcome?.toLowerCase().includes("make") ? "made" : "missed"
  );
  const [subjectName, setSubjectName] = useState(subject);
  const [timestampStart, setTimestampStart] = useState(startTime);
  const [timestampEnd, setTimestampEnd] = useState(endTime);

  // “Correct” checkboxes
  const [correctFields, setCorrectFields] = useState<Record<string, boolean>>({
    subject: false,
    type: false,
    location: false,
    result: false,
    timestamp: false,
  });

  const toggleCorrect = (field: string) =>
    setCorrectFields((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleReset = () => {
    setShotType(initialShotType || "");
    setShotLocation(initialShotLocation || "");
    setShotResult(initialOutcome?.toLowerCase().includes("make") ? "made" : "missed");
    setSubjectName(subject);
    setTimestampStart(startTime);
    setTimestampEnd(endTime);
    setCorrectFields({
      subject: false,
      type: false,
      location: false,
      result: false,
      timestamp: false,
    });
  };

  const handleSave = () => {
    console.log("Saving highlight", {
      index,
      subjectName,
      shotType,
      shotLocation,
      shotResult,
      timestampStart,
      timestampEnd,
    });
    // Add save logic here
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden w-full max-w-5xl mx-auto">

      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">Highlight {index + 1}</Badge>
          <span className="text-sm text-gray-600">
            {timestampStart} - {timestampEnd}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Expandable Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t"
          >
            <div className="px-6 py-6 grid md:grid-cols-2 gap-6">
              {/* Left: Video Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  AI Analysis Review
                </h3>
                <div className="border rounded-md bg-gray-100 aspect-video flex items-center justify-center mb-3">
                  <video
                    src={videoUrl}
                    controls
                    preload="metadata"
                    className="w-full rounded-md"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                  <span>
                    {timestampStart} - {timestampEnd}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm">⏮</Button>
                    <Button variant="ghost" size="sm">▶</Button>
                  </div>
                </div>
              </div>

              {/* Right: Editable Review Form */}
              <div className="space-y-5">
                {/* Subject */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Subject
                    </label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        checked={correctFields.subject}
                        onCheckedChange={() => toggleCorrect("subject")}
                      />
                      <span className="text-xs text-gray-500">Correct</span>
                    </div>
                  </div>
                  <Input
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Enter correct player"
                  />
                </div>

                {/* Shot Type */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Shot Type
                    </label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        checked={correctFields.type}
                        onCheckedChange={() => toggleCorrect("type")}
                      />
                      <span className="text-xs text-gray-500">Correct</span>
                    </div>
                  </div>
                  <Select value={shotType} onValueChange={setShotType}>
                    <SelectTrigger>
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

                {/* Shot Location */}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Shot Location
                  </label>
                  <div className="flex items-center space-x-1">
                    <Checkbox
                      checked={correctFields.location}
                      onCheckedChange={() => toggleCorrect("location")}
                    />
                    <span className="text-xs text-gray-500">Correct</span>
                  </div>
                </div>

                {/* Dropdown */}
                <Select value={shotLocation} onValueChange={setShotLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="w-[400px]">
                    <SelectItem value="Left Corner">Left Corner</SelectItem>
                    <SelectItem value="Right Corner">Right Corner</SelectItem>
                    <SelectItem value="Top of Key">Top of Key</SelectItem>
                    <SelectItem value="Paint">Paint</SelectItem>
                  </SelectContent>
                </Select>

                {/* Court Thumbnail with Marker */}
                <div className="relative w-full mt-3 aspect-[2/1.2] border rounded-md bg-gray-100 overflow-hidden">
                  <img
                    src="/halfcourt.png"
                    alt="Half court diagram"
                    className="object-contain w-full h-full opacity-90"
                  />
                  <AnimatePresence>
                    {shotLocation && (
                      <motion.div
                        key={shotLocation}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3, type: "spring" }}
                        className="absolute w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-md"
                        style={{
                          // approximate marker coordinates
                          top:
                            shotLocation === "Top of Key"
                              ? "18%"
                              : shotLocation === "Paint"
                              ? "45%"
                              : "72%",
                          left:
                            shotLocation === "Left Corner"
                              ? "22%"
                              : shotLocation === "Right Corner"
                              ? "78%"
                              : "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>


                {/* Shot Result */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Shot Result
                    </label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        checked={correctFields.result}
                        onCheckedChange={() => toggleCorrect("result")}
                      />
                      <span className="text-xs text-gray-500">Correct</span>
                    </div>
                  </div>
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

                {/* Timestamp */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Timestamp
                    </label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        checked={correctFields.timestamp}
                        onCheckedChange={() => toggleCorrect("timestamp")}
                      />
                      <span className="text-xs text-gray-500">Correct</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      value={timestampStart}
                      onChange={(e) => setTimestampStart(e.target.value)}
                      placeholder="Start"
                    />
                    <Input
                      value={timestampEnd}
                      onChange={(e) => setTimestampEnd(e.target.value)}
                      placeholder="End"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex space-x-2 pt-3">
                  <Button variant="outline" onClick={handleReset} className="flex-1">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
