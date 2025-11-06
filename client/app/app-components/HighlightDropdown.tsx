// MAIN FILE FOR DROPDOWNS

"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge" 
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Play } from "lucide-react";


interface HighlightReviewPanelDrops {
    index: number;
    timestamp: string;
    videoUrl: string; // can be GCS or signed URL to raw video
}

export default function HighlightReviewPanel({index, timestamp, videoUrl }: HighlightReviewPanelDrops) {
    const [isOpen, setIsOpen] = useState(false);
    const [shotType, setShotType] = useState("3-Point Jump Shot");
    const [shotLocation, setShotLocation] = useState("Left Corner");
    const [shotResult, setShotResult] = useState("Made");

    
    return (
    <div className="border rounded-lg bg-white shadow-sm mb-4 overflow-hidden transition-all">
      {/* === Header === */}
      <div
        className="flex justify-between items-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">Highlight {index + 1}</Badge>
          <span className="text-sm text-gray-500">{timestamp}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </div>

      {/* === Collapsible Section === */}
      {isOpen && (
        <div className="p-4 border-t bg-gray-50">
          {/* Video preview */}
          <div className="mb-4">
            <video
              src={videoUrl}
              className="rounded-lg w-full max-h-64"
              controls
              muted
            />
          </div>

          {/* Shot info form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Shot Type</label>
              <Select value={shotType} onValueChange={setShotType}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Layup">Layup</SelectItem>
                  <SelectItem value="Midrange">Midrange</SelectItem>
                  <SelectItem value="3-Point Jump Shot">3-Point Jump Shot</SelectItem>
                  <SelectItem value="Free Throw">Free Throw</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Shot Location</label>
              <Select value={shotLocation} onValueChange={setShotLocation}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Left Corner">Left Corner</SelectItem>
                  <SelectItem value="Right Corner">Right Corner</SelectItem>
                  <SelectItem value="Top of Key">Top of Key</SelectItem>
                  <SelectItem value="Paint">Paint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Shot Result</label>
              <div className="flex space-x-4 mt-2">
                <Button
                  variant={shotResult === "Made" ? "default" : "outline"}
                  onClick={() => setShotResult("Made")}
                >
                  Made
                </Button>
                <Button
                  variant={shotResult === "Missed" ? "default" : "outline"}
                  onClick={() => setShotResult("Missed")}
                >
                  Missed
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Timestamp</label>
              <div className="flex items-center justify-between mt-1">
                <input
                  type="text"
                  readOnly
                  value={timestamp}
                  className="text-sm bg-white border rounded p-1 w-1/2"
                />
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">Start</Button>
                  <Button size="sm" variant="outline">End</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end mt-6 space-x-2">
            <Button variant="outline">Reset Changes</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Save & Continue</Button>
          </div>
        </div>
      )}
    </div>
  );
}


