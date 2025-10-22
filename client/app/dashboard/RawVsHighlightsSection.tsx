//app/dashboard/RawVsHighlightsSection.tsx - 10-22-25 Wednesday Update

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type RawRow = {
  id: string;
  url: string;
  fileName: string;
  uploadedAt: string;
  size: number;
  processed: boolean;
  highlightCount: number;
  duration: number;
};

type HighlightRow = {
  id: string;
  jobId: string;
  downloadUrl: string;
  title?: string | null;
  isPublic?: boolean;
  createdAtIso: string;
  stats?: {
    totalShots: number;
    madeShots: number;
    shootingPercentage: number;
  } | null;
};

export function RawVsHighlightsSection() {
  const [active, setActive] = useState<"raw" | "highlights">("raw");
  const [raws, setRaws] = useState<RawRow[]>([]);
  const [highs, setHighs] = useState<HighlightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (tab: "raw" | "highlights") => {
    setLoading(true);
    try {
      if (tab === "raw") {
        const r = await fetch("/api/rawVideos?limit=50", { cache: "no-store" });
        const j = await r.json();
        if (j?.success) setRaws(j.videos);
      } else {
        const r = await fetch("/api/highlightVideos?limit=50", { cache: "no-store" });
        const j = await r.json();
        if (j?.success) setHighs(j.highlights);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const fmtSize = (b: number) => {
    const s = ["Bytes", "KB", "MB", "GB"];
    if (b === 0) return "0 Bytes";
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return Math.round((b / Math.pow(1024, i)) * 100) / 100 + " " + s[i];
  };
  const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="w-full">
      <TabsList>
        <TabsTrigger value="raw">Raw Videos</TabsTrigger>
        <TabsTrigger value="highlights">Highlight Videos</TabsTrigger>
      </TabsList>

      <TabsContent value="raw">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
            <p className="text-gray-600 mt-2">Loading raw videos...</p>
          </div>
        ) : raws.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">No raw uploads yet.</p>
              <Button asChild className="bg-orange-500 hover:bg-orange-600">
                <a href="/upload">Upload from computer</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {raws.map((v) => (
              <Card key={v.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{v.fileName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{fmtDur(v.duration)}</span>
                          <span>{fmtSize(v.size)}</span>
                          <span>{new Date(v.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={v.processed ? "default" : "secondary"}>
                            {v.processed ? "Processed" : "Processing"}
                          </Badge>
                          {v.processed && <Badge variant="outline">{v.highlightCount} highlights</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(v.url, "_blank")}>
                        <Play className="w-4 h-4 mr-2" />
                        Watch
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="highlights">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
            <p className="text-gray-600 mt-2">Loading highlights...</p>
          </div>
        ) : highs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">No highlights yet. Process a raw video to create one.</p>
              <Button asChild className="bg-orange-500 hover:bg-orange-600">
                <a href="/upload">Go to Upload</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {highs.map((h) => (
              <Card key={h.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{h.title ?? "Highlight"}</h3>
                      <div className="text-sm text-gray-600">
                        {new Date(h.createdAtIso).toLocaleString()} &middot; {h.isPublic ? "Public" : "Private"}
                      </div>
                      {h.stats && (
                        <div className="text-sm text-gray-700 mt-1">
                          {h.stats.madeShots}/{h.stats.totalShots} • {h.stats.shootingPercentage}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(h.downloadUrl, "_blank")}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const isPublic = !h.isPublic;
                          const r = await fetch("/api/highlightVideos", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: h.id, isPublic }),
                          });
                          if (r.ok) {
                            // optimistic UI
                            setHighs((prev) => prev.map((x) => (x.id === h.id ? { ...x, isPublic } : x)));
                          }
                        }}
                      >
                        <Share className="w-4 h-4 mr-2" />
                        {h.isPublic ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
