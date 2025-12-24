// components/EditorDropdown.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Labels {
  player: string;
  shotType: string;
  result: string;
  location: string;
  correctFields?: string[];
}

interface DropdownMenuProps {
  labels: Labels;
  onChange: (labels: Labels) => void;
}

export default function DropdownMenu({ labels, onChange }: DropdownMenuProps) {
  const [localLabels, setLocalLabels] = useState(labels);

  const updateField = (field: keyof Labels, value: string) => {
    const updated = { ...localLabels, [field]: value };
    setLocalLabels(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3 border rounded-xl p-3">
      <div>
        <label>Player</label>
        <Input
          value={localLabels.player}
          onChange={(e) => updateField("player", e.target.value)}
        />
      </div>

      <div>
        <label>Shot Type</label>
        <Select
          value={localLabels.shotType}
          onValueChange={(val) => updateField("shotType", val)}
        >
          <SelectItem value="Layup">Layup</SelectItem>
          <SelectItem value="3PT Jump Shot">3PT Jump Shot</SelectItem>
          <SelectItem value="Dunk">Dunk</SelectItem>
        </Select>
      </div>

      <div>
        <label>Shot Result</label>
        <div className="flex space-x-3">
          <Checkbox
            checked={localLabels.result === "Made"}
            onCheckedChange={() => updateField("result", "Made")}
          />{" "}
          Made
          <Checkbox
            checked={localLabels.result === "Missed"}
            onCheckedChange={() => updateField("result", "Missed")}
          />{" "}
          Missed
        </div>
      </div>

      <div>
        <label>Shot Location</label>
        <Select
          value={localLabels.location}
          onValueChange={(val) => updateField("location", val)}
        >
          <SelectItem value="Left Corner">Left Corner</SelectItem>
          <SelectItem value="Right Corner">Right Corner</SelectItem>
          <SelectItem value="Top Key">Top of the Key</SelectItem>
        </Select>
      </div>
    </div>
  );
}
