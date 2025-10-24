//client/app/dashboard/DashboardClient.tsx - Wednesday 10-22-25 Update
//Client component for fetching/rendering videos.
//Allows dashboard page.tsx (client\app\dashboard\page.tsx) to stay minimal and use server components.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

//UI imports for header + content
import { Play, Upload, BarChart3, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

//Profile dropdown
import ProfileDropdown from "../app-components/ProfileDropdown";

//The Raw/Highlights toggle + list
//import { RawVsHighlightsSection } from "./RawVsHighlightsSection";
import RawVsHighlightsSection from "./RawVsHighlightsSection";

//Small helper to fetch counts for cards
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

export default function DashboardClient() {
  //Top metrics that update when the tab changes
  const [activeTab, setActiveTab] = useState<"raw" | "highlights">("raw");
  const [raws, setRaws] = useState<RawRow[]>([]);
  const [highs, setHighs] = useState<HighlightRow[]>([]);
  const [loading, setLoading] = useState(true);

  //Load both collections 'Raw' - connected to /api/rawVideos and 'Highlights' - connected to /api/highlightVideos on Firebase once;
  //lists themselves still fetch inside RawVsHighlightsSection,
  //but we also fetch here to keep the stat cards responsive regardless of which tab is open.
  //Only thing not accurate from stat cards is Team Groups, which we’ll wire later. 
  //(Videos Uploaded, Highlights Created, Total Footage are all accurate)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/rawVideos?limit=200", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/highlightVideos?limit=200", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);

        if (cancelled) return;

        if (r1?.success && Array.isArray(r1.videos)) setRaws(r1.videos);
        if (r2?.success && Array.isArray(r2.highlights)) setHighs(r2.highlights);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  //Computed stats — same style as your old stat card
  const videosUploaded = raws.length; // raw uploads count
  const highlightsCreated = highs.length;
  const totalFootageMin = useMemo(() => {
    const totalSeconds = raws.reduce((acc, v) => acc + (v.duration || 0), 0);
    return Math.round(totalSeconds / 60); // minutes
  }, [raws]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/*Header with logo + upload + profile */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">HoopTuber</span>
            </Link>

            <div className="flex items-center space-x-4">
              {/* Matches your prior “Upload Video” affordance */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <Upload className="w-5 h-5 text-gray-700" />
                <Link href="/upload" className="text-sm text-gray-700 font-medium">
                  Upload Video
                </Link>
              </label>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/*UNCHANGED: main container */}
      <div className="container mx-auto px-4 py-8">
        {/*UNCHANGED: title/intro */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Basketball Videos</h1>
          <p className="text-gray-600">Manage your uploaded videos and generated highlights</p>
        </div>

        {/*More accurate Stat cards (update with current data; Team Groups placeholder kept) */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Upload className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{videosUploaded}</p>
                  <p className="text-gray-600 text-sm">Videos Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{highlightsCreated}</p>
                  <p className="text-gray-600 text-sm">Highlights Created</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{totalFootageMin}m</p>
                  <p className="text-gray-600 text-sm">Total Footage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  {/* UNCHANGED placeholder – we’ll wire accuracy for Team Groups later */}
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-gray-600 text-sm">Team Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/*Raw vs Highlights lists (preserves your new toggle & empty states) */}
        <RawVsHighlightsSection />
      </div>
    </div>
  );
}
