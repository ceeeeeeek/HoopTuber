"use client";

import {useEffect, useMemo, useState, useCallback, useRef} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; //to read ?refresh=...
import { useSession } from "next-auth/react";
import {
  Play, Upload, UploadIcon, BarChart2, BarChart3, Clock3, Users,
  Edit3, Save, Trash2, Eye, Lock, Link as LinkIcon, ChevronDown, ChevronUp, Filter,
  Folder as FolderIcon, ChevronRight, Plus, Pencil, MoreHorizontal, Edit,
  Sun, Moon, Trophy // Added Icons for theme/brand
} from "lucide-react";
import cn from "clsx";
import ProfileDropdown from "../app-components/ProfileDropdown";
import { DribbleIcon } from "../../components/icons/DribbleIcon";
import type React from "react"; //for React.SyntheticEvent typings

type FolderVisibility = "public" | "unlisted" | "private";
type RunVisibility = "public" | "private" | "unlisted";

/**
 * Format duration in seconds to a human-readable string
 * - Under 60s: "XXs"
 * - 60s to 3599s: "Xm Ys" or "Xm" (if no seconds)
 * - 3600s and above: "Xh Ym" (no seconds)
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

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
  videoDurationSec?: number; //from Firestore jobId document
  status?: string;
  visibility?: FolderVisibility;
  description?: string;
  likesCount?: number; //engagement counters from backend
  viewsCount?: number; //engagement counters from backend
  likedLocally?: boolean;
};

//folder shape
type HighlightFolder = {
  folderId: string;
  name: string;
  ownerEmail: string;
  videoIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type RunSummary = {
  runId: string;
  name: string;
  ownerEmail: string;
  visibility: RunVisibility;
  members?: string[];
  highlightIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  maxMembers?: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

//Shared front-end hlpers (views + likes in localStorage)
const VIEW_STORAGE_PREFIX = "hooptuber:viewed:";
const LIKES_STORAGE_PREFIX = "hooptuber_like_v1:";

function viewStorageKey(jobId: string) {
  return `${VIEW_STORAGE_PREFIX}${jobId}`;
}

function likeStorageKey(jobId: string) {
  return `${LIKES_STORAGE_PREFIX}${jobId}`;
}

function hasStoredView(jobId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(viewStorageKey(jobId)) === "1";
}

function markStoredView(jobId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(viewStorageKey(jobId), "1");
}

function isLikedLocally(jobId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LIKES_STORAGE_PREFIX + jobId) === "1";
}

function setLikedLocally(jobId: string, liked: boolean) {
  if (typeof window === "undefined") return;
  if (liked) {
    window.localStorage.setItem(likeStorageKey(jobId), "1");
  } else {
    window.localStorage.removeItem(likeStorageKey(jobId));
  }
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === "AbortError"
  ) || (err as any)?.name === "AbortError";
}

//=== RUNS API HELPERS ===
async function apiGetRunCount(memberEmail: string): Promise<number> {
  try {
    const url = `${API_BASE}/runs?memberEmail=${encodeURIComponent(memberEmail)}`;
    const r = await fetch(url, { cache: "no-store" });

    if (!r.ok) return 0;

    const data = (await r.json().catch(() => null)) as any;

    if (data && typeof data.count === "number") return data.count;
    if (Array.isArray(data?.items)) return data.items.length;

    return 0;
  } catch {
    return 0;
  }
}

function buildAssignedRunsMap(allRuns: RunSummary[]): Record<string, RunSummary[]> {
  const map: Record<string, RunSummary[]> = {};
  for (const run of allRuns) {
    const ids = run.highlightIds || [];
    for (const hId of ids) {
      if (!map[hId]) map[hId] = [];
      map[hId].push(run);
    }
  }
  return map;
}

const apiListRuns = async (memberEmail: string): Promise<RunSummary[]> => {
  const url = `${API_BASE}/runs?memberEmail=${encodeURIComponent(memberEmail)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(
      `Failed to load runs: ${r.status} ${r.statusText} ${txt}`
    );
  }
  const data = await r.json();
  return Array.isArray(data?.items) ? (data.items as RunSummary[]) : [];
};

const apiCreateRun = async (
  ownerEmail: string,
  name: string
): Promise<RunSummary> => {
  const r = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      ownerEmail,
      visibility: "private", //default
    }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(
      `Failed to create run: ${r.status} ${r.statusText} ${txt}`
    );
  }

  const data = await r.json();
  return data.run as RunSummary;
};

const apiAssignToRun = async (
  runId: string,
  highlightId: string
): Promise<void> => {
  const r = await fetch(
    `${API_BASE}/runs/${encodeURIComponent(runId)}/assignHighlight`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlightId }),
    }
  );
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(
      `Failed to assign highlight to run: ${r.status} ${r.statusText} ${txt}`
    );
  }
};

//===================== FOLDERS API HELPERS ======================
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

export default function DashboardClient() {
  // THEME STATE
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  //auth/session
  const { data: session, status } = useSession(); 
  const userEmail = session?.user?.email || "";
  const backendReady = status === "authenticated" && !!userEmail;
  const searchParams = useSearchParams();              
  const refreshKey = searchParams?.get("refresh") ?? null;

  if (typeof window !== "undefined") {
    console.log("Dashboard session", session);
    console.log("Dashboard userEmail", userEmail);
  }

  //State
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);

  const [openInlineJobIds, setOpenInlineJobIds] = useState<Set<string>>(new Set());

  //View tracking
  type ViewProgress = {
    thresholdSeconds: number;     
    hasCounted: boolean;          
    continuousSeconds: number;    
    lastTime: number | null;      
  };
   
  const viewProgressRef = useRef<Record<string, ViewProgress>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [folderPlayingJobId, setFolderPlayingJobId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  //===Filter state===
  type SortField = "createdAt" | "visibility" | "alphabetical" | null;    
  type SortDirection = "asc" | "desc";                                   

  const [filterOpen, setFilterOpen] = useState(false);                    
  const [appliedField, setAppliedField] = useState<SortField>(null);       
  const [appliedDirection, setAppliedDirection] = useState<SortDirection>("asc");                                      

  const [pendingField, setPendingField] = useState<SortField>(null);       
  const [pendingDirection, setPendingDirection] = useState<SortDirection>("asc");                                       

  const openFilter = () => {                                              
    setPendingField(appliedField);
    setPendingDirection(appliedDirection);
    setFilterOpen(true);
  };

  const closeFilter = () => setFilterOpen(false); 

  //folders state
  const [folders, setFolders] = useState<HighlightFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");

  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());

  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null);   
  const [creatingForVideo, setCreatingForVideo] = useState<string | null>(null); 
  const [newFolderName, setNewFolderName] = useState("");                 

  const runMenuRef = useRef<HTMLDivElement | null>(null); 

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null)
  const [runCount, setRunCount] = useState<number>(0); 
  const [newRunName, setNewRunName] = useState("");
  const [runMenuFor, setRunMenuFor] = useState<string | null>(null);
  const [openRunsMetaIds, setOpenRunsMetaIds] = useState<Set<string>>(new Set());   

  const menuRef = useRef<HTMLDivElement | null>(null); 
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoveMenuFor(null);
        setRunMenuFor(null);
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;

      const inMoveMenu = menuRef.current?.contains(target);
      const inRunMenu  = runMenuRef.current?.contains(target);

      if (!inMoveMenu) setMoveMenuFor(null);
      if (!inRunMenu) setRunMenuFor(null);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const toggleFolderOpen = useCallback((id: string) => {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getHighlightPlaybackUrl = (jobId: string): string | null => {
    const h = highlights.find((x) => x.jobId === jobId);
    if (!h) return null;
   
    return (
      (h as any).signedUrl ||
      (h as any).outputSignedUrl ||
      (h as any).outputGcsUriSigned ||
      (h as any).outputGcsUri ||
      null
    );
  };
   

  const loadFolders = useCallback(async () => {
    if (!userEmail) return;

    try {
      console.log("loadFolders() called with userEmail =", userEmail);
      setFoldersLoading(true);
      setFolderError(null);

      const j = await apiListFolders(userEmail);
      console.log("folders raw JSON", j);

      const foldersArr = Array.isArray(j?.items)
        ? (j.items as HighlightFolder[])
        : [];

      setFolders(foldersArr);
    } catch (err: any) { 
      if (isAbortError(err)) {
        console.debug("loadFolders() aborted, ignoring"); 
        return;
      }
      console.error("loadFolders() error", err);           
      setFolderError(err?.message || "Failed to load folders."); 
      setFolders([]);                                       
    } finally {
      setFoldersLoading(false);                         
    }
  }, [userEmail]);


  const load = useCallback(async () => {
    if (!userEmail) return;

    try {
      console.log("load() called with userEmail =", userEmail);
      setHighlightsLoading(true);
      setHighlightsError(null);

      const url = `${API_BASE}/highlights?ownerEmail=${encodeURIComponent(
        userEmail
      )}&limit=100&signed=true`;

      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`GET /highlights ${r.status}: ${txt}`);
      }

      const json = await r.json();
      console.log("highlights raw JSON", json);

      const rawItems = Array.isArray(json?.items) ? json.items : [];

      const mapped: HighlightItem[] = rawItems.map((raw: any) => {
        const likedFromServer = !!raw.likedByCurrentUser;

        return {
          jobId: raw.jobId,
          originalFileName: raw.originalFileName,
          title: raw.title ?? raw.originalFileName ?? "Untitled",
          visibility: raw.visibility ?? "private",
          finishedAt: raw.finishedAt,
          createdAt: raw.createdAt,
          outputGcsUri: raw.outputGcsUri,
          analysisGcsUri: raw.analysisGcsUri,
          ownerEmail: raw.ownerEmail,
          userId: raw.userId,
          status: raw.status,
          durationSeconds: raw.durationSeconds,
          videoDurationSec: raw.videoDurationSec ?? 0, 
          description: raw.description,
          likesCount: raw.likesCount ?? 0,
          viewsCount: raw.viewsCount ?? 0,
          likedLocally: likedFromServer || isLikedLocally(raw.jobId),
          signedUrl: raw.signedUrl,
        };
      });

      setHighlights(mapped);
      
        try {
          const counts: Record<string, number> = {};

          await Promise.all(
            rawItems.map(async (h) => {
              try {
                const res = await fetch(
                  `${API_BASE}/video/comments?` +
                    `highlightId=${encodeURIComponent(h.jobId)}` +
                    `&limit=50`,
                  { cache: "no-store" }
                );

                if (!res.ok) return;

                const json = await res.json();
                const commentItems = Array.isArray(json.items) ? json.items : [];
                counts[h.jobId] = commentItems.length;
              } catch (err) {
                console.warn("Failed to load comment count for", h.jobId, err);
              }
            })
          );

          setCommentCounts(counts);
        } catch (err) {
          console.warn("Error loading comment counts", err);
        }
    } catch (err: any) { 
      if (isAbortError(err)) {
        console.debug("load() aborted, ignoring"); 
        return;
      }
      console.error("load() error", err);                   
      setHighlightsError(err?.message || "Failed to load."); 
      setHighlights([]);                                    
    } finally {
      setHighlightsLoading(false);                          
    }
  }, [userEmail]);

const runsByHighlightId = useMemo(() => {
  const map = new Map<string, RunSummary[]>();

  for (const run of runs) {
    for (const hid of run.highlightIds || []) {
      const list = map.get(hid) || [];
      list.push(run);
      map.set(hid, list);
    }
  }

  return map;
}, [runs]);


  useEffect(() => {
    if (!backendReady || !userEmail) return; 

    let cancelled = false; 

    const tick = async () => { 
      if (cancelled) return;   
      try {
        await load();          
        await loadFolders();   
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Dashboard load error", err); 
      }
    };

    tick();

    return () => {
      cancelled = true; 
    };
  }, [backendReady, userEmail, load, loadFolders, refreshKey]); 
  
  useEffect(() => {
    if (!backendReady) return; 

    let cancelled = false;

    const loadRuns = async () => { 
      try {
        setLoadingRuns(true);
        setRunsError(null);
        const items = await apiListRuns(userEmail);
        if (!cancelled) {
          setRuns(items);
        }
      } catch (err: any) { 
        if (isAbortError(err)) {
          console.debug("Dashboard apiListRuns aborted, ignoring"); 
          return;
        }
        console.error("Dashboard apiListRuns error", err);          
        if (!cancelled) {
          setRunsError(err?.message || "Failed to load runs.");      
          setRuns([]);                                               
        }
      } finally {
        if (!cancelled) {
          setLoadingRuns(false);                                     
        }
      }
    };

    loadRuns();

    return () => {
      cancelled = true;
    };
  }, [backendReady, userEmail]);

  
useEffect(() => {
  if (!backendReady) return; 

  let cancelled = false;

  (async () => {
    try {
      const count = await apiGetRunCount(userEmail);
      if (!cancelled) {
        setRunCount(count);
      }
    } catch (err: any) { 
      if (isAbortError(err)) {
        console.debug("apiGetRunCount aborted, ignoring"); 
        return;
      }
      if (!cancelled) {
        setRunCount(0);                      
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, [backendReady, userEmail]); 

  const stats = useMemo(() => {
    const count = highlights.length;
    const totalSeconds = highlights.reduce((acc, h) => acc + (h.videoDurationSec || 0), 0);
    const label = totalSeconds > 0 ? formatDuration(totalSeconds) : "0s";

    return {
      videosUploaded: count,
      highlightsCreated: count,
      totalFootageSeconds: totalSeconds,     
      totalFootageLabel: label,              
    };
  }, [highlights]);

  const sortedHighlights = useMemo(() => {                                      
    const items = [...highlights];                                            
    const field = appliedField;                                               
    const dir = appliedDirection === "asc" ? 1 : -1;                          

    if (!field) return items;                    

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
      const rank = (vis?: FolderVisibility) => {
        if (vis === "public") return 0;
        if (vis === "unlisted") return 1;
        return 2; 
      };
      items.sort((a, b) => (rank(a.visibility) - rank(b.visibility)) * dir);
    }

    return items;
  }, [highlights, appliedField, appliedDirection]);  
  
    const appliedLabel = useMemo(() => {
      if (!appliedField) return "";
      const dirLabel = appliedDirection === "asc" ? "Asc" : "Desc";
   
      if (appliedField === "createdAt") return `Created • ${dirLabel}`;
      if (appliedField === "visibility") return `Visibility • ${dirLabel}`;
      if (appliedField === "alphabetical") return `A-Z • ${dirLabel}`;
   
      return "";
    }, [appliedField, appliedDirection]);

  const patchHighlight = async (jobId: string, body: Record<string, any>) => {
      const r = await fetch(`${API_BASE}/highlights/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerEmail: userEmail, ...body }),  
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`PATCH /highlights/${jobId} ${r.status}: ${t}`);
    }
    return r.json().catch(() => ({}));
  };

  const moveVideoToFolder = async (jobId: string, folderId: string) => {
    const folder = folders.find(f => f.folderId === folderId);
    if (!folder) return;

    const nextIds = Array.from(new Set([...(folder.videoIds || []), jobId]));
    await apiPatchFolder(folderId, { videoIds: nextIds });

    setFolders(prev =>
      prev.map(f => (f.folderId === folderId ? { ...f, videoIds: nextIds } : f))
    );
  };

  const removeVideoFromFolder = useCallback(
    async (folderId: string, jobId: string) => {
      const folder = folders.find(f => f.folderId === folderId);
      if (!folder) return;

      const nextIds = (folder.videoIds || []).filter(id => id !== jobId);
      await apiRemoveVideoFromFolder(folderId, nextIds);

      setFolders(prev =>
        prev.map(f => (f.folderId === folderId ? { ...f, videoIds: nextIds } : f))
      );
    },
    [folders, setFolders]
  );

  const createFolderAndMove = useCallback(async (jobId: string) => {
    if (!newFolderName.trim()) return;
    const res = await apiCreateFolder(userEmail, newFolderName.trim());
    setNewFolderName("");
    setCreatingForVideo(null);
    await loadFolders();
    await moveVideoToFolder(jobId, res.folderId);
    setMoveMenuFor(null);
  }, [userEmail, newFolderName, loadFolders, moveVideoToFolder]);

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

  const assignVideoToRun = async (jobId: string, runId: string) => {
      await apiAssignToRun(runId, jobId);

      setRunMenuFor(null);
   
      setRuns(prev => {
        const next = prev.map(run =>
          run.runId === runId
            ? {
                ...run,
                highlightIds: Array.from(new Set([...(run.highlightIds || []), jobId])),
              }
            : run
        );
   
      return next;
    });
  };

  const createRunAndAssign = async (jobId: string) => {
    if (!newRunName.trim() || !userEmail) return;
    const newRun = await apiCreateRun(userEmail, newRunName.trim());
    setNewRunName("");
   
    setRuns(prev => {
      const updatedRun: RunSummary = {
        ...newRun,
        highlightIds: Array.from(new Set([...(newRun.highlightIds || []), jobId])),
      };
      const next = [updatedRun, ...prev];
      return next;
    });
   
    await apiAssignToRun(newRun.runId, jobId);
   
    setRunMenuFor(null);
  };

    const onRename = async (jobId: string, title: string) => {
      const res = await patchHighlight(jobId, { title });
      setEditingId(null);
      const updated = res?.item as Partial<HighlightItem> | undefined;
      if (updated) {
        setHighlights((prev) =>
          prev.map((h) => (h.jobId === jobId ? { ...h, ...updated } : h))
        );
      } else {
        await load(); 
      }
    };


    const onVisibility = async (jobId: string, visibility: FolderVisibility) => {
      const res = await patchHighlight(jobId, { visibility });
      const updated = res?.item as Partial<HighlightItem> | undefined;
      if (updated) {
        setHighlights((prev) =>
          prev.map((h) => (h.jobId === jobId ? { ...h, ...updated } : h))
        );
      } else {
        await load(); 
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

  async function handleLikeClick(jobId: string) {
    const alreadyLiked = isLikedLocally(jobId);

    const nextLiked = !alreadyLiked;
    const delta = nextLiked ? 1 : -1;

    setLikedLocally(jobId, nextLiked);

    setHighlights((prev) =>
      prev.map((card) => {
        if (card.jobId !== jobId) return card;

        const newCount = Math.max(0, (card.likesCount ?? 0) + delta);

        return {
          ...card,
          likesCount: newCount,
          likedLocally: nextLiked, 
        };
      })
    );

    try {
      const r = await fetch(`${API_BASE}/video/engagement/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlightId: jobId, delta }),
      });
   
      if (!r.ok) throw new Error("like failed");
   
      const json = await r.json().catch(() => null);

      if (typeof json?.likesCount === "number") {
        setHighlights((prev) =>
          prev.map((card) =>
            card.jobId === jobId
              ? { ...card, likesCount: json.likesCount }
              : card
          )
        );
      }
    } catch (err) {
      console.error("record_like failed:", err);

    setLikedLocally(jobId, alreadyLiked);

      setHighlights((prev) =>
        prev.map((card) => {
          if (card.jobId !== jobId) return card;

          return {
            ...card,
            likesCount: Math.max(0, (card.likesCount ?? 0) - delta),
            likedLocally: alreadyLiked,
          };
        })
      );
    }
  }
   
  const handleInlineInterrupt = (
    h: HighlightItem,
    ev: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const video = ev.currentTarget;
    const vp = viewProgressRef.current[h.jobId];
    if (!vp || vp.hasCounted) return;

    vp.continuousSeconds = 0;
    vp.lastTime = video.currentTime;
  };

  const handleInlineTimeUpdate = async (
    h: HighlightItem,
    ev: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const video = ev.currentTarget;
    const duration = h.durationSeconds ?? video.duration;

    if (!duration || !Number.isFinite(duration)) return;

    if (hasStoredView(h.jobId)) {
      const vp = viewProgressRef.current[h.jobId];
      if (vp) vp.hasCounted = true;
      return;
    }

    const threshold = Math.min(30, duration / 2);

    let vp = viewProgressRef.current[h.jobId];
    if (!vp) {
      vp = viewProgressRef.current[h.jobId] = {
        thresholdSeconds: threshold,
        hasCounted: false,
        continuousSeconds: 0,
        lastTime: video.currentTime,
      };
    } else if (!vp.hasCounted && vp.thresholdSeconds !== threshold) {
      vp.thresholdSeconds = threshold;
    }

    if (vp.hasCounted) return;

    const current = video.currentTime;

    if (vp.lastTime == null) {
      vp.lastTime = current;
      return;
    }

    const delta = current - vp.lastTime;

    if (delta <= 0 || delta > 1.5) {
      vp.continuousSeconds = 0;
      vp.lastTime = current;
      return;
    }

    vp.continuousSeconds += delta;
    vp.lastTime = current;

    if (vp.continuousSeconds < vp.thresholdSeconds) return;

    vp.hasCounted = true;
    markStoredView(h.jobId); 

    try {
      const r = await fetch(`${API_BASE}/video/engagement/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highlightId: h.jobId,
          source: "dashboard-inline",
        }),
      });

      if (!r.ok) return;

      const json = await r.json().catch(() => null);
      const newViews =
        typeof json?.viewsCount === "number"
          ? json.viewsCount
          : (h.viewsCount ?? 0) + 1;

      setHighlights((prev) =>
        prev.map((x) =>
          x.jobId === h.jobId ? { ...x, viewsCount: newViews } : x
        )
      );
    } catch (err) {
      console.warn("Failed to record view (dashboard inline)", err);
    }
  };

  //====================== RENDER UI (START) ======================
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/*Header*/}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all">
                <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-white">Hoop<span className="text-orange-500">Tuber</span></span>
          </Link>
          <div className="flex items-center gap-4">
             {/* Theme Toggle */}
             <button
                onClick={toggleTheme}
                className="text-zinc-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-500 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </Link>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Gallery for Your Basketball Videos</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Manage your uploaded videos and generated highlights</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                 <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Videos Uploaded</div>
                 <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <UploadIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                 </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.videosUploaded}</div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
             <div className="flex items-center justify-between mb-2">
                 <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Highlights Created</div>
                 <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <BarChart2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                 </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.highlightsCreated}</div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                 <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Footage</div>
                 <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <Clock3 className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                 </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
               {stats.totalFootageLabel} 
            </div>
          </div>

          {/* Card 4 – My Runs / Team Groups*/}
           <Link
              href="/my-runs"
              className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer transition-colors group"
            >
               <div className="flex items-center justify-between mb-2">
                 <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">My Runs / Teams</div>
                 <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors">
                    <DribbleIcon className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                 </div>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                {runCount === null ? "—" : runCount}
            </div>
            </Link>
          </div>

        {/*Highlights-only gallery*/}
        <section className="mt-14">
          <div className="flex items-center justify-between relative mb-6"> 
            <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
               </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Highlight Videos</h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/*Filter button */}
              <button
                type="button"
                onClick={() => (filterOpen ? closeFilter() : openFilter())}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
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
              
              {/*tiny badge showing current applied sort */}
              {appliedLabel && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                  {appliedLabel}
                </span>
              )}

            <button
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors ml-2"
              onClick={() => setHelpOpen((v) => !v)}
            >
              {helpOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Help
            </button>
          </div>

            {/*Filter dropdown panel */}
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-4 z-20">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                  Filter by field
                </div>
                <div className="flex flex-col gap-1 mb-4 text-sm">
                  {["createdAt", "visibility", "alphabetical"].map((field) => (
                       <button
                        key={field}
                        type="button"
                        onClick={() => setPendingField(field as SortField)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors",
                          pendingField === field 
                            ? "bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-white"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                         {field === "createdAt" && "Created Date"}
                         {field === "visibility" && "Visibility (Public → Private)"}
                         {field === "alphabetical" && "Alphabetical (A-Z)"}
                      </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                  Sort Order
                </div>
                <div className="flex gap-2 mb-4 text-sm">
                    {["asc", "desc"].map((dir) => (
                        <button
                        key={dir}
                        type="button"
                        onClick={() => setPendingDirection(dir as SortDirection)}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-md border text-center transition-all",
                          pendingDirection === dir
                            ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 font-semibold text-zinc-900 dark:text-white shadow-sm"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        {dir === "asc" ? "Ascending" : "Descending"}
                      </button>
                    ))}
                </div>

                <div className="flex justify-between gap-2 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedField(null);
                      setAppliedDirection("asc");
                      setPendingField(null);
                      setPendingDirection("asc");
                      closeFilter();
                    }}
                    className="px-3 py-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Clear
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingField(appliedField);
                        setPendingDirection(appliedDirection);
                        closeFilter();
                      }}
                      className="px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedField(pendingField);
                        setAppliedDirection(pendingDirection);
                        closeFilter();
                      }}
                      className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 font-medium shadow-md shadow-orange-500/20 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          

          {helpOpen && (
            <div className="mt-3 p-4 text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-inner">
              <p className="mb-2">Begin by uploading basketball footage from your computer on the <b>Upload</b> page.</p> 
              <p className="mb-2">When the HoopTuber AI analyzing is finished, all your highlight videos will appear here in the Highlight Videos gallery!</p>
              <p className="mb-2">Left click the Play button to watch the highlight video in the Highlight Videos gallery.</p>
              <p>Right click the button & open a new tab to watch the video in the HoopTuber Video Player.</p>
            </div>
          )}

          <div className="mt-6">
            {highlightsLoading && <div className="p-8 text-zinc-500 dark:text-zinc-400 text-center italic">Loading highlights…</div>}
            {highlightsError && <div className="p-8 text-red-600 dark:text-red-400 text-center">Failed to load: {highlightsError}</div>}

            {!highlightsLoading && !highlightsError && highlights.length === 0 && (
              <div className="p-12 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-center">
                <div className="text-zinc-500 dark:text-zinc-400 mb-6">No highlight videos yet.</div>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg shadow-orange-500/20 transition-all"
                >
                  <Upload className="w-5 h-5" />
                  Go to Upload
                </Link>
              </div>
            )}

            {!highlightsLoading && !highlightsError && highlights.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6"> 
                {sortedHighlights.map((h) => {  
                  const isEditing = editingId === h.jobId;                  
                  const vis = (h.visibility || "private") as FolderVisibility;

                  return (
                    <li
                      key={h.jobId}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow group"
                      draggable 
                      onDragStart={(e) => onDragStartVideo(e, h.jobId)} 
                    > 
                      {/* Title/rename*/}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {!isEditing ? (
                            <div className="font-bold text-lg text-zinc-900 dark:text-white truncate" title={h.title || h.originalFileName}>
                              {h.title || h.originalFileName || "Untitled highlight"} 
                            </div>
                          ) : (
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="Enter a title"
                            />
                          )}
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 flex items-center gap-2">
                             <span>{h.finishedAt ? new Date(h.finishedAt).toLocaleDateString() : ""}</span>
                             {h.videoDurationSec !== undefined && h.videoDurationSec > 0 && (
                                <>
                                  <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full"></span>
                                  <span>{formatDuration(h.videoDurationSec)}</span>
                                </>
                            )}
                          </div>
                          
                        </div>

                        {!isEditing ? (
                          <button
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
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
                            className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 p-1"
                            onClick={() => onRename(h.jobId, draftTitle.trim())} 
                            aria-label="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/*Quick actions row*/}
                      <div className="flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Visibility:</span>
                        <select
                          value={vis}
                          onChange={(e) => onVisibility(h.jobId, e.target.value as FolderVisibility)}
                          className="bg-transparent border-none text-zinc-800 dark:text-zinc-200 font-medium focus:ring-0 cursor-pointer text-xs p-0 pl-1"
                        >
                          <option value="public" className="text-black">Public</option>
                          <option value="unlisted" className="text-black">Unlisted</option>
                          <option value="private" className="text-black">Private</option>
                        </select>

                        <span className="ml-auto inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                          {vis === "public" && <Eye className="w-3 h-3" />}
                          {vis === "unlisted" && <LinkIcon className="w-3 h-3" />}
                          {vis === "private" && <Lock className="w-3 h-3" />}
                        </span>
                      </div>

                      {/*Open/Delete + Move + Assign to Run*/}
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/video/${encodeURIComponent(h.jobId)}`}
                          onClick={(e) => {
                            if (
                              e.button === 0 &&
                              !e.metaKey &&
                              !e.ctrlKey &&
                              !e.shiftKey &&
                              !e.altKey
                            ) {
                              e.preventDefault();

                              setOpenInlineJobIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(h.jobId)) {
                                  next.delete(h.jobId); //clicking again closes this one
                                } else {
                                  next.add(h.jobId);    //open this one, keep others open
                                }
                                return next;
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Play
                        </a>

                        <Link
                          href={`/upload/${encodeURIComponent(h.jobId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Link>

                        <button
                          onClick={() => onDelete(h.jobId)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ml-auto"                         >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                        {/*Move to Folder button (dropdown menu) */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMoveMenuFor(prev => (prev === h.jobId ? null : h.jobId))
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <FolderIcon className="w-3 h-3" />
                            Move
                            <ChevronDown className="w-3 h-3 text-zinc-400" />
                          </button>

                          {moveMenuFor === h.jobId && (
                            <div
                              ref={menuRef}
                              className="absolute z-20 right-0 mt-2 w-64 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-2"
                            >
                              {folders.length === 0 ? (
                                <div className="p-2 text-sm text-zinc-500 dark:text-zinc-400 italic text-center">
                                  No folders yet. Create one below.
                                </div>
                              ) : (
                                <ul className="max-h-60 overflow-auto">
                                  {folders.map(f => (
                                    <li key={f.folderId}>
                                      <button
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-200 transition-colors"
                                        onClick={async () => {
                                          await moveVideoToFolder(h.jobId, f.folderId);
                                          setMoveMenuFor(null);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                            <FolderIcon className="w-4 h-4 text-zinc-400" />
                                            {f.name}
                                        </div>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <div className="border-t border-zinc-100 dark:border-zinc-800 my-2"></div>

                              {/* quick create-in-place */}
                              {creatingForVideo === h.jobId ? (
                                <div className="flex gap-2 p-1">
                                  <input
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="New folder name"
                                    className="flex-1 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded px-2 py-1 text-sm outline-none focus:border-orange-500"
                                  />
                                  <button
                                    onClick={() => createFolderAndMove(h.jobId)}
                                    className="px-2 py-1 text-sm rounded bg-orange-600 text-white hover:bg-orange-700"
                                  >
                                    Create
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCreatingForVideo(h.jobId)}
                                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors text-left"
                                >
                                  + New folder…
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/*===ASSIGN TO RUN button (dropdown menu) === */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setRunMenuFor(prev => (prev === h.jobId ? null : h.jobId))
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <DribbleIcon className="w-3 h-3" />
                            Assign Run
                            <ChevronDown className="w-3 h-3 text-zinc-400" />
                          </button>

                          {runMenuFor === h.jobId && (
                          <div
                            ref={runMenuRef}
                            className="absolute z-30 right-0 mt-2 w-64 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-2"
                          >
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 px-2 uppercase tracking-wide">Your Runs</p>

                            {/*show loading / error / runs list */}
                            {loadingRuns && (
                              <p className="text-zinc-400 text-sm italic px-2 py-1">
                                Loading runs…
                              </p>
                            )}

                            {!loadingRuns && runsError && (
                              <p className="text-red-500 text-xs px-2 py-1">
                                {runsError}
                              </p>
                            )}

                            {!loadingRuns && !runsError && runs.length === 0 && (
                              <p className="text-zinc-400 text-sm italic px-2 py-1 text-center">
                                No runs yet. Create one below.
                              </p>
                            )}

                            {!loadingRuns && !runsError && runs.length > 0 && (
                              <ul className="max-h-48 overflow-auto mb-2">
                                {runs.map((run) => (
                                  <li key={run.runId}>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm flex flex-col transition-colors"
                                      onClick={() => assignVideoToRun(h.jobId, run.runId)}
                                    >
                                      <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                        {run.name}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="border-t border-zinc-100 dark:border-zinc-800 my-2" />

                            {/*Inline New Run Form*/}
                            <div className="flex flex-col gap-2 p-1">
                              <input
                                type="text"
                                placeholder="New run name"
                                value={newRunName}
                                onChange={(e) => setNewRunName(e.target.value)}
                                className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded text-sm outline-none focus:border-purple-500"
                              />
                              <button
                                type="button"
                                onClick={() => createRunAndAssign(h.jobId)}
                                className="px-3 py-1.5 rounded text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                                disabled={!newRunName.trim()}
                              >
                                Create &amp; Assign
                              </button>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>

                      {/*Video Stats/Engagement stats row */}
                      <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex w-full items-center justify-between">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide text-[10px]">Analytics</span>

                          <div className="flex items-center gap-4">
                            {/*❤️ Like button */}
                            <button
                              onClick={() => handleLikeClick(h.jobId)}
                              className={cn(
                                "inline-flex items-center gap-1.5 transition-colors",
                                h.likedLocally
                                  ? "text-red-500 font-medium"
                                  : "text-zinc-400 hover:text-red-500"
                              )}
                            >
                              {h.likedLocally ? "❤️" : "🤍"} <span>{h.likesCount ?? 0}</span>
                            </button>


                            {/* Comment count */}
                            <span className="flex items-center gap-1.5">💬 {commentCounts[h.jobId] ?? 0}</span>

                            {/* View count */}
                            <span className="flex items-center gap-1.5">👁️ {h.viewsCount ?? 0}</span>

                          </div>
                        </div>
                      </div>

                      {/*Inline video player when this card is expanded on Dashboard page */}
                      {openInlineJobIds.has(h.jobId) && h.signedUrl && (
                        <div className="mt-0">
                          <div className="w-full bg-black rounded-lg overflow-hidden ring-1 ring-zinc-900/10 shadow-lg">
                            <video
                              className="w-full aspect-video"
                              src={h.signedUrl}
                              controls
                              onTimeUpdate={(ev) => handleInlineTimeUpdate(h, ev)}
                              onPause={(ev) => handleInlineInterrupt(h, ev)}
                              onSeeking={(ev) => handleInlineInterrupt(h, ev)}
                            />
                          </div>
                        </div>
                      )}

                      {/*Assigned to Run(s) summary with expand/collapse */}
                      {(() => {
                        const assignedRuns = runsByHighlightId.get(h.jobId) || [];

                        if (assignedRuns.length === 0) {
                          return null;
                        }

                        const isOpen = openRunsMetaIds.has(h.jobId);

                        return (
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-medium"
                              onClick={() => {
                                setOpenRunsMetaIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(h.jobId)) {
                                    next.delete(h.jobId);
                                  } else {
                                    next.add(h.jobId);
                                  }
                                  return next;
                                });
                              }}
                            >
                              {isOpen ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              <span>
                                Assigned to {assignedRuns.length}{" "}
                                {assignedRuns.length === 1 ? "run" : "runs"}
                              </span>
                            </button>

                            {isOpen && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {assignedRuns.map((run) => (
                                  <span
                                    key={run.runId}
                                    className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 px-2 py-1"
                                  >
                                    <DribbleIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                    <Link
                                      href={`/my-runs?runId=${encodeURIComponent(run.runId)}`}
                                      className="font-medium text-purple-700 dark:text-purple-300 hover:underline"
                                    >
                                      {run.name}
                                    </Link>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
        
        {/*===================== Highlight Folders ===================== */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                 <FolderIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
               </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Highlight Folders</h2>
            </div>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium transition-colors"
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
            {foldersLoading && <div className="p-8 text-zinc-500 dark:text-zinc-400 text-center italic">Loading folders…</div>}
            {folderError && <div className="p-8 text-red-600 dark:text-red-400 text-center">Failed to load folders: {folderError}</div>}

            {!foldersLoading && !folderError && folders.length === 0 && (
              <div className="p-12 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-center text-zinc-500 dark:text-zinc-400">
                No folders yet. Create one and drag videos into it, or use “Move to Folder”.
              </div>
            )}

            {!foldersLoading && !folderError && folders.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {folders.map((f) => {
                  const isEditing = editingFolderId === f.folderId;
                  const isOpen = openFolderIds.has(f.folderId);  

                  const videosInFolder = (f.videoIds || [])
                    .map(id => highlights.find(h => h.jobId === id))
                    .filter(Boolean) as HighlightItem[];

                  return (
                    <li
                      key={f.folderId}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
                      onDragOver={onDragOverFolder}                         
                      onDrop={(e) => onDropOnFolder(e, f.folderId)}         
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {!isEditing ? (
                            <div className="font-semibold text-lg text-zinc-900 dark:text-white break-words flex items-center gap-2">
                              <FolderIcon className="w-5 h-5 text-orange-500 fill-orange-500/10" />
                              {f.name}
                              <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full ml-auto">
                                {videosInFolder.length}
                              </span>
                            </div>
                          ) : (
                            <input
                              value={draftFolderName}
                              onChange={(e) => setDraftFolderName(e.target.value)}
                              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="Folder name"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <>
                              <button
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
                                onClick={() => {
                                  setEditingFolderId(f.folderId);
                                  setDraftFolderName(f.name || "");
                                }}
                                aria-label="Rename folder"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
                                onClick={() => toggleFolderOpen(f.folderId)}
                                aria-label="Toggle"
                              >
                                {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 p-1"
                              onClick={async () => {
                                await apiPatchFolder(f.folderId, { name: draftFolderName.trim() });
                                setEditingFolderId(null);
                                setDraftFolderName("");
                                await loadFolders(); 
                              }}
                              aria-label="Save folder name"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/*folder actions */}
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 text-xs font-medium transition-colors ml-auto"
                          onClick={async () => {
                            if (!confirm("Delete this folder? This cannot be undone (Videos will not be deleted).")) return;
                            await apiDeleteFolder(f.folderId);
                            await loadFolders();
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete Folder
                        </button>
                      </div>

                      {/*folder contents */}
                      {isOpen && (
                        <div className="mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          {videosInFolder.length === 0 ? (
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-4">
                              Drop a video here or use “Move” to move to any created folder.
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {videosInFolder.map((v) => (
                                <li
                                  key={v.jobId}
                                  className="text-sm text-zinc-800 dark:text-zinc-200 flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800"
                                  draggable
                                  onDragStart={(e) => onDragStartVideo(e, v.jobId)}
                                >
                                  {/*Top row: title + actions */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center flex-none">
                                        <Play className="w-3 h-3 text-zinc-600 dark:text-zinc-300 ml-0.5" />
                                      </div>
                                      <span className="truncate font-medium">
                                        {v.title || v.originalFileName || v.jobId}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`/video/${encodeURIComponent(v.jobId)}`}
                                        onClick={(e) => {
                                          if (
                                            e.button === 0 &&
                                            !e.metaKey &&
                                            !e.ctrlKey &&
                                            !e.shiftKey &&
                                            !e.altKey
                                          ) {
                                            e.preventDefault();
                                            setFolderPlayingJobId((prev) =>
                                              prev === v.jobId ? null : v.jobId
                                            );
                                          }
                                        }}
                                        className="px-2 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                      >
                                        Play
                                      </a>

                                      <button
                                        onClick={() => removeVideoFromFolder(f.folderId, v.jobId)}
                                        className="px-2 py-1 text-xs rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        title="Remove from folder"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>

                                  {/*Inline video player inside the folder card */}
                                  {folderPlayingJobId === v.jobId && (
                                    <div className="mt-2 w-full">
                                      <div className="w-full overflow-hidden rounded-md bg-black shadow-md">
                                        <video
                                          className="w-full h-auto"
                                          controls
                                          src={getHighlightPlaybackUrl(v.jobId) || undefined}
                                        >
                                          Sorry, your browser doesn&apos;t support embedded videos.
                                        </video>
                                      </div>
                                    </div>
                                  )}
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
      </main>
    </div>
    </div>
  );
}