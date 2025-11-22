//client/app/my-runs/MyRunsClient.tsx - 11-19-25 Wednesday Version 3pm 

//comment for version / wiring
"use client"; 

import React, { useState, useEffect } from "react"; 
import { Play, Upload, Globe2 } from "lucide-react";            
import { cn } from "@/lib/utils";                  
import Link from "next/link";
import ProfileDropdown from "../app-components/ProfileDropdown";

// 🔁 Dribbling icon – same look as before
// (copied from your previous MyRunsClient)          
export function DribbleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      {/* ball */}                                    
      <circle cx="17" cy="5" r="3" fill="currentColor" />
      {/* body */}
      <path
        d="M10 8L8 13l2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* front leg */}
      <path
        d="M10 16l-1.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* back leg */}
      <path
        d="M10 15l2.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* arm toward ball */}
      <path
        d="M10 9.5L14 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* head */}
      <circle cx="10" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

//11-21-25 Friday 4pm - For my runs page
// --- My Runs API types (separate from highlightFolders) ---
type RunsSummary = {
    runId: string;
    name: string;
    ownerEmail: string;
    visibility?: "private" | "public" | "unlisted";
    videoIds?: string[];
    members?: string[];
  };
//reuse your FastAPI base like DashboardClient
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// simple My Runs API client — talks to /runs, NOT /folders   
async function apiListRuns(ownerEmail: string): Promise<RunsSummary[]> {
    const url = `${API_BASE}/runs?ownerEmail=${encodeURIComponent(ownerEmail)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      throw new Error(`Failed to load runs: ${r.statusText}`);
    }
    const data = await r.json();
    return (data.items || []) as RunsSummary[];
  }
//11-21-25 Friday 4pm - For my runs page


// Props come from server wrapper in app/my-runs/page.tsx         
export default function MyRunsClient({ userEmail }: { userEmail: string }) {
  //state now comes from backend instead of SEED_RUNS
  const [runs, setRuns] = useState<RunsSummary[]>([]);           
  const [loading, setLoading] = useState(true);          
  const [error, setError] = useState<string | null>(null); 

  //load runs from FastAPI using ownerEmail
  useEffect(() => {
    if (!userEmail) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await apiListRuns(userEmail);
        if (!cancelled) setRuns(items);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load runs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  // simple guard (shouldn’t usually hit because page.tsx already checks)
  if (!userEmail) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-10 text-gray-600">
          Missing user email. Please sign in again.
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
            </Link>

            <div className="flex items-center gap-4">
            <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-800"
            >
                <Upload className="w-4 h-4" />
                Upload Video
            </Link>

            <ProfileDropdown />
            </div>
        </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-10">
            {/* Page title */}                                   {/* PRESERVED UI */}
            <header className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                My Runs
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                See the pickup runs you&apos;re part of and the highlight videos shared there.
                </p>
            </div>

            {/* Join a Run primary action */}                
            <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
                onClick={() => {
                //keep this as a stub until we build real join flow
                alert(
                    "Join a Run will eventually let you search / join public runs. We’ll wire this up in the next step."
                );
                }}
            >
                <Globe2 className="w-4 h-4" />
                Join a Run
            </button>
            </header>

            {/* === My Runs gallery (visually based on Highlight Folders) === */}
            <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                <DribbleIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">My Runs</h2>
                </div>

                {/* Secondary Join button for smaller screens */} {/* PRESERVED UI */}
                <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs md:text-sm text-gray-800 hover:bg-gray-50"
                onClick={() => {
                    alert(
                    "Join a Run (secondary button) – same future behavior as the primary button."
                    );
                }}
                >
                <Globe2 className="w-4 h-4" />
                Join a Run
                </button>
            </div>

            {/*loading / error / empty states */}
            {loading && (
                <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
                Loading your runs…
                </div>
            )}

            {!loading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {error}
                </div>
            )}

            {!loading && !error && runs.length === 0 && (
                <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
                You haven&apos;t joined any runs yet. Use{" "}
                <span className="font-medium">Join a Run</span> to
                find or create your first run, or assign highlights to runs from your Dashboard.
                </div>
            )}

            {!loading && !error && runs.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                {runs.map((run) => {
                    const videoCount = (run.videoIds || []).length;
                    return (
                    <article
                        key={run.runId}                         //use runId as key
                        className="rounded-lg border bg-white p-4 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <DribbleIcon className="w-4 h-4 text-purple-600" />
                            <div>
                            <h3 className="font-medium text-gray-900">
                                {run.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {videoCount === 1
                                ? "1 video in this run"
                                : `${videoCount} videos in this run`}
                            </p>
                            </div>
                        </div>

                        {/* If you later add members/visibility, you can show it here */} {/*placeholder */}
                        </div>

                        <p className="mt-3 text-xs text-gray-500">
                        In a later step, this card will show the latest highlight videos
                        for this run, plus a comment stream for your squad.
                        </p>
                    </article>
                    );
                })}
                </div>
            )}
            </section>
        </main>
    </div>
  );
}
