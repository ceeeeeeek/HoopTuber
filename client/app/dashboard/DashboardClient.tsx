//client/app/dashboard/DashboardClient.tsx — Tuesday 11-04-25 Version 7:50pm
//now highlights-only and pointed at FastAPI

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";                            
import {
  Play, Upload, UploadIcon, BarChart2, BarChart3, Clock3, Users,
  Edit3, Save, Trash2, Eye, Lock, Link as LinkIcon, ChevronDown, ChevronUp
} from "lucide-react";                                                   
import cn from "clsx";                                                  
import ProfileDropdown from "../app-components/ProfileDropdown";         

type Visibility = "public" | "unlisted" | "private";                    

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-web-service-docker.onrender.com";
const CURR_DOMAIN = process.env.NEXTAUTH_URL || "http://localhost:3000";
/**
 * Format duration in seconds to a human-readable string
 * - Under 60s: "XXs"
 * - 60s to 3599s: "Xm Ys"
 * - 3600s and above: "Xh Ym" (no seconds)
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

type HighlightItem = {
  jobId: string;
  originalFileName?: string;
  ownerEmail?: string;
  title?: string;
  finishedAt?: string;
  signedUrl?: string;
  outputGcsUri?: string;
  videoDurationSec?: number;
  status?: string;
  visibility?: Visibility;
};


export default function DashboardClient() {
  //auth/session
  const { data: session } = useSession();
  const userName = session?.user?.name || "";
  const userEmail = session?.user?.email || "";

  //highlights state (but now typed for FastAPI items)
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  //little help accordion
  const [helpOpen, setHelpOpen] = useState(false);

  // =====Fetch from FastAPI instead of /api/highlightVideos =====
  const load = useCallback(async () => {
    if (!userEmail) return; //wait until session loads
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/highlights?ownerEmail=${encodeURIComponent(userEmail)}&limit=100&signed=true`;
      const r = await fetch(url, { cache: "no-store" });                 
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`GET /highlights ${r.status}: ${txt}`);
      }
      const j = await r.json();                                           
      const items: HighlightItem[] = Array.isArray(j?.items) ? j.items : [];
      setHighlights(items);
    } catch (e: any) {
      setError(e?.message || "Failed to load.");
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  //run loader on mount / when email changes
  useEffect(() => { load(); }, [load]);

  //(CHANGED source): derive stats from FastAPI items
  const stats = useMemo(() => {
    const count = highlights.length;
    const totalSeconds = highlights.reduce((acc, h) => acc + (h.videoDurationSec || 0), 0);
    const formattedDuration = formatDuration(totalSeconds);
    return {
      videosUploaded: count,     //equals highlight count
      highlightsCreated: count,  //same
      totalFootage: formattedDuration,  //formatted duration string
      teamGroups: 0,             //*placeholder* will change when we add Groups functionality (not yet added) - Sunday 11-04-25 7:48pm
    };
  }, [highlights]);

  //=====PATCH/DELETE routed to FastAPI instead of /api/highlightVideos =====
  const patchHighlight = async (jobId: string, body: Record<string, any>) => {
      const r = await fetch(`${API_BASE}/highlights/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      //body: JSON.stringify(body),
      body: JSON.stringify({ ownerEmail: userEmail, ...body }),  
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`PATCH /highlights/${jobId} ${r.status}: ${t}`);
    }
    return r.json().catch(() => ({}));
  };

  //update using server-returned item
    const onRename = async (jobId: string, title: string) => {
      const res = await patchHighlight(jobId, { title });
      setEditingId(null);
      const updated = res?.item as Partial<HighlightItem> | undefined;
      if (updated) {
        setHighlights((prev) =>
          prev.map((h) => (h.jobId === jobId ? { ...h, ...updated } : h))
        );
      } else {
        await load(); //fallback
      }
    };


    const onVisibility = async (jobId: string, visibility: Visibility) => {
      const res = await patchHighlight(jobId, { visibility });
      const updated = res?.item as Partial<HighlightItem> | undefined;
      if (updated) {
        setHighlights((prev) =>
          prev.map((h) => (h.jobId === jobId ? { ...h, ...updated } : h))
        );
      } else {
        await load(); //fallback
      }
    };

  const onDelete = async (jobId: string) => {
    if (!confirm("Delete this highlight? This cannot be undone.")) return;
    const r = await fetch(`${API_BASE}/highlights/${jobId}`, { method: "DELETE" });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      alert(`Failed to delete: ${t}`);
      return;
    }
    await load();
  };

  //====================== UI (PRESERVED look/feel) ======================
  return (
    <div className="min-h-screen bg-gray-50">
      {/*Header*/}
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

      <main className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Gallery for Your Basketball Videos</h1>
        <p className="text-gray-600 mt-2">Manage your uploaded videos and generated highlights</p>

        {/* Stats (CHANGED data source) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.videosUploaded}</div>
            <div className="text-sm text-gray-500">Videos Uploaded</div>
            <UploadIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.highlightsCreated}</div>
            <div className="text-sm text-gray-500">Highlights Created</div>
            <BarChart2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.totalFootage}</div>
            <div className="text-sm text-gray-500">Total Footage</div>
            <Clock3 className="w-5 h-5 text-orange-600" />
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">{stats.teamGroups}</div>
            <div className="text-sm text-gray-500">Team Groups</div>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        {/*Highlights-only gallery(wired to FastAPI data)*/}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Highlight Videos</h2>
            </div>
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
              the highlight appears here. Use the visibility menu to set <b>Public</b>, <b>Unlisted</b>, or <b>Private</b>.
            </div>
          )}

          <div className="mt-6">
            {loading && <div className="p-8 text-gray-500">Loading highlights…</div>}
            {error && <div className="p-8 text-red-600">Failed to load: {error}</div>}

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
                  const isEditing = editingId === h.jobId;                 //use jobId
                  const vis = (h.visibility || "private") as Visibility;

                  return (
                    <li key={h.jobId} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
                      {/* Title/rename*/}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {!isEditing ? (
                            <div className="font-semibold text-gray-900 break-words">
                              {h.title || h.originalFileName || "Untitled highlight"} 
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
                            {h.finishedAt ? new Date(h.finishedAt).toLocaleString() : ""}
                          </div>
                        </div>

                        {!isEditing ? (
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => {
                              setEditingId(h.jobId);                        
                              setDraftTitle(h.title || "");
                            }}
                            aria-label="Rename"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => onRename(h.jobId, draftTitle.trim())} 
                            aria-label="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/*Quick actions row*/}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Visibility:</span>
                        <select
                          value={vis}
                          onChange={(e) => onVisibility(h.jobId, e.target.value as Visibility)}
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

                      {/*Open/Delete*/}
                      <div className="flex items-center gap-2">
                        <a
                          href={`/upload/${h.jobId}` || h.signedUrl} //prefer signedUrl from FastAPI
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-2 rounded-md text-white",
                            h.signedUrl ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
                          )}
                        >
                          <Play className="w-4 h-4" />
                          Open
                        </a>
                        <button
                          onClick={() => onDelete(h.jobId)}                   
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