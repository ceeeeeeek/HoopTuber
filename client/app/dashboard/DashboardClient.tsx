//client/app/dashboard/DashboardClient.tsx — Thursday 11-13-25 Version 11am
//now highlights-only and pointed at FastAPI

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";                            
import {
  Play, Upload, UploadIcon, BarChart2, BarChart3, Clock3, Users,
  Edit3, Save, Trash2, Eye, Lock, Link as LinkIcon, ChevronDown, ChevronUp, Filter
} from "lucide-react";                                                   
import cn from "clsx";                                                  
import ProfileDropdown from "../app-components/ProfileDropdown";         

type Visibility = "public" | "unlisted" | "private";                    

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

type HighlightItem = {
  jobId: string;                                                   
  originalFileName?: string;                                     
  ownerEmail?: string;                                            
  title?: string;                                              
  finishedAt?: string;        
  createdAt?: string;                                     
  signedUrl?: string;                                             
  outputGcsUri?: string;                                          
  durationSeconds?: number;                                        
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

  //11-08-25 Saturday 2:18pm Update - Added Filter Button to Dashboard + New sorting/filtering state and UI hooks for dashboard page
  // ===Filter state===
  type SortField = "createdAt" | "visibility" | "alphabetical" | null;    
  type SortDirection = "asc" | "desc";                                    

  const [filterOpen, setFilterOpen] = useState(false);                    
  const [appliedField, setAppliedField] = useState<SortField>(null);      
  const [appliedDirection, setAppliedDirection] =
    useState<SortDirection>("asc");                                     

  const [pendingField, setPendingField] = useState<SortField>(null);      
  const [pendingDirection, setPendingDirection] =
    useState<SortDirection>("asc");                                      

  const openFilter = () => {                                              
    setPendingField(appliedField);
    setPendingDirection(appliedDirection);
    setFilterOpen(true);
  };

  const closeFilter = () => setFilterOpen(false); 
  //11-08-25 Saturday 2:18pm Update

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
    const totalSeconds = highlights.reduce((acc, h) => acc + (h.durationSeconds || 0), 0);
    //11-13-25 Thursday 10am - For 'Total Footage' stat
    //human-readable label without rounding up
    const hours = Math.floor(totalSeconds / 3600);                           
    const minutes = Math.floor((totalSeconds % 3600) / 60);                  
    const seconds = Math.floor(totalSeconds % 60);                           

    let label = "0m";  //default
    if (totalSeconds < 60) {                                                 
      label = `${seconds}s`;
    } else if (totalSeconds < 3600) {                                        
      label = seconds
        ? `${minutes}m ${seconds}s`
        : `${minutes}m`;
    } else {                                                                 
      if (minutes === 0 && seconds === 0) {
        label = `${hours}h`;
      } else if (seconds === 0) {
        label = `${hours}h ${minutes}m`;
      } else {
        label = `${hours}h ${minutes}m ${seconds}s`;
      }
    }

    return {
      videosUploaded: count,                 
      highlightsCreated: count,              
      totalFootageSeconds: totalSeconds,     //exact numeric seconds if needed
      totalFootageLabel: label,              //pretty display string
      teamGroups: 3,                         //placeholder
    };
  }, [highlights]);
  //11-13-25 Thursday 10am - For 'Total Footage' stat

  //11-08-25 Saturday 2:18pm Update
  // Derived, sorted view of highlights based on applied filter settings  
  const sortedHighlights = useMemo(() => {                                
    const items = [...highlights];                                        
    const field = appliedField;                                           
    const dir = appliedDirection === "asc" ? 1 : -1;                      

    if (!field) return items; //no sorting applied                       

    if (field === "alphabetical") {                                       
      items.sort((a, b) => {
        const aName = (a.title || a.originalFileName || "").toLowerCase();
        const bName = (b.title || b.originalFileName || "").toLowerCase();
        if (aName < bName) return -1 * dir;
        if (aName > bName) return 1 * dir;
        return 0;
      });
    } else if (field === "createdAt") {                                   
      items.sort((a, b) => {
        const aTime = new Date(a.createdAt || a.finishedAt || 0).getTime() || 0;
        const bTime = new Date(b.createdAt || b.finishedAt || 0).getTime() || 0;
        return (aTime - bTime) * dir;
      });
    } else if (field === "visibility") {                                  
      const rank = (vis?: Visibility) => {
        if (vis === "public") return 0;
        if (vis === "unlisted") return 1;
        return 2; //private / undefined
      };
      items.sort((a, b) => (rank(a.visibility) - rank(b.visibility)) * dir);
    }

    return items;
  }, [highlights, appliedField, appliedDirection]);  
  
    //human-readable label for the currently applied sort
    const appliedLabel = useMemo(() => {
      if (!appliedField) return "";
      const dirLabel = appliedDirection === "asc" ? "Asc" : "Desc";
  
      if (appliedField === "createdAt") return `Created • ${dirLabel}`;
      if (appliedField === "visibility") return `Visibility • ${dirLabel}`;
      if (appliedField === "alphabetical") return `A-Z • ${dirLabel}`;
  
      return "";
    }, [appliedField, appliedDirection]);
  //11-08-25 Saturday 2:18pm Update

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
            {/*<div className="text-3xl font-bold">{stats.totalHighlightFootageCombined}</div> 11-08-25 Saturday 11:42am - For 'Total Footage' stat */}
            <div className="text-3xl font-bold">
    {         stats.totalFootageLabel} {/*uses exact hh/mm/ss label; 11-13-25 Thursday 10am - For 'Total Footage' stat */} 
            </div>
            <div className="text-sm text-gray-500">Total Footage</div>
            <Clock3 className="w-5 h-5 text-orange-600" />
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <div className="text-3xl font-bold">3</div>
            <div className="text-sm text-gray-500">Team Groups</div>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        {/*Highlights-only gallery(wired to FastAPI data)*/}
        <section className="mt-10">
          {/*11-08-25 Saturday 2:18pm Update */}
          {/*<div className="flex items-center justify-between">*/}
          <div className="flex items-center justify-between relative"> {/*relative for dropdown positioning */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Highlight Videos</h2>
            </div>
            {/*11-08-25 Saturday 2:18pm Update */}
            <div className="flex items-center gap-3">
              {/*Filter button */}
              <button
                type="button"
                onClick={() => (filterOpen ? closeFilter() : openFilter())}
                className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 px-2 py-1 border rounded-md bg-white"
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    filterOpen && "rotate-180"
                  )}
                />
              </button>
              {/*11-08-25 Saturday 2:18pm Update */} 
              {/*tiny badge showing current applied sort */}
              {appliedLabel && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  {appliedLabel}
                </span>
              )}
              {/*11-08-25 Saturday 2:18pm Update */} 

          {/*11-08-25 Saturday 2:18pm Update */}   
            <button
              className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
              onClick={() => setHelpOpen((v) => !v)}
            >
              {helpOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              How it works
            </button>
          </div>

            {/*Filter dropdown panel */}
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border rounded-lg shadow-lg p-3 z-20">
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  Filter by field
                </div>
                <div className="flex flex-col gap-1 mb-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setPendingField("createdAt")}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded",
                      pendingField === "createdAt" && "bg-gray-100 font-semibold"
                    )}
                  >
                    Created date
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingField("visibility")}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded",
                      pendingField === "visibility" && "bg-gray-100 font-semibold"
                    )}
                  >
                    Visibility (Public → Unlisted → Private)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingField("alphabetical")}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded",
                      pendingField === "alphabetical" && "bg-gray-100 font-semibold"
                    )}
                  >
                    Alphabetical (Title / File name)
                  </button>
                </div>

                <div className="text-xs font-semibold text-gray-500 mb-1">
                  Sort results
                </div>
                <div className="flex gap-2 mb-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setPendingDirection("asc")}
                    className={cn(
                      "flex-1 px-2 py-1 rounded border",
                      pendingDirection === "asc" && "bg-gray-100 font-semibold border-gray-400"
                    )}
                  >
                    Ascending
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDirection("desc")}
                    className={cn(
                      "flex-1 px-2 py-1 rounded border",
                      pendingDirection === "desc" && "bg-gray-100 font-semibold border-gray-400"
                    )}
                  >
                    Descending
                  </button>
                </div>

                <div className="flex justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      // Clear: remove sorting entirely
                      setAppliedField(null);
                      setAppliedDirection("asc");
                      setPendingField(null);
                      setPendingDirection("asc");
                      closeFilter();
                    }}
                    className="px-2 py-1 rounded border text-gray-600 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Cancel: discard pending changes
                        setPendingField(appliedField);
                        setPendingDirection(appliedDirection);
                        closeFilter();
                      }}
                      className="px-2 py-1 rounded border text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Apply: commit pending to applied
                        setAppliedField(pendingField);
                        setAppliedDirection(pendingDirection);
                        closeFilter();
                      }}
                      className="px-2 py-1 rounded bg-orange-500 text-white hover:bg-orange-600"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/*11-08-25 Saturday 2:18pm Update */}   

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
                {/*{highlights.map((h) => {*/}
                {sortedHighlights.map((h) => {  {/*11-08-25 Sunday 2:18pm Update - Use sortedHighlights */}
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
                          href={h.signedUrl || "#"} //prefer signedUrl from FastAPI
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
