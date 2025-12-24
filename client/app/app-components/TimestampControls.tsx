"use client";
import { Button } from "@/components/ui/button";

interface TimestampControlsProps {
  start: number;
  end: number;
  onChange: (newStart: number, newEnd: number) => void;
}

export default function TimestampControls({
  start,
  end,
  onChange,
}: TimestampControlsProps) {
  const adjustStart = (delta: number) => onChange(start + delta, end);
  const adjustEnd = (delta: number) => onChange(start, end + delta);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between mt-3 border-t pt-3">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Start Time: {formatTime(start)}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => adjustStart(-1)}>
            -1s
          </Button>
          <Button size="sm" variant="outline" onClick={() => adjustStart(1)}>
            +1s
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">End Time: {formatTime(end)}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => adjustEnd(-1)}>
            -1s
          </Button>
          <Button size="sm" variant="outline" onClick={() => adjustEnd(1)}>
            +1s
          </Button>
        </div>
      </div>
    </div>
  );
}
