//client/app/dashboard/DashboardClient.tsx - Sunday 10-26-25 Update
//Removed all instances of “Raw” video handling; now only lists/manages highlight videos.

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react"; // NEW: show name/email, protect actions
import {
  Play, Upload, UploadIcon, BarChart2, BarChart3, Clock3, Clock, Users, Edit3, Save, Trash2,
  Eye, Lock, Link as LinkIcon, ChevronDown, ChevronUp
} from "lucide-react"; // UNCHANGED icon set (subset)
import ProfileDropdown from "../app-components/ProfileDropdown"; // UNCHANGED header dropdown
import cn from "clsx"; // NEW: tiny helper for conditional classes (already in many stacks; if you don't use it, swap to template strings)

type Visibility = "public" | "unlisted" | "private"; // NEW

// NEW: what the highlights API returns (kept flexible)
type HighlightItem = {
  id: string;
  ownerEmail: string;
  title?: string;
  downloadUrl?: string;      // https signed URL if you return one
  gcsUri?: string;           // gs:// location
  createdAt?: string;        // iso for display
  durationSeconds?: number;  // optional, for "Total Footage" stat
  visibility?: Visibility;   // NEW: we edit this
  isPublic?: boolean;        // NEW: derived on the server if you want
};

export default function DashboardClient() {
  // NEW: light auth awareness (for header and future filters)
  const { data: session } = useSession();
  const userName = session?.user?.name || "";
  const userEmail = session?.user?.email || "";

  // CHANGED: single source — highlights only
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: local edit state for rename controls
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  // NEW: simple expand panel for empty-state help
  const [helpOpen, setHelpOpen] = useState(false);

  // NEW: fetch highlights from your app route
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/highlightVideos?limit=100", { cache: "no-store" });
      if (!r.ok) throw new Error(`highlights ${r.status}`);
      const j = await r.json();
      if (!j?.success) throw new Error("bad payload");
      setHighlights(j.videos || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // UNCHANGED: header stats look/feel — now derived only from highlights
  const stats = useMemo(() => {
    const count = highlights.length;
    const totalSeconds =
      highlights.reduce((acc, h) => acc + (h.durationSeconds || 0), 0);
    const minutes = Math.round(totalSeconds / 60);
    return {
      videosUploaded: count,     // CHANGED: equals highlights count
      highlightsCreated: count,  // CHANGED: same
      totalFootageMin: minutes,  // CHANGED: zero if durations are absent
      teamGroups: 3,             // UNCHANGED placeholder you already showed
    };
  }, [highlights]);

  // NEW: PATCH helpers
  const patchHighlight = async (id: string, body: Record<string, any>) => {
    const r = await fetch(`/api/highlightVideos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`PATCH ${r.status}`);
    const j = await r.json();
    return j;
  };

  const onRename = async (id: string, title: string) => {
    await patchHighlight(id, { title });
    setEditingId(null);
    await load();
  };

  const onVisibility = async (id: string, visibility: Visibility) => {
    await patchHighlight(id, {
      visibility,
      isPublic: visibility === "public", // NEW: keep both in sync if you store both
    });
    await load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this highlight? This cannot be undone.")) return;
    const r = await fetch(`/api/highlightVideos/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const t = await r.text();
      alert(`Failed to delete: ${t}`);
      return;
    }
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ====== Header (UNCHANGED style) ====== */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <div className="flex items-center gap-4">
            {/* UNCHANGED: Upload button goes to /upload */}
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-800"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </Link>
            <ProfileDropdown /> {/* UNCHANGED */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {/* ====== Title + subtitle (UNCHANGED copy) ====== */}
        <h1 className="text-3xl font-bold text-gray-900">Gallery for Your Basketball Videos</h1>
        <p className="text-gray-600 mt-2">
          Manage your uploaded videos and generated highlights
        </p>

        {/* ====== Stats (UNCHANGED look, CHANGED data source) ====== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.videosUploaded}</div>
            <div className="text-sm text-gray-500">Videos Uploaded</div>
            <UploadIcon className="w-5 h-5 text-gray-400" /> {/* NEW */}
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.highlightsCreated}</div>
            <div className="text-sm text-gray-500">Highlights Created</div>
            <BarChart2 className="w-5 h-5 text-green-600" /> {/* NEW */}
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.totalFootageMin}m</div>
            <div className="text-sm text-gray-500">Total Footage</div>
            <Clock3 className="w-5 h-5 text-orange-600" /> {/* NEW */}
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.teamGroups}</div>
            <div className="text-sm text-gray-500">Team Groups</div>
            <Users className="w-5 h-5 text-purple-600" /> {/* NEW */}
          </div>
        </div>

        {/* ====== Highlights-only gallery ====== */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Highlight Videos</h2>
            </div>
            {/* Optional helper accordion */}
            <button
              className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
              onClick={() => setHelpOpen((v) => !v)}
            >
              {helpOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              How it works
            </button>
          </div>

          {helpOpen && (
            <div className="mt-3 p-3 text-sm text-gray-700 bg-white border rounded-md">
              Upload from your computer on the <b>Upload</b> page. When AI finishes,
              the highlight appears here. Use the visibility menu to set{" "}
              <b>Public</b>, <b>Unlisted</b>, or <b>Private</b>.
            </div>
          )}

          {/* Content */}
          <div className="mt-6">
            {loading && (
              <div className="p-8 text-gray-500">Loading highlights…</div>
            )}

            {error && (
              <div className="p-8 text-red-600">Failed to load: {error}</div>
            )}

            {!loading && !error && highlights.length === 0 && (
              <div className="p-8 bg-white border rounded-lg text-center">
                <div className="text-gray-600 mb-4">No highlight videos yet.</div>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Upload className="w-4 h-4" />
                  Go to Upload
                </Link>
              </div>
            )}

            {!loading && !error && highlights.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {highlights.map((h) => {
                  const isEditing = editingId === h.id;
                  const vis = (h.visibility || "private") as Visibility;
                  return (
                    <li key={h.id} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
                      {/* Title / rename */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {!isEditing ? (
                            <div className="font-semibold text-gray-900 break-words">
                              {h.title || "Untitled highlight"}
                            </div>
                          ) : (
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              className="w-full border rounded px-2 py-1"
                              placeholder="Enter a title"
                            />
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                          </div>
                        </div>

                        {!isEditing ? (
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => {
                              setEditingId(h.id);
                              setDraftTitle(h.title || "");
                            }}
                            aria-label="Rename"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => onRename(h.id, draftTitle.trim())}
                            aria-label="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Quick actions row */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Visibility:</span>
                        {/* Simple native select to avoid extra deps */}
                        <select
                          value={vis}
                          onChange={(e) => onVisibility(h.id, e.target.value as Visibility)}
                          className="border rounded px-2 py-1 bg-white"
                        >
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>

                        <span className="ml-auto inline-flex items-center gap-1 text-gray-600">
                          {vis === "public" && (<><Eye className="w-4 h-4" /> Public</>)}
                          {vis === "unlisted" && (<><LinkIcon className="w-4 h-4" /> Unlisted</>)}
                          {vis === "private" && (<><Lock className="w-4 h-4" /> Private</>)}
                        </span>
                      </div>

                      {/* Open / Delete */}
                      <div className="flex items-center gap-2">
                        <a
                          href={h.downloadUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-2 rounded-md text-white",
                            h.downloadUrl ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
                          )}
                        >
                          <Play className="w-4 h-4" />
                          Open
                        </a>
                        <button
                          onClick={() => onDelete(h.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
