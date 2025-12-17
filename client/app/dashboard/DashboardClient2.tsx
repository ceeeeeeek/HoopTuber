//client/app/dashboard/DashboardClient.tsx — 12-07-25 Sunday Update 1pm
//now highlights-only and pointed at FastAPI

"use client";

import {useEffect, useMemo, useState, useCallback, useRef} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; //to read ?refresh=...
import { useSession } from "next-auth/react";
import {
  Play, Upload, UploadIcon, BarChart2, BarChart3, Clock3, Users,
  Edit3, Save, Trash2, Eye, Lock, Link as LinkIcon, ChevronDown, ChevronUp, Filter,
  Folder as FolderIcon, ChevronRight, Plus, Pencil, MoreHorizontal, Edit
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

//11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support
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

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

//12-07-25 Sunday 4pm Update - Prevent double-counting views on highlight videos with localStorage
//Shared front-end hlpers (views + likes in localStorage) between DashboardClient + [jobId]/page.tsx
//Gives per-highlight view (if we've already counted a view for this highlight on this browser) + like (if user liked this highlight on this browser) state
//+
//Gives Per-highlight like toggle that persists across tabs and reloads (per browser)
const VIEW_STORAGE_PREFIX = "hooptuber:viewed:";
const LIKES_STORAGE_PREFIX = "hooptuber_like_v1:"; //old version in DashboardClient.tsx was const LIKES_STORAGE_PREFIX = "hooptuber:liked:";
//const LIKES_STORAGE_PREFIX = "hooptuber_like_v1:"; on standalone video player page matches const LIKES_STORAGE_PREFIX on dashboard page (DashboardClient.tsx) 

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

// function isLikedLocally(jobId: string): boolean {
//   if (typeof window === "undefined") return false;
//   return window.localStorage.getItem(likeStorageKey(jobId)) === "1";
// }

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

//11/30/25 Update: Abort-related “NetworkError when attempting to fetch resource” won’t be treated as real failures.
//Your UI states (highlightsError, folderError, etc.) will only show for real failures, not cancelled requests.
//Combined with the polling you already wired up, /dashboard will feel much less “glitchy” and should stay in sync as soon as the worker writes the highlight docs.
//helper so aborted fetches don't show as "real" errors
function isAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === "AbortError"
  ) || (err as any)?.name === "AbortError";
}

//11-23-25 Sunday 4pm - Connected to my runs page
//=== RUNS API HELPERS (START - used only for the dashboard "My Runs/Team Groups" stat) === //
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

//11-23-25 Sunday 5pm - For Assign-to-Run button + dropdown menu
//list runs where the user is a member (same as MyRunsClient)
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

//create a run (owner + member is the current user)
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

//assign highlight to an existing run
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
//=====================RUNS API HELPERS (END - Assign-to-Run button + dropdown menu API HELPERS (END) ======================
//11-23-25 Sunday 5pm Tuesday 10am - For Assign-to-Run button + dropdown menu

//11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support
//===================== FOLDERS API HELPERS (START)======================
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
//===================== FOLDERS API HELPERS (END) ======================
//11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support

export default function DashboardClient() {
  //auth/session
  const { data: session, status } = useSession(); //include status; also grab `status` so we know when the session is ready
  //const userName = session?.user?.name || ""; //not used but if you plan to show a greeting later (“Welcome back, Chris”), we can re-add it then
  const userEmail = session?.user?.email || "";
  //Backend is "ready" for this user once they're authenticated and we have an email
  const backendReady = status === "authenticated" && !!userEmail;
  //read the `refresh` query param from /dashboard?refresh=<jobId>
  const searchParams = useSearchParams();             
  const refreshKey = searchParams?.get("refresh") ?? null;

  if (typeof window !== "undefined") {
    console.log("Dashboard session", session);
    console.log("Dashboard userEmail", userEmail);
  }

  //useState calls begin here
  //highlights state (but now typed for FastAPI items)
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);

  //12-06-25 Saturday 6:45pm - Track a *set* of open inline players instead of one at a time -
  //therefore multiple highlight cards/highlight videos in the Highlight Video Gallery can have multiple inline video players open
  const [openInlineJobIds, setOpenInlineJobIds] = useState<Set<string>>(new Set());

  //12-07-25 Sunday 12:30pm - View tracking with *continuous* watch time per highlight card
  type ViewProgress = {
    thresholdSeconds: number;     //min(30s, half of video)
    hasCounted: boolean;          //already counted 1 view this page load
    continuousSeconds: number;    //uninterrupted watch time since last reset
    lastTime: number | null;      //last video.currentTime we saw
  };
  
  //per-session progress so we only count 1 “view” per card per reload
  const viewProgressRef = useRef<Record<string, ViewProgress>>({});
  //12-06-25 Saturday 8pm - View view progress tracking per highlight video card - to track view count for engagement stats


  //rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  //little help accordion
  const [helpOpen, setHelpOpen] = useState(false);
  //useState calls end here

  const [folderPlayingJobId, setFolderPlayingJobId] = useState<string | null>(null);

  //12-06-25 Saturday 5pm - added for Engagement stats row in DashboardClient.tsx
  //per-highlight comment counts, keyed by jobId
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  //11-08-25 Saturday 2:18pm Update - Added Filter Button to Dashboard + New sorting/filtering state and UI hooks for dashboard page
  //===Filter state===
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

  //11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support
  //folders state
  const [folders, setFolders] = useState<HighlightFolder[]>([]);
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

  //separate ref for the Assign-to-Run dropdown
  const runMenuRef = useRef<HTMLDivElement | null>(null); //ref for "Assign-to-Run" dropdown menu -   //11-18-25 Tuesday 10am - For Assign-to-Run button + dropdown menu

  //runs for the Assign Run dropdown (runs where the user is a member) - 11-23-25 Sunday 5pm
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null)
  const [runCount, setRunCount] = useState<number>(0); //My Runs / Team Groups stat count 
  //for creating a new run inside dropdown
  const [newRunName, setNewRunName] = useState("");
  //which video card has the "Assign to Run" dropdown open
  const [runMenuFor, setRunMenuFor] = useState<string | null>(null);
  //Which highlight cards have their "Assigned runs" section expanded 
  const [openRunsMetaIds, setOpenRunsMetaIds] = useState<Set<string>>(new Set());   //11-18-25 Tuesday 10am - For Assign-to-Run button + dropdown menu

  //=== Dropdown outside-click / escape close ===
  const menuRef = useRef<HTMLDivElement | null>(null); //ref for folder Move/"Move to Folder" dropdown menu
  //needed to have a separate ref (separate from the ref for the Assign-to-Run menu) like this one for folder Move/"Move to Folder" dropdown menu - 11-13-25 Thursday 2pm - For Move folder support

  //useEffect uses both dropdowns' refs (const ref for Move menu and const runMenuRef for Assign-to-Run menu) to close on outside click / escape
  //one useEffect, two refs, closes both menus - Move folder menu + Assign-to-Run menu
  useEffect(() => {
    //Escape should close BOTH menus
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoveMenuFor(null);
        setRunMenuFor(null);
      }
    };

    //outside click should close whichever dropdown was open
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
  //11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support

  //12-01-25 Monday 3pm - Helper to get playback URL from highlight item
  const getHighlightPlaybackUrl = (jobId: string): string | null => {
    const h = highlights.find((x) => x.jobId === jobId);
    if (!h) return null;
  
    //Prefer whatever field you’re already using for playback
    return (
      (h as any).signedUrl ||
      (h as any).outputSignedUrl ||
      (h as any).outputGcsUriSigned ||
      (h as any).outputGcsUri ||
      null
    );
  };
  

  //loader to load folders for this user
  //11-21-25 Friday 1am - Fix to Highlight Videos and Highlight Folders error not populating correctly
  const loadFolders = useCallback(async () => {
    if (!userEmail) return;

    try {
      console.log("loadFolders() called with userEmail =", userEmail);
      setFoldersLoading(true);
      setFolderError(null);

      const j = await apiListFolders(userEmail);
      console.log("folders raw JSON", j);

      //FastAPI returns { items: [...] } here too
      const foldersArr = Array.isArray(j?.items)
        ? (j.items as HighlightFolder[])
        : [];

      setFolders(foldersArr);
    } catch (err: any) { //renamed e for error to err
      //ignore aborted fetches quietly
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


  //=====Fetch from FastAPI instead of /api/highlightVideos =====
  //11-21-25 Friday 1am - Fix to Highlight Videos and Highlight Folders error not populating correctly
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

      //Your FastAPI returns { items: [...] }
      //Normalise all highlight items and make sure likes/views are numbers
      const rawItems = Array.isArray(json?.items) ? json.items : [];

      const mapped: HighlightItem[] = rawItems.map((raw: any) => {
        //trust the backend's "am I liked by this user?" flag
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
          videoDurationSec: raw.videoDurationSec ?? 0, //from Firestore, default to 0 if missing
          description: raw.description,

          //engagement fields - likes and views pulled from backend
          likesCount: raw.likesCount ?? 0,
          viewsCount: raw.viewsCount ?? 0,

          //"liked" tint comes from *either* server or hydrate from localStorage
          likedLocally: likedFromServer || isLikedLocally(raw.jobId),

          //keep any signed URL your backend returned
          signedUrl: raw.signedUrl,
        };
      });



      setHighlights(mapped);
      //fetch per-highlight comment counts from /video-comments
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
                //avoid killing the whole dashboard if one highlight’s comments fail
                console.warn("Failed to load comment count for", h.jobId, err);
              }
            })
          );

          setCommentCounts(counts);
        } catch (err) {
          console.warn("Error loading comment counts", err);
        }
    } catch (err: any) { //renamed e for error to err
      //ignore aborted fetches quietly
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

//Derive a map of highlightIds → runs[] and render it.
//Map highlightId -> array of runs that contain it
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


//-----------------------useEffect() Hooks Here (Start)-----------------------
  //useEffect A - this useEffect only handles highlights + folders for the dropdown menu
  //11-30-25 Sunday 1:30pm Update
  //make dashboard loading event-driven instead of polling every 5s
  useEffect(() => {
    if (!backendReady || !userEmail) return; 

    let cancelled = false; 

    const tick = async () => { 
      if (cancelled) return;   
      try {
        await load();          //loads highlights
        await loadFolders();   //loads folders
      } catch (err) {
        //still ignore aborts, but no polling-interval logs
        if (isAbortError(err)) return;
        console.error("Dashboard load error", err); //message text
      }
    };

    //single immediate load whenever deps change
    tick();

    return () => {
      cancelled = true; 
    };
  }, [backendReady, userEmail, load, loadFolders, refreshKey]); //depencdencies/deps array, incl. refreshKey
  //11-30-25 Sunday 1:30pm Update - Fix to the “Loading highlights…” under Highlight Videos gallery in dashboard page: 
  //added refreshKey to useEffect A's dependancy array so that when the worker finishes and your upload page hits the Complete state, you now have a unique jobId.
  //Clicking Show in Dashboard sends the user to /dashboard?refresh=<jobId>.
  //On the dashboard:
  //useSearchParams() reads that refresh value into refreshKey.
  //The polling useEffect depends on refreshKey.
  //If you arrive from /upload with a different refresh value than last time, React re-runs this effect:
  //It calls tick() immediately (no wait).
  //It starts a fresh 5-second polling interval.
  //So every time a new job finishes and you go “Show in Dashboard”, the dashboard does an instant re-fetch of highlights + folders, instead of waiting until the next poll tick or getting stuck showing stale “Loading highlights…”.
  //Ultimately, this should make /dashboard feel much more instantaneous and in-sync with your worker as soon as the highlight docs are written
  
  //useEffect B - useEffect() to load runs list for Assign Run dropdown - 11-23-25 Sunday 5pm
  //this useEffect only handles loading runs for the Assign-to-Run dropdown menu
  //Load runs for the "Assign Run" dropdown once backend is ready
  //useEffect B - useEffect() to load runs list for Assign Run dropdown - 11-23-25 Sunday 5pm 
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
      } catch (err: any) { //renamed e for error to err
        //ignore aborted fetches quietly
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

  
//useEffect C - useEffect() loads or sets runCount for the stat card - My Runs / Team Groups count for this user
//Load My Runs / Team Groups count once backend is ready
useEffect(() => {
  if (!backendReady) return; 

  let cancelled = false;

  (async () => {
    try {
      const count = await apiGetRunCount(userEmail);
      if (!cancelled) {
        setRunCount(count);
      }
    } catch (err: any) { //renamed to err
      //ignore aborted fetches quietly
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
}, [backendReady, userEmail]); //depend on backendReady
//-----------------------useEffect() Hooks Here (End)-----------------------

  //11-21-25 Friday 1am - Fix to Highlight Videos and Highlight Folders error not populating correctly
  //derive stats from FastAPI items
  const stats = useMemo(() => {
    const count = highlights.length;
    const totalSeconds = highlights.reduce((acc, h) => acc + (h.videoDurationSec || 0), 0);
    const label = totalSeconds > 0 ? formatDuration(totalSeconds) : "0s";

    return {
      videosUploaded: count,
      highlightsCreated: count,
      totalFootageSeconds: totalSeconds,     //exact numeric seconds if needed
      totalFootageLabel: label,              //pretty display string
      //teamGroups: 3,                         //placeholder
      //teamGroups: folders.length, //teamGroups no longer in use (will be using runCount instead)- 11-19-25 Wednesday Update 4pm - number of runs / groups for this user
    };
  }, [highlights]);
  //11-13-25 Thursday 10am - For 'Total Footage' stat

  //11-08-25 Saturday 2:18pm Update
  //Derived, sorted view of highlights based on applied filter settings  
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
      body: JSON.stringify({ ownerEmail: userEmail, ...body }),  
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`PATCH /highlights/${jobId} ${r.status}: ${t}`);
    }
    return r.json().catch(() => ({}));
  };

  //11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support
  //====================== FOLDERS FUNCTIONS/ACTIONS/HELPERS (START) ======================
  //quick action to move one video into a folder (append if not present)
  const moveVideoToFolder = async (jobId: string, folderId: string) => {
    const folder = folders.find(f => f.folderId === folderId);
    if (!folder) return;

    const nextIds = Array.from(new Set([...(folder.videoIds || []), jobId]));
    await apiPatchFolder(folderId, { videoIds: nextIds });

    //refresh local state
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

      //refresh local state
      setFolders(prev =>
        prev.map(f => (f.folderId === folderId ? { ...f, videoIds: nextIds } : f))
      );
    },
    [folders, setFolders]
  );

  //Dropdown item: create a new folder in-line for this specific video
  const createFolderAndMove = useCallback(async (jobId: string) => {
    if (!newFolderName.trim()) return;
    const res = await apiCreateFolder(userEmail, newFolderName.trim());
    setNewFolderName("");
    setCreatingForVideo(null);
    await loadFolders();
    await moveVideoToFolder(jobId, res.folderId);
    setMoveMenuFor(null);
  }, [userEmail, newFolderName, loadFolders, moveVideoToFolder]);

  //Drag polish (visual hints only) - to drag videos into folders (11/30/25 Sunday - WILL UPDATE MORE LATER)
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
  //====================== FOLDERS FUNCTIONS/ACTIONS/HELPERS (END) ======================
  //11-13-25 Thursday 2pm - For Move/"Move to Folder" folder support

  //11-18-25 Tuesday 10am - For Assign-to-Run button + dropdown menu
  //=====================RUNS - Assign-to-Run button + dropdown menu FUNCTIONS/ACTIONS/HELPERS (START) ======================
  //assign a video to a specific run
  const assignVideoToRun = async (jobId: string, runId: string) => {
      await apiAssignToRun(runId, jobId);

      setRunMenuFor(null);
  
      //update local runs state so "Assigned to…" chips update instantly
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

  //create a new run inline from the dropdown for this video
  const createRunAndAssign = async (jobId: string) => {
    if (!newRunName.trim() || !userEmail) return;
    const newRun = await apiCreateRun(userEmail, newRunName.trim());
    setNewRunName("");
  
    //First, add the new run locally with this highlightId
    setRuns(prev => {
      const updatedRun: RunSummary = {
        ...newRun,
        highlightIds: Array.from(new Set([...(newRun.highlightIds || []), jobId])),
      };
      const next = [updatedRun, ...prev];
      return next;
    });
  
    //Then actually assign in backend (idempotent because we already added in local state above)
    await apiAssignToRun(newRun.runId, jobId);
  
    setRunMenuFor(null);
  };

  
  //=====================RUNS - Assign-to-Run button + dropdown menu FUNCTIONS/ACTIONS (END) ======================
  //11-18-25 Tuesday 10am - For Assign-to-Run button + dropdown menu

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


    const onVisibility = async (jobId: string, visibility: FolderVisibility) => {
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

  //12-06-25 Saturday 8pm - View view progress tracking likes per highlight video card - to track like counts for engagement stats
  async function handleLikeClick(jobId: string) {
    //Current local state (per browser)
    const alreadyLiked = isLikedLocally(jobId);

    //Determine what we want to do
    const nextLiked = !alreadyLiked;
    const delta = nextLiked ? 1 : -1;

    //update localStorage
    setLikedLocally(jobId, nextLiked);

    //setHighlights updates UI
    setHighlights((prev) =>
      prev.map((card) => {
        if (card.jobId !== jobId) return card;

        const newCount = Math.max(0, (card.likesCount ?? 0) + delta);

        return {
          ...card,
          likesCount: newCount,
          likedLocally: nextLiked, //keep in sync
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
        //snap to authoritative server count
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

    //revert on failure
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
  
  //12-07-25 Sunday 12:30pm - View tracking with *continuous* watch time per highlight card
  //Reset the continuous-watch timer for this inline player (used on pause/seek)
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

  //12-06-25 Saturday 8pm - View view progress tracking per highlight video card - to track view counts for engagement stats
  //"1 view" : view counter will tick up once per card when the viewer crosses the 30s / half-length of the video threshold 
  //12-07-25 Sunday 12:30pm - Count a view only after continuous watch time
  const handleInlineTimeUpdate = async (
    h: HighlightItem,
    ev: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const video = ev.currentTarget;
    const duration = h.durationSeconds ?? video.duration;

    if (!duration || !Number.isFinite(duration)) return;

    //If we've already counted a view for this highlight in this browser, bail out.
    if (hasStoredView(h.jobId)) {
      const vp = viewProgressRef.current[h.jobId];
      if (vp) vp.hasCounted = true;
      return;
    }

    //still use min(30s, half of the video)
    const threshold = Math.min(30, duration / 2);

    //ensure we have progress state for this card
    let vp = viewProgressRef.current[h.jobId];
    if (!vp) {
      vp = viewProgressRef.current[h.jobId] = {
        thresholdSeconds: threshold,
        hasCounted: false,
        continuousSeconds: 0,
        lastTime: video.currentTime,
      };
    } else if (!vp.hasCounted && vp.thresholdSeconds !== threshold) {
      //keep threshold in sync if duration changes
      vp.thresholdSeconds = threshold;
    }

    if (vp.hasCounted) return;

    const current = video.currentTime;

    //first tick: just seed lastTime
    if (vp.lastTime == null) {
      vp.lastTime = current;
      return;
    }

    const delta = current - vp.lastTime;

    //If time jumped backwards or too far forwards, treat as a seek/interrupt.
    //This prevents "skip straight to the middle" from counting as watch time.
    if (delta <= 0 || delta > 1.5) {
      vp.continuousSeconds = 0;
      vp.lastTime = current;
      return;
    }

    //normal forward playback – accumulate continuous watch time
    vp.continuousSeconds += delta;
    vp.lastTime = current;

    if (vp.continuousSeconds < vp.thresholdSeconds) return;

    //continuous-watch requirement. Count a view once per card.
    vp.hasCounted = true;
    markStoredView(h.jobId); //<-- cross-tab / cross-reload guard

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

      //bump the viewsCount in local state so the UI updates immediately
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

        {/* Stats */}
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
            <div className="text-3xl font-bold">
    {         stats.totalFootageLabel} {/*uses exact hh/mm/ss label; 11-13-25 Thursday 10am - For 'Total Footage' stat */} 
            </div>
            <div className="text-sm text-gray-500">Total Footage</div>
            <Clock3 className="w-5 h-5 text-orange-600" />
          </div>
            {/* Card 4 – My Runs / Team Groups*/}
            <Link
              href="/my-runs"
              className="p-4 bg-white rounded-lg border hover:bg-purple-50/40 hover:border-purple-300 cursor-pointer transition"
            >
              <div className="text-3xl font-bold">
                {runCount === null ? "—" : runCount}
              </div>
              <div className="text-sm text-gray-500">My Runs/Team Groups</div>
              <div className="mt-0 flex justify-start">
                <DribbleIcon className="w-7 h-7 text-purple-600 -ml-2" />
              </div>
            </Link>
          </div>

        {/*Highlights-only gallery(wired to FastAPI data)*/}
        <section className="mt-10">
          {/*11-08-25 Saturday 2:18pm Update */}
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
              How The Dashboard Gallery Works
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
                      //Clear: remove sorting entirely
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
                        //Cancel: discard pending changes
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
                        //Apply: commit pending to applied
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
              <pre>Begin by uploading basketball footage from your computer on the <b>Upload</b> page.</pre> 
              When the HoopTuber AI analyzing is finished, all your highlight videos will appear here in the Highlight Videos gallery! 
           {/*<pre>Use the dropdown visibility menu to set the highlight video as <b>Public</b>, <b>Unlisted</b>, or <b>Private</b>.</pre>
              <pre>Use the Assign Run button to assign a highlight video to a run.</pre>
              <pre>Use the Move button to organize your highlight videos and place them in highlight folders.</pre> */}
              <pre>Left click the Play button to watch the highlight video in the Highlight Videos gallery.</pre>
              <pre>Right click the button & open a new tab to watch the video in the HoopTuber Video Player.</pre>
            </div>
          )}

          <div className="mt-6">
            {highlightsLoading && <div className="p-8 text-gray-500">Loading highlights…</div>}
            {highlightsError && <div className="p-8 text-red-600">Failed to load: {highlightsError}</div>}

            {!highlightsLoading && !highlightsError && highlights.length === 0 && (
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

            {!highlightsLoading && !highlightsError && highlights.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4"> {/*for highlight video boxes */}
              {/* <ul className="flex flex-wrap gap-4">   */}
                {sortedHighlights.map((h) => {  {/*11-08-25 Sunday 2:18pm Update - Use sortedHighlights */}
                  const isEditing = editingId === h.jobId;                 //use jobId
                  const vis = (h.visibility || "private") as FolderVisibility;


                  return (
                    <li
                      key={h.jobId}
                      className="bg-white border rounded-lg p-4 flex flex-col gap-3"
                      //className="bg-white border rounded-lg p-4 flex flex-col gap-3 w-full md:w-1/2 2xl:w-1/3"
                      //className="bg-white border rounded-lg p-4 flex flex-col gap-3 w-full sm:w-1/2 xl:w-1/3"
                      draggable //allow drag functionality to drag item
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
                          {h.videoDurationSec !== undefined && h.videoDurationSec > 0 && (
                            <div className="text-xs text-gray-600 mt-1 font-medium">
                              Duration: {formatDuration(h.videoDurationSec)}
                            </div>
                          )}
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
                          onChange={(e) => onVisibility(h.jobId, e.target.value as FolderVisibility)}
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

                      {/*Open/Delete Buttons*/}
                      {/*Open/Delete + Move + Assign to Run*/}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Open button: left-click expands inline player, right-click can open /video/[jobId]
                        - Even though we preventDefault on onClick, the browser context menu still uses the href.
                        So "Open link in new tab" / middle-click will go to /video/[jobId], but a normal left click triggers the inline toggle. */}
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

                              //12-06-25 Saturday 6:45pm - In Dashboard, allow multiple inline players open at once when you press 'Play' button on multiple highlight videos
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
                          className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100"
                        >
                          <Play className="w-4 h-4" />
                          Play
                        </a>

                        <Link
                          href={`/upload/${encodeURIComponent(h.jobId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Link>

                        <button
                          onClick={() => onDelete(h.jobId)}
                          //className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>

                        {/*Move to Folder button (dropdown menu) — 11-13-25 Thursday Update 2pm */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMoveMenuFor(prev => (prev === h.jobId ? null : h.jobId))
                            }
                            //className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <FolderIcon className="w-3 h-3" />
                            Move
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {moveMenuFor === h.jobId && (
                            <div
                              ref={menuRef}
                              className="absolute z-20 right-0 mt-2 w-64 rounded-md border bg-white shadow-lg p-2"
                            >
                              {folders.length === 0 ? (
                                <div className="p-2 text-sm text-gray-600">
                                  No folders yet. Create one below.
                                </div>
                              ) : (
                                <ul className="max-h-60 overflow-auto">
                                  {folders.map(f => (
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
                                    onChange={e => setNewFolderName(e.target.value)}
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
                                    onClick={() => createFolderAndMove(h.jobId)}
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

                        {/*===ASSIGN TO RUN button (dropdown menu) - 11-18-25 Tuesday Update 10am === */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setRunMenuFor(prev => (prev === h.jobId ? null : h.jobId))
                            }
                            //className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 text-gray-800 hover:bg-gray-100"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <DribbleIcon className="w-3 h-3" />
                            Assign Run
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {runMenuFor === h.jobId && (
                          <div
                            ref={runMenuRef}
                            className="absolute z-30 right-0 mt-2 w-64 rounded-md border bg-white shadow-lg p-2"
                          >
                            <p className="text-xs text-gray-500 mb-1">Your Runs</p>

                            {/*show loading / error / runs list */}
                            {loadingRuns && (
                              <p className="text-gray-400 text-sm italic px-2 py-1">
                                Loading runs…
                              </p>
                            )}

                            {!loadingRuns && runsError && (
                              <p className="text-red-500 text-xs px-2 py-1">
                                {runsError}
                              </p>
                            )}

                            {!loadingRuns && !runsError && runs.length === 0 && (
                              <p className="text-gray-400 text-sm italic px-2 py-1">
                                No runs yet. Create one below.
                              </p>
                            )}

                            {!loadingRuns && !runsError && runs.length > 0 && (
                              <ul className="max-h-48 overflow-auto mb-2">
                                {runs.map((run) => (
                                  <li key={run.runId}>
                                    <button
                                      type="button"
                                      className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 text-sm flex flex-col"
                                      onClick={() => assignVideoToRun(h.jobId, run.runId)}
                                    >
                                      <span className="font-medium text-gray-900">
                                        {run.name}
                                      </span>
                                      <span className="text-[11px] text-gray-500">
                                        Owned by {run.ownerEmail}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="border-t my-2" />

                            {/*Inline New Run Form*/}
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                placeholder="New run name"
                                value={newRunName}
                                onChange={(e) => setNewRunName(e.target.value)}
                                className="w-full px-2 py-1 border rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => createRunAndAssign(h.jobId)}
                                className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                disabled={!newRunName.trim()}
                              >
                                Create &amp; Assign
                              </button>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>

                      {/*12-06-25 Saturday 5pm - added for Engagement stats row in DashboardClient.tsx */}
                      {/*Video Stats/Engagement stats row */}
                      <div className="mt-2 text-xs text-gray-600">
                        <div className="flex w-full items-center justify-between">
                          <span className="font-medium">🏀Video Stats</span>

                          <div className="flex items-center gap-3">
                            {/*❤️ Like button */}
                            {/* <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:text-gray-900"
                              onClick={() => handleLikeClick(h.jobId)}
                            >
                              Likes <span role="img" aria-label="fire">❤️</span>{" "}
                              {h.likesCount ?? 0}
                            </button> */}
                            <button
                              onClick={() => handleLikeClick(h.jobId)}
                              className={cn(
                                //"inline-flex items-center gap-1 text-sm",
                                "inline-flex items-center gap-1 hover:text-gray-900",
                                h.likedLocally
                                  ? "text-pink-600"
                                  : "text-gray-500 hover:text-pink-500"
                              )}
                            >
                              {/* your heart-in-basketball icon here */}
                              Likes<span>{h.likesCount ?? 0}❤️</span>
                            </button>


                            {/* Comment count (from /video-comments) */}
                            <span>Comments 💬 {commentCounts[h.jobId] ?? 0}</span>

                            {/* View count (from /video-engagement/view) */}
                            <span>Views 👁️‍🗨️ {h.viewsCount ?? 0}</span>

                          </div>
                        </div>
                      </div>

                      {/*12-01-25 10am Update - inline video player when this card is expanded on Dashboard page */}
                      {/*12-06-25 Saturday 6:45pm - Inline video player can be open for multiple jobIds therefore multiple inline video players*/}
                      {openInlineJobIds.has(h.jobId) && h.signedUrl && (
                        <div className="mt-3">
                          <div className="w-full bg-black rounded-lg overflow-hidden">
                            <video
                              //basic YouTube-style layout: 16:9, black letterbox, native controls
                              className="w-full aspect-video"
                              src={h.signedUrl}
                              controls
                              //optional: start playing immediately when expanded
                              //autoPlay
                              //we’ll add onTimeUpdate for view counts - "1 view" : view counter will tick up once per card when the viewer crosses the 30s / half-length of the video threshold 
                              onTimeUpdate={(ev) => handleInlineTimeUpdate(h, ev)}
                              //Any pause or seeking resets the continuous-watch timer
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
                          return (
                            <div className="mt-1 text-xs text-gray-500">
                              Assigned to 0 runs
                            </div>
                          );
                        }

                        const isOpen = openRunsMetaIds.has(h.jobId);

                        return (
                          <div className="mt-2 text-xs text-gray-700">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-purple-700 hover:underline"
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
                              <div className="mt-1">
                                {assignedRuns.map((run) => (
                                  <span
                                    key={run.runId}
                                    className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 mr-1 mb-1"
                                  >
                                    <DribbleIcon className="w-3 h-3 text-purple-600" />
                                    <Link
                                      href={`/my-runs?runId=${encodeURIComponent(run.runId)}`}
                                      className="font-medium text-purple-700 hover:underline"
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
        {/*11-13-25 Thursday Update 2pm*/}
        {/*===================== Highlight Folders ===================== */}
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
                  const isOpen = openFolderIds.has(f.folderId);  

                  //resolve video objects for this folder
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
                                await loadFolders(); //refresh names
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

                      {/*folder contents */}
                      {/*open && ( */}
                      {isOpen && (
                        <div className="mt-2">
                          {videosInFolder.length === 0 ? (
                            <div className="text-sm text-gray-500">
                              Drop a video here or use “Move” to move to any created folder.
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {videosInFolder.map((v) => (
                                <li
                                  key={v.jobId}
                                  className="text-sm text-gray-800 flex flex-col gap-1"
                                  draggable
                                  onDragStart={(e) => onDragStartVideo(e, v.jobId)}
                                >
                                  {/*Top row: title + actions */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Play className="w-3 h-3 flex-none" />
                                      <span className="truncate">
                                        {v.title || v.originalFileName || v.jobId}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/*Play link:
                                          - plain left click => inline player
                                          - right-click / cmd+click / ctrl+click => go to /video/[jobId]
                                      */}
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
                                        className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                                      >
                                        Play
                                      </a>

                                      {/*Remove ONLY from this folder */}
                                      <button
                                        onClick={() => removeVideoFromFolder(f.folderId, v.jobId)}
                                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
                                        title="Remove from folder"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>

                                  {/*Inline video player inside the folder card */}
                                  {folderPlayingJobId === v.jobId && (
                                    <div className="mt-2 w-full">
                                      <div className="w-full overflow-hidden rounded-md bg-black">
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
        {/*=================== END Highlight Folders=================== */}
        {/*11-13-25 Thursday Update 2pm*/}
      </main>
    </div>
  );
}