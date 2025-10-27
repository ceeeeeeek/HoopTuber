//client/app/dashboard/HighlightsSection.tsx - Sunday 10-26-25 Update
//NAME CHANGE: Changed name from RawVsHighlightsSection.tsx to HighlightsSection.tsx
//Removed all instances of “Raw” video handling; now only lists/manages highlight videos.
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { UploadIcon, BarChart2, Clock3, Users, Loader2, MoreVertical, Trash2, Edit3, Globe2, Lock, Link2 } from "lucide-react";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";

// UNCHANGED: shared types
type HighlightDoc = {
  id: string;
  ownerEmail: string;
  jobId: string;
  downloadUrl: string;
  title?: string;
  isPublic?: boolean;              // UNCHANGED (still supported)
  visibility?: "public" | "unlisted" | "private"; // NEW
  createdAt?: string;
  stats?: {
    totalShots?: number;
    madeShots?: number;
    shootingPercentage?: number;
    durationSec?: number; // NEW: if present we’ll roll into total footage
  };
  thumbUrl?: string; // optional thumbnail URL if you add one later
};

// UNCHANGED: tiny number formatter
const nf = new Intl.NumberFormat();

/** NEW: utility to map visibility->label+icon */
function VisibilityBadge({ visibility }: { visibility?: "public" | "unlisted" | "private" }) {
  const v = visibility || "private";
  const label = v === "public" ? "Public" : v === "unlisted" ? "Unlisted" : "Private";
  const Icon = v === "public" ? Globe2 : v === "unlisted" ? Link2 : Lock;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default function HighlightsSection() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<HighlightDoc[]>([]);
  const email = session?.user?.email;

  // NEW: fetch highlights only (old UI look kept)
  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/highlightVideos?limit=50`, { cache: "no-store" }); // UNCHANGED route naming you already have
      const j = await r.json();
      if (j?.success) setHighlights(j.videos as HighlightDoc[]);
    } catch (e) {
      console.warn("Failed to load highlights", e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { load(); }, [load]);

  // UNCHANGED: stats cards (computed from highlights now)
  const stats = useMemo(() => {
    const count = highlights.length;
    const totalMins = Math.round(
      (highlights.reduce((s, h) => s + (h.stats?.durationSec || 0), 0) / 60) || 0
    );
    return { uploaded: count, totalMins };
  }, [highlights]);

  // NEW: update visibility on a specific highlight
  const updateVisibility = async (id: string, visibility: "public" | "unlisted" | "private") => {
    try {
      const r = await fetch(`/api/highlightVideos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch: { visibility, isPublic: visibility === "public" } }),
      });
      if (!r.ok) throw new Error("Failed to update visibility");
      setHighlights((prev) => prev.map(h => h.id === id ? { ...h, visibility, isPublic: visibility === "public" } : h));
    } catch (e) {
      console.error(e);
      alert("Could not update visibility.");
    }
  };

  // UNCHANGED: delete a highlight
  const deleteHighlight = async (id: string) => {
    if (!confirm("Delete this highlight? This cannot be undone.")) return;
    try {
      const r = await fetch(`/api/highlightVideos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error("Delete failed");
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.error(e);
      alert("Could not delete highlight.");
    }
  };

  // UNCHANGED: rename
  const renameHighlight = async (id: string, cur: string | undefined) => {
    const next = prompt("Rename highlight", cur || "");
    if (next === null) return;
    try {
      const r = await fetch(`/api/highlightVideos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch: { title: next } }),
      });
      if (!r.ok) throw new Error("Rename failed");
      setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, title: next } : h)));
    } catch (e) {
      console.error(e);
      alert("Could not rename highlight.");
    }
  };

  return (
    <div className="space-y-6">
    {/* UNCHANGED layout; just add icons inside the cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Videos Uploaded</div>
            <UploadIcon className="w-5 h-5 text-gray-400" /> {/* NEW */}
          </div>
          <div className="text-2xl font-semibold">{nf.format(stats.uploaded)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Highlights Created</div>
            <BarChart2 className="w-5 h-5 text-green-600" /> {/* NEW */}
          </div>
          <div className="text-2xl font-semibold">{nf.format(highlights.length)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Total Footage</div>
            <Clock3 className="w-5 h-5 text-orange-600" /> {/* NEW */}
          </div>
          <div className="text-2xl font-semibold">{nf.format(stats.totalMins)}m</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Team Groups</div>
            <Users className="w-5 h-5 text-purple-600" /> {/* NEW */}
          </div>
          <div className="text-2xl font-semibold">3</div>
        </CardContent>
      </Card>
    </div>

      {/* UNCHANGED header style; text updated for highlights only */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Highlight Videos</h2>
        <div className="flex gap-3">
          {/* UNCHANGED: link to /upload to create new highlight */}
          <Link href="/upload">
            <Button className="bg-orange-500 hover:bg-orange-600">Create New Highlight</Button>
          </Link>
        </div>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading && (
          <div className="col-span-full flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading highlights…
          </div>
        )}

        {!loading && highlights.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-16 text-center text-gray-600">
              No highlights yet. <Link href="/upload" className="text-orange-600 underline ml-1">Create your first.</Link>
            </CardContent>
          </Card>
        )}

        {!loading && highlights.map((h) => (
          <Card key={h.id} className="overflow-hidden">
            <div className="relative aspect-video bg-gray-100">
              {/* UNCHANGED poster section; you can swap for a real thumbnail later */}
              {h.thumbUrl ? (
                <Image src={h.thumbUrl} alt={h.title || "Highlight"} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  No thumbnail
                </div>
              )}
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base truncate">{h.title || "Untitled Highlight"}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => renameHighlight(h.id, h.title)}>
                      <Edit3 className="w-4 h-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => deleteHighlight(h.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* NEW: visibility picker (looks like a small inline control) */}
              <div className="flex items-center gap-3">
                <VisibilityBadge visibility={h.visibility} />
                <Select
                  value={h.visibility || "private"}
                  onValueChange={(v: "public" | "unlisted" | "private") => updateVisibility(h.id, v)}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  {h.createdAt && (
                    <span title={h.createdAt}>
                      {formatDistanceToNow(new Date(h.createdAt))} ago
                    </span>
                  )}
                </div>
                <div>
                  {typeof h.stats?.shootingPercentage === "number" && (
                    <span>{Math.round(h.stats.shootingPercentage)}% FG</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
