"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Flame,
    Loader2,
    MapPin,
    Play,
    Search,
    Upload,
    User,
    Users,
  } from "lucide-react";
import ProfileDropdown from "../app-components/ProfileDropdown";
import { useRouter } from "next/navigation";
import { DribbleIcon } from "@/components/icons/DribbleIcon";
import { DribbleIcon2 } from "@/components/icons/DribbleIcon2";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type RunVisibility = "public" | "private" | "unlisted";

// interface PublicRunSummary {
//     runId: string;
//     name: string;
//     ownerEmail: string;
//     visibility: RunVisibility;
//     members?: string[];
//     highlightIds?: string[];
//   }
type PublicRun = {
    runId: string;
    name: string;
    ownerEmail?: string;
    ownerName?: string;
    visibility?: RunVisibility;
    members?: string[];
    highlightIds?: string[];
    location?: string;
    dayOfWeek?: string; //optional future field
    createdAt?: any;
    pinnedMessage?: string;
    publicThumbnailHighlightId?: string;
    publicThumbnailUrl?: string;
  };

/**
 * Fetch all PUBLIC runs from backend.
 * Backend endpoint: GET /public-runs -> { items: PublicRunSummary[] }
 */
async function apiListPublicRuns(): Promise<PublicRun[]> {
  const r = await fetch(`${API_BASE}/public-runs`, { cache: "no-store" });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(
      `Failed to load public runs: ${r.status} ${r.statusText} ${txt}`
    );
  }

  const data = await r.json();
  return Array.isArray(data?.items) ? (data.items as PublicRun[]) : [];
}

type SortKey =
  | "newest"
  | "mostMembers"
  | "mostHighlights"
  | "name"
  | "owner"
  | "location"
  | "dayOfWeek";

function countHighlights(r: PublicRun) {
  const a = Array.isArray(r.highlightIds) ? r.highlightIds.length : 0;
  //const b = Array.isArray(r.highlights) ? r.highlights.length : 0;
  //return Math.max(a, b);
  return Math.max(a);

}

function countMembers(r: PublicRun) {
 //return Array.isArray(r.members) ? r.members.length : 0;
 return Array.isArray(r.members) ? r.members.length : 1; //count owner as member - explicitly want “fallback = 1” to represent the owner 
}

function coerceMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const t = Date.parse(ts);
    return Number.isFinite(t) ? t : 0;
  }
  //Firestore Timestamp-ish shapes:
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  if (typeof ts?._seconds === "number") return ts._seconds * 1000;
  return 0;
}

export default function JoinARunClient() {
  const { data: session } = useSession();
  const router = useRouter();
  //const userEmail = (session?.user?.email || "").toLowerCase();
  const me = (session as any)?.user?.email?.toLowerCase?.() || "";


  const [publicRuns, setPublicRuns] = useState<PublicRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //which run we’re currently showing the "coming soon" modal for
  const [joinModalRun, setJoinModalRun] = useState<PublicRun | null>(
    null
  );
  //which run should show the small inline “you’re already a member” message
  const [ownerMessageFor, setOwnerMessageFor] = useState<string | null>(null);

  //Phase 1 controls
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const [thumbOpen, setThumbOpen] = useState<Record<string, boolean>>({});
  const toggleThumb = (runId: string) =>
    setThumbOpen((p) => ({ ...p, [runId]: !p[runId] }));
  
//   useEffect(() => {
//     async function load() {
//       try {
//         setError(null);
//         const pubs = await apiListPublicRuns();
//         setPublicRuns(pubs);
//       } catch (e: any) {
//         console.error("Failed to load public runs", e);
//         setError(e?.message || "Failed to load public runs.");
//       } finally {
//         setLoading(false);
//       }
//     }
//     load();
//   }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
        try {
            setLoading(true);
            setError(null);
            const items = await apiListPublicRuns();
            if (mounted) setPublicRuns(items);
        } catch (e: any) {
            if (mounted) setError(e?.message || "Failed to load public runs.");
        } finally {
            if (mounted) setLoading(false);
        }
        })();
        return () => {
        mounted = false;
        };
    }, []);

  const handleJoinClick = (run: PublicRun) => {
    setOwnerMessageFor(null);

    const ownerEmail = (run.ownerEmail || "").toLowerCase();
    //If you are the owner, show a small inline message instead of a modal
    if (me && ownerEmail === me) {
      setOwnerMessageFor(run.runId);
      return;
    }

    //For now, show a CreateRun-style modal saying "joining coming soon"
    setJoinModalRun(run);
  };

  const filteredRuns = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = [...publicRuns];

    if (q) {
      items = items.filter((r) => {
        const name = (r.name || "").toLowerCase();
        const ownerEmail = (r.ownerEmail || "").toLowerCase();
        const ownerName = (r.ownerName || "").toLowerCase();
        const loc = (r.location || "").toLowerCase();
        return (
          name.includes(q) ||
          ownerEmail.includes(q) ||
          ownerName.includes(q) ||
          loc.includes(q)
        );
      });
    }

    items.sort((a, b) => {
      if (sortKey === "newest") {
        return coerceMillis(b.createdAt) - coerceMillis(a.createdAt);
      }
      if (sortKey === "mostMembers") {
        return countMembers(b) - countMembers(a);
      }
      if (sortKey === "mostHighlights") {
        return countHighlights(b) - countHighlights(a);
      }
      if (sortKey === "owner") {
        return (a.ownerEmail || "").localeCompare(b.ownerEmail || "");
      }
      if (sortKey === "location") {
        return (a.location || "").localeCompare(b.location || "");
      }
      if (sortKey === "dayOfWeek") {
        return (a.dayOfWeek || "").localeCompare(b.dayOfWeek || "");
      }
      //name
      return (a.name || "").localeCompare(b.name || "");
    });

    return items;
  }, [publicRuns, query, sortKey]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/*Header (same as My Runs / Dashboard) */}
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

      {/*Main content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10">
        {/*---------- PAGE HEADER ---------- */}
        {/*Page title – expanded actions */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Join a Run
            </h1>
            <p className="mt-1 text-sm text-gray-500">
            {/*Discover pickup runs made <span className="font-semibold">PUBLIC</span>{" "}
            by HoopTuber users. Join any run to participate in highlight sharing +
            group comment streams. */}
            Discover pickup runs made public by HoopTuber users. Join any run to be a member of that run.
            </p>
          </div>

          {/*Join a Run + Create a Run actions – replaces single button layout */}
          <div className="flex items-center gap-3">
                <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
                onClick={() => router.push("/my-runs")}
                >
                <DribbleIcon className="w-5 h-5" />
                My Runs
                </button>

                <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700"
                onClick={() => router.push("/dashboard")}
                >
                <User className="w-5 h-5" />
                Dashboard
                </button>
          </div>
        </header>

        {/*---------- SUB-SECTION LABEL (matches My Runs style) ---------- */}
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <DribbleIcon2 className="w-7 h-7 text-blue-600" />
            <h2 className="text-lg font-semibold">Join a Run</h2>
        </div>
        </div>

        {/*Phase 1 controls (Search + Sort) */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by run name, owner, email, or location…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
        </div>

        <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Sort</label>
            <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
            >
            <option value="newest">Newest</option>
            <option value="mostMembers">Most members</option>
            <option value="mostHighlights">Most highlights</option>
            <option value="name">Name (A→Z)</option>
            <option value="owner">Owner (A→Z)</option>
            <option value="location">Location (A→Z)</option>
            <option value="dayOfWeek">Day of week</option>
            </select>
        </div>
        </div>


        {/*---------- STATE: loading / error / empty ---------- */}
        {loading && (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            Loading public runs…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filteredRuns.length === 0 && (
        <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            No public runs match your search. Try a different query.
        </div>
        )}

        {/*---------- PUBLIC RUN CARDS ---------- */}
        {!loading && !error && filteredRuns.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
            {filteredRuns.map((run) => {
            //const memberCount = Array.isArray(run.members) ? run.members.length : 0;
            const memberCount = Array.isArray(run.members) ? run.members.length : 1;

            //highlights should count from highlightIds
            const highlightCount = Array.isArray(run.highlightIds) ? run.highlightIds.length : 0;

              return (
                <article
                  key={run.runId}
                  className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md"
                >
                  {/*Card header – title + little “ball” badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow">
                        {/*simple “ball” icon */}
                        <span className="text-sm font-semibold">🏀</span>
                      </div>
                      <div>
                        <h2 className="text-base md:text-lg font-semibold text-gray-900">
                          {run.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Owned by{" "}
                          <span className="font-medium">{run.ownerEmail}</span>
                        </p>
                        {/*Optional location badge (read-only from run settings) */}
                        {(run as any).location ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                            <MapPin className="h-3 w-3" />
                            {(run as any).location}
                        </div>
                        ) : null}
                      </div>
                    </div>
                    {/*Visibility badge – always public here */}
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      Public
                    </span>
                  </div>

                  {/*Stats row */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <div className="inline-flex items-center gap-1">
                      <span aria-hidden>👥</span>
                      <span>
                        {memberCount} member{memberCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <span aria-hidden>🎞</span>
                      <span>
                        {highlightCount} highlight
                        {highlightCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                {/*owner announcement visible before joining */}
                {run.pinnedMessage?.trim() && (
                <div className="mt-3 rounded-lg border bg-white p-3 text-sm">
                    <div className="text-[11px] font-semibold text-gray-500">
                    Owner announcement
                    </div>
                    <div className="mt-1 text-gray-700 whitespace-pre-line">
                    {run.pinnedMessage}
                    </div>
                </div>
                )}

                {/*show that a public thumbnail was chosen (image preview can come later) */}
                {/* Public thumbnail (expand/collapse) */}
                {(run.publicThumbnailUrl || run.publicThumbnailHighlightId) && (
                <div className="mt-3 rounded-lg border bg-white p-3 text-sm">
                    <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold text-gray-800">Thumbnail</div>

                    <button
                        type="button"
                        className="text-xs text-gray-600 hover:text-gray-900"
                        onClick={() => toggleThumb(run.runId)}
                    >
                        {thumbOpen[run.runId] ? "Hide" : "Show"}
                    </button>
                    </div>

                    {thumbOpen[run.runId] ? (
                    run.publicThumbnailUrl ? (
                        <div className="mt-2 overflow-hidden rounded-md border bg-black">
                        {/* <video
                            src={run.publicThumbnailUrl}
                            className="h-44 w-full object-cover"
                            controls
                            preload="metadata"
                            playsInline
                        /> */}       
                        <img
                            src={run.publicThumbnailUrl}
                            className="h-44 w-full object-cover"
                            //controls
                            //playsInline
                        />
                        </div>
                    ) : (
                        <div className="mt-2 text-xs text-gray-600">
                        (No thumbnail URL yet) ID: {run.publicThumbnailHighlightId}
                        </div>
                    )
                    ) : (
                    <div className="mt-2 text-xs text-gray-500">
                        Click “Show” to preview
                    </div>
                    )}
                </div>
                )}

                  {/*Join button + owner message */}
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                      onClick={() => handleJoinClick(run)}
                    >
                      Join Run
                    </button>

                    {ownerMessageFor === run.runId && (
                      <p className="text-xs text-gray-500">
                        As the owner of this run, you already are a member.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/*---------- JOIN-RUN MODAL (CreateRun-style) ---------- */}
      {joinModalRun && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 pt-8 shadow-xl">
            {/*Floating ball on top – mimics CreateRunModal */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-2xl shadow-md">
                🏀
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Joining runs coming soon
              </h2>
              <p className="text-sm text-gray-600">
                You&apos;ll soon be able to join{" "}
                <span className="font-medium">{joinModalRun.name}</span> and
                participate in shared highlights + comment streams. For now,
                public runs are browse-only.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setJoinModalRun(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
