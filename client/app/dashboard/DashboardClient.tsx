//client/app/dashboard/DashboardClient.tsx — Thursday 11-13-25 Version 11am
//now highlights-only and pointed at FastAPI

"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";                            
import {
  Play, Upload, UploadIcon, BarChart2, BarChart3, Clock3, Users,
  Edit3, Save, Trash2, Eye, Lock, Link as LinkIcon, ChevronDown, ChevronUp, Filter,
  Folder as FolderIcon, ChevronRight, Plus, Pencil, MoreHorizontal
} from "lucide-react";                                                   
import cn from "clsx";                                                  
import ProfileDropdown from "../app-components/ProfileDropdown";         

type Visibility = "public" | "unlisted" | "private";                    

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

//11-13-25 Thursday 2pm - For future folder support
// ===================== FOLDERS API HELPERS ======================
async function apiListFolders(ownerEmail: string) {
  const r = await fetch(
    `${API_BASE}/folders?ownerEmail=${encodeURIComponent(ownerEmail)}`,
    { cache: "no-store" }
  );
  if (!r.ok) throw new Error(`GET /folders ${r.status}`);
  return r.json();
}

async function apiCreateFolder(ownerEmail: string, name: string) {
  const r = await fetch(`${API_BASE}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerEmail, name }),
  });
  if (!r.ok) throw new Error(`POST /folders ${r.status}`);
  return r.json();
}

async function apiPatchFolder(folderId: string, body: Record<string, any>) {
  const r = await fetch(`${API_BASE}/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH /folders/${folderId} ${r.status}`);
  return r.json();
}

async function apiDeleteFolder(folderId: string) {
  const r = await fetch(`${API_BASE}/folders/${folderId}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE /folders/${folderId} ${r.status}`);
  return r.json();
}

async function apiRemoveVideoFromFolder(folderId: string, videoIds: string[]) {
  const res = await fetch(`${API_BASE}/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoIds }),
  });
  if (!res.ok) throw new Error("Failed to update folder");
  return res.json();
}
// ===================== FOLDERS API HELPERS ======================
//11-13-25 Thursday 2pm - For future folder support

//Highlight item type shape from FastAPI
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

//11-13-25 Thursday 2pm - For future folder support
// folder shape
type Folder = {
  folderId: string;
  name: string;
  ownerEmail: string;
  videoIds: string[];
  createdAt?: string;
  updatedAt?: string;
};
//11-13-25 Thursday 2pm - For future folder support

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

  //11-13-25 Thursday 2pm - For future folder support
  //folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  //rename-folder state (per-folder inline)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");

  //keep track of which folders are expanded (no hooks inside map)
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());

  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null);   //which video card shows the dropdown
  const [creatingForVideo, setCreatingForVideo] = useState<string | null>(null); //inline "new folder" mini form
  const [newFolderName, setNewFolderName] = useState("");                 //input model for mini form

    // === Dropdown outside-click / escape close ===
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoveMenuFor(null);
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMoveMenuFor(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);


  //Small helper to open a highlight URL from a jobId
  const openVideoByJobId = useCallback((jobId: string) => {
    const item = highlights.find(h => h.jobId === jobId);
    if (!item) return;
    //Try signed URL if you have it in your item; otherwise fall back to GCS URI
    const url =
      (item as any).signedUrl || 
      (item as any).outputUrl ||
      (item as any).signedOutputUrl ||
      (item as any).outputGcsUriSigned ||
      (item as any).outputGcsUri;
    if (url) window.open(url, "_blank");
  }, [highlights]);

  const toggleFolderOpen = useCallback((id: string) => {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  //11-13-25 Thursday 2pm - For future folder support

  //loader to load folders for this user
  const loadFolders = useCallback(async () => {
    if (!userEmail) return;
    setFoldersLoading(true);
    setFolderError(null);
    try {
      const j = await apiListFolders(userEmail);
      setFolders(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      setFolderError(e?.message || "Failed to load folders.");
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  }, [userEmail]);
  //11-13-25 Thursday 2pm - For future folder support

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

  //11-13-25 Thursday 2pm - For future folder support
  //run londer on mount alongside highlights load to also fetch folders when email changes
  useEffect(() => { loadFolders(); }, [loadFolders]);
  //11-13-25 Thursday 2pm - For future folder support

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

  //11-13-25 Thursday 2pm - For future folder support
  //====================== FOLDERS ACTIONS ======================
  //quick action to move one video into a folder (append if not present)
  const moveVideoToFolder = async (jobId: string, folderId: string) => {
    const folder = folders.find(f => f.folderId === folderId);
    if (!folder) return;

    const nextIds = Array.from(new Set([...(folder.videoIds || []), jobId]));
    await apiPatchFolder(folderId, { videoIds: nextIds });

    // refresh local state
    setFolders(prev =>
      prev.map(f => (f.folderId === folderId ? { ...f, videoIds: nextIds } : f))
    );
  };

 //keep your existing moveVideoToFolder but we’ll add remove + dropdown helpers.
  const removeVideoFromFolder = useCallback(
    async (folderId: string, jobId: string) => {
      const folder = folders.find(f => f.folderId === folderId);
      if (!folder) return;

      const nextIds = (folder.videoIds || []).filter(id => id !== jobId);
      await apiRemoveVideoFromFolder(folderId, nextIds);

      // refresh local state
      setFolders(prev =>
        prev.map(f => (f.folderId === folderId ? { ...f, videoIds: nextIds } : f))
      );
    },
    [folders, setFolders]
  );

  // Dropdown item: create a new folder in-line for this specific video (NEW)
  const createFolderAndMove = useCallback(async (jobId: string) => {
    if (!newFolderName.trim()) return;
    const res = await apiCreateFolder(userEmail, newFolderName.trim());
    setNewFolderName("");
    setCreatingForVideo(null);
    await loadFolders();
    await moveVideoToFolder(jobId, res.folderId);
    setMoveMenuFor(null);
  }, [userEmail, newFolderName, loadFolders, moveVideoToFolder]);

  // Drag polish (visual hints only)
    const onDragStartVideo = useCallback((e: React.DragEvent, jobId: string) => {
      e.dataTransfer.setData("text/hooptuber-job-id", jobId);
      e.dataTransfer.effectAllowed = "copyMove";
    }, []);

    const onDragOverFolder = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }, []);

  const onDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/hooptuber-job-id");
    if (!jobId) return;
    await moveVideoToFolder(jobId, folderId);
  };
  //====================== FOLDERS ACTIONS ======================
  //11-13-25 Thursday 2pm - For future folder support

  //To rename highlight VIDEOS
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

    setFolders(prev =>
      prev.map(f => ({
        ...f,
        videoIds: (f.videoIds || []).filter(id => id !== jobId),
      }))
    );
  };

  //====================== UI (same look/feel) ======================
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
                    // <li key={h.jobId} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
                    <li
                      key={h.jobId}
                      className="bg-white border rounded-lg p-4 flex flex-col gap-3"
                      draggable //allow drag
                      onDragStart={(e) => onDragStartVideo(e, h.jobId)} //drag start handler
                    > {/*11-13-25 Thursday Update 2pm*/}
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
                        {/*11-13-25 Thursday Update 2pm*/}
                        {/* <button
                          onClick={() => pickFolderAndMove(h.jobId)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                        >
                          <FolderIcon className="w-4 h-4" />
                          Move to Folder
                        </button>  */}

                        {/* Move to Folder (dropdown) — NEW replaces the old prompt button */}
                        <div className="relative">
                          <button
                            onClick={() => setMoveMenuFor(prev => (prev === h.jobId ? null : h.jobId))}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                          >
                            <FolderIcon className="w-4 h-4" />
                            Move to Folder
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {moveMenuFor === h.jobId && (
                            <div 
                              ref={menuRef}
                              className="absolute z-20 right-0 mt-2 w-64 rounded-md border bg-white shadow-lg p-2">
                              {folders.length === 0 ? (
                                <div className="p-2 text-sm text-gray-600">
                                  No folders yet. Create one below.
                                </div>
                              ) : (
                                <ul className="max-h-60 overflow-auto">
                                  {folders.map((f) => (
                                    <li key={f.folderId}>
                                      <button
                                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-50"
                                        onClick={async () => {
                                          await moveVideoToFolder(h.jobId, f.folderId);
                                          setMoveMenuFor(null);
                                        }}
                                      >
                                        {f.name}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* quick create-in-place */}
                              {creatingForVideo === h.jobId ? (
                                <div className="mt-2 flex gap-2">
                                  <input
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="New folder name"
                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                  />
                                  <button
                                    onClick={() => setCreatingForVideo(null)}
                                    className="px-2 py-1 text-sm border rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!newFolderName.trim()) return;
                                      const res = await apiCreateFolder(userEmail, newFolderName.trim());
                                      setNewFolderName("");
                                      setCreatingForVideo(null);
                                      await loadFolders();
                                      await moveVideoToFolder(h.jobId, res.folderId);
                                      setMoveMenuFor(null);
                                    }}
                                    className="px-2 py-1 text-sm rounded bg-orange-500 text-white hover:bg-orange-600"
                                  >
                                    Create
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCreatingForVideo(h.jobId)}
                                  className="mt-2 w-full px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
                                >
                                  + New folder…
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {/*11-13-25 Thursday Update 2pm*/}      
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
        {/*11-13-25 Thursday Update 2pm*/}
        {/* ===================== Highlight Folders ===================== */}
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Highlight Folders</h2>
            </div>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={async () => {
                const name = prompt("Folder name?")?.trim();
                if (!name) return;
                await apiCreateFolder(userEmail, name);
                await loadFolders();
              }}
            >
              <Plus className="w-4 h-4" />
              New Folder
            </button>
          </div>

          <div className="mt-6">
            {foldersLoading && <div className="p-8 text-gray-500">Loading folders…</div>}
            {folderError && <div className="p-8 text-red-600">Failed to load folders: {folderError}</div>}

            {!foldersLoading && !folderError && folders.length === 0 && (
              <div className="p-6 bg-white border rounded-lg text-gray-600">
                No folders yet. Create one and drag videos into it, or use “Move to Folder”.
              </div>
            )}

            {!foldersLoading && !folderError && folders.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {folders.map((f) => {
                  const isEditing = editingFolderId === f.folderId;
                  //const [open, setOpen] = useState(true); // per-folder expand (small trick)
                  const isOpen = openFolderIds.has(f.folderId);  

                  // resolve video objects for this folder
                  const videosInFolder = (f.videoIds || [])
                    .map(id => highlights.find(h => h.jobId === id))
                    .filter(Boolean) as HighlightItem[];

                  return (
                    <li
                      key={f.folderId}
                      className="bg-white border rounded-lg p-4 flex flex-col gap-3"
                      onDragOver={onDragOverFolder}                         //accept drops (drag target)
                      onDrop={(e) => onDropOnFolder(e, f.folderId)}         //drop handler
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {!isEditing ? (
                            <div className="font-semibold text-gray-900 break-words flex items-center gap-2">
                              <FolderIcon className="w-4 h-4" />
                              {f.name}
                            </div>
                          ) : (
                            <input
                              value={draftFolderName}
                              onChange={(e) => setDraftFolderName(e.target.value)}
                              className="w-full border rounded px-2 py-1"
                              placeholder="Folder name"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isEditing ? (
                            <>
                              <button
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => {
                                  setEditingFolderId(f.folderId);
                                  setDraftFolderName(f.name || "");
                                }}
                                aria-label="Rename folder"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                className="text-gray-600 hover:text-gray-900"
                                //onClick={() => setOpen((v) => !v)}
                                onClick={() => toggleFolderOpen(f.folderId)}
                                aria-label="Toggle"
                              >
                                {/*{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}*/}
                                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-gray-600 hover:text-gray-900"
                              onClick={async () => {
                                await apiPatchFolder(f.folderId, { name: draftFolderName.trim() });
                                setEditingFolderId(null);
                                setDraftFolderName("");
                                await loadFolders(); // refresh names
                              }}
                              aria-label="Save folder name"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* folder actions */}
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={async () => {
                            if (!confirm("Delete this folder? This cannot be undone (Videos will not be deleted).")) return;
                            await apiDeleteFolder(f.folderId);
                            await loadFolders();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>

                      {/* folder contents */}
                      {/*open && ( */}
                      {isOpen && (
                        <div className="mt-2">
                          {videosInFolder.length === 0 ? (
                            <div className="text-sm text-gray-500">
                              Drop a video here or use “Move to Folder”.
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {videosInFolder.map(v => (
                                // <li key={v.jobId} className="text-sm text-gray-800 flex items-center gap-2">
                                //   <Play className="w-3 h-3" />
                                //   {v.title || v.originalFileName || v.jobId}
                                // </li>
                                <li 
                                  key={v.jobId} 
                                  className="text-sm text-gray-800 flex items-center justify-between gap-2"
                                  draggable
                                  onDragStart={(e) => onDragStartVideo(e, v.jobId)}
                                  >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Play className="w-3 h-3 flex-none" />
                                    <span className="truncate">
                                      {v.title || v.originalFileName || v.jobId}
                                    </span>
                                  </div>
                                
                                  <div className="flex items-center gap-2">
                                    {/* Play (opens the signed URL) */}
                                    <button
                                      onClick={() => openVideoByJobId(v.jobId)}
                                      className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                                      title="Play"
                                    >
                                      Play
                                    </button>
                                
                                    {/* Remove ONLY from this folder */}
                                    <button
                                      onClick={() => removeVideoFromFolder(f.folderId, v.jobId)}
                                      className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
                                      title="Remove from folder"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
        {/* =================== END Highlight Folders=================== */}
        {/*11-13-25 Thursday Update 2pm*/}
      </main>
    </div>
  );
}
