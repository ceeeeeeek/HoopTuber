"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Play, Upload } from "lucide-react";
import ProfileDropdown from "../app-components/ProfileDropdown";
import { useRouter } from "next/navigation";
import { DribbleIcon } from "@/components/icons/DribbleIcon";
import { DribbleIcon2 } from "@/components/icons/DribbleIcon2";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type RunVisibility = "public" | "private" | "unlisted";

interface PublicRunSummary {
    runId: string;
    name: string;
    ownerEmail: string;
    visibility: RunVisibility;
    members?: string[];
    highlightIds?: string[];
  }
  

/**
 * Fetch all PUBLIC runs from backend.
 * Backend endpoint: GET /public-runs -> { items: PublicRunSummary[] }
 */
async function apiListPublicRuns(): Promise<PublicRunSummary[]> {
  const r = await fetch(`${API_BASE}/public-runs`, { cache: "no-store" });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(
      `Failed to load public runs: ${r.status} ${r.statusText} ${txt}`
    );
  }

  const data = await r.json();
  return Array.isArray(data?.items) ? (data.items as PublicRunSummary[]) : [];
}

export default function JoinARunClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const userEmail = (session?.user?.email || "").toLowerCase();

  const [publicRuns, setPublicRuns] = useState<PublicRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //which run we’re currently showing the "coming soon" modal for
  const [joinModalRun, setJoinModalRun] = useState<PublicRunSummary | null>(
    null
  );
  //which run should show the small inline “you’re already a member” message
  const [ownerMessageFor, setOwnerMessageFor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const pubs = await apiListPublicRuns();
        setPublicRuns(pubs);
      } catch (e: any) {
        console.error("Failed to load public runs", e);
        setError(e?.message || "Failed to load public runs.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleJoinClick = (run: PublicRunSummary) => {
    setOwnerMessageFor(null);

    //If you are the owner, show a small inline message instead of a modal
    if (userEmail && run.ownerEmail.toLowerCase() === userEmail) {
      setOwnerMessageFor(run.runId);
      return;
    }

    //For now, show a CreateRun-style modal saying "joining coming soon"
    setJoinModalRun(run);
  };

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
              View My Runs
            </button>

          </div>
        </header>

        {/*---------- SUB-SECTION LABEL (matches My Runs style) ---------- */}
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DribbleIcon2 className="w-7 h-7 text-blue-600" />
              <h2 className="text-lg font-semibold">Join a Run</h2>
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

        {!loading && !error && publicRuns.length === 0 && (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            No runs are currently public. Check again later!
          </div>
        )}

        {/*---------- PUBLIC RUN CARDS ---------- */}
        {!loading && !error && publicRuns.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2">
            {publicRuns.map((run) => {
                const memberCount = Array.isArray(run.members) ? run.members.length : 1;
                const highlightCount = Array.isArray(run.highlightIds)
                ? run.highlightIds.length
                : 0;

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