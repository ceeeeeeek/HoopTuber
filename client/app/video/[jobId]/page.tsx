//client/app/video/[jobId]/page.tsx - 12-09-25 Tuesday Update 9pm - This dyanmic route file page.tsx handles the video job page rendering based on jobId.
//That gives you URLs like: /video/4ed3e82d-8ab4-4954-9497-fe614bbf7ffa
//…and matches the href={/video/${encodeURIComponent(h.jobId)}} you already use in the dashboard.
//+
//Render a large YouTube-style player (16:9 video, native controls: play/pause, fullscreen, quality menu if the browser/source supports it).
//Show title, owner, date, and visibility under the player.
//Show an editable description for the owner 
//Show a comments section: Lists existing comments for that video (from GET /comments?highlightId=... – you’ll add these endpoints to FastAPI / Firestore).
//Lets allowed users post a new comment via POST /comments.
//Only allows comments if:
//The video is public, or
//The signed-in user is the owner 

"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  FormEvent
} from "react";
import { useParams, useRouter } from "next/navigation";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "https://hooptuber-fastapi-web-service-docker.onrender.com";

//12-07-25 Sunday 4pm Update - Prevent double-counting views on highlight videos with localStorage
//Shared front-end helpers (views + likes in localStorage) between DashboardClient + [jobId]/page.tsx
//Gives per-highlight view (if we've already counted a view for this highlight on this browser) + like (if user liked this highlight on this browser) state
//+
//Gives Per-highlight like toggle that persists across tabs and reloads (per browser)
const VIEW_STORAGE_PREFIX = "hooptuber:viewed:";
const LIKES_STORAGE_PREFIX = "hooptuber_like_v1:";
//const LIKES_STORAGE_PREFIX = "hooptuber_like_v1:"; on standalone video player page matches const LIKES_STORAGE_PREFIX on dashboard page (DashboardClient.tsx) 

function viewStorageKey(jobId: string) {
  return `${VIEW_STORAGE_PREFIX}${jobId}`;
}

function hasStoredView(jobId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(viewStorageKey(jobId)) === "1";
}

function markStoredView(jobId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(viewStorageKey(jobId), "1");
}

function likeStorageKey(jobId: string) {
    return `${LIKES_STORAGE_PREFIX}${jobId}`;
  }
  
  function isLikedLocally(jobId: string) {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LIKES_STORAGE_PREFIX + jobId) === "1";
  }

  function setLikedLocally(jobId: string, liked: boolean) {
    if (typeof window === "undefined") return;
    try {
      const key = likeStorageKey(jobId);
      if (liked) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch {
      //ignore storage errors
    }
}

type Visibility = "public" | "unlisted" | "private";

interface JobDoc {
  jobId: string;
  ownerEmail?: string;
  originalFileName?: string;
  createdAt?: string;
  finishedAt?: string;
  title?: string;
  visibility?: Visibility;
  highlightDurationSeconds?: number;
  status?: string;
  error?: string | null;
  description?: string; //description comes from Firestore
  likesCount?: number | null;
  viewsCount?: number | null;
  likedByCurrentUser?: boolean | null;
}

interface DownloadResponse {
  ok: boolean;
  url?: string; //signed URL
  expiresInMinutes?: number;
  shot_events?: any[];
}

interface Comment {
  id: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString();
}

function formatDuration(seconds?: number) {
  if (!seconds && seconds !== 0) return "";
  const s = Math.round(seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}


export default function VideoPage() {
    const params = useParams<{ jobId: string }>();
    const jobId = params?.jobId;
    const router = useRouter();

    const { user: currentUser, loading: authLoading } = useAuth();
    const userEmail = currentUser?.email as string | undefined;

    //12-09-25 Tuesday 4pm - View standalone video player page without being logged in
    //Are we logged in? - isAuthed flag and requireAuth() that matches TryFree login flow
    const isAuthed = !!userEmail;

    //For anonymous users, send them to the login page (same target
    //you use for TryFreeUploadButton) when they try to engage.
    const requireAuth = useCallback(() => {
      router.push("/login?next=/upload");
    }, [router]);    

    const [job, setJob] = useState<JobDoc | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    //editable meta
    const [title, setTitle] = useState("");
    const [visibility, setVisibility] = useState<Visibility>("private");
    const [savingMeta, setSavingMeta] = useState(false);

    //description (currently local only; backend does not persist it yet)
    const [description, setDescription] = useState("");
    const [savingDescription, setSavingDescription] = useState(false);

    //comments (local stub; backend endpoints still TODO)
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    const [likesCount, setLikesCount] = useState<number | null>(null);
    const [likedLocally, setLikedLocallyState] = useState(false);

    //12-09-25 Tuesday - Share button in standalone video player page dialog state
    const [shareOpen, setShareOpen] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    //12-07-25 Sunday 12:30pm - View tracking: count a view when user watches at least threshold of the video (half the video) or 30s, whichever is smaller 
    //Track view progress so each page load counts max 1 view
    const viewProgressRef = useRef<{
        hasCounted: boolean;
        thresholdSeconds: number;
        continuousSeconds: number;
        lastTime: number | null;
      }>({
        hasCounted: false,
        thresholdSeconds: 0,
        continuousSeconds: 0,
        lastTime: null,
      });
      
    //12-09-25 Tuesday - Share button in standalone video player page dialog state. Capture the current URL for the share dialog
    useEffect(() => {
      if (typeof window !== "undefined") {
        setShareUrl(window.location.href);
      }
    }, []);

    //--- Fetch job details + signed URL from your real backend ---
    useEffect(() => {
        if (!jobId) return;
    
        let cancelled = false;
    
        const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
    
            //1) GET /jobs/{job_id}
            const jobRes = await fetch(
            `${API_BASE}/jobs/${encodeURIComponent(jobId as string)}`
            );
    
            if (!jobRes.ok) {
            const txt = await jobRes.text();
            throw new Error(
                `Failed to load job: ${jobRes.status} ${jobRes.statusText} – ${txt}`
            );
            }
    
            const jobData: JobDoc = await jobRes.json();
    
            if (cancelled) return;
    
            setJob(jobData);
    
            setTitle(jobData.title ?? jobData.originalFileName ?? "");
            setVisibility(jobData.visibility ?? "private");

            //likes count from server
            setLikesCount(
              typeof jobData.likesCount === "number" ? jobData.likesCount : null,
            );

            //hydrate "liked" state from server backend + localStorage
            const likedFromServer = !!jobData.likedByCurrentUser;
            const likedFromLocal = isLikedLocally(jobId);
            const initialLiked = likedFromServer || likedFromLocal;

            if (jobId) {
              setLikedLocallyState(initialLiked);
              setLikedLocally(jobId, initialLiked);
            }
            
            //seed description from Firestore
            setDescription(jobData.description ?? "");
    
            //2) GET /jobs/{job_id}/download for signed URL
            const dlRes = await fetch(
            `${API_BASE}/jobs/${encodeURIComponent(
                jobId as string
            )}/download`
            );
    
            if (!dlRes.ok) {
            const txt = await dlRes.text();
            throw new Error(
                `Failed to get signed URL: ${dlRes.status} ${dlRes.statusText} – ${txt}`
            );
            }
    
            const dlJson: DownloadResponse = await dlRes.json();
    
            if (!dlJson.ok || !dlJson.url) {
            throw new Error("Download endpoint did not return a URL");
            }
    
            if (cancelled) return;
            setSignedUrl(dlJson.url);
    
            //3)Load comments from /video-comments
            try {
            const commentsRes = await fetch(
                `${API_BASE}/video-comments?` +
                `highlightId=${encodeURIComponent(jobId as string)}` +
                `&limit=50`
            );
            if (commentsRes.ok) {
                const json = await commentsRes.json();
                const items = (json.items ?? []) as any[];
    
                const mapped: Comment[] = items.map((c) => ({
                id: c.id,
                authorEmail: c.authorEmail,
                text: c.text,
                createdAt: c.createdAt,
                }));
    
                if (!cancelled) {
                setComments(mapped);
                }
            } else {
                console.warn("Failed to load comments", commentsRes.status);
            }
            } catch (err) {
            console.warn("Error loading comments", err);
            }
        } catch (err: any) {
            if (cancelled) return;
            console.error("VideoPage load error", err);
            setError(err?.message || "Failed to load video");
        } finally {
            if (!cancelled) setLoading(false);
        }
        };
    
        fetchData();
    
        return () => {
        cancelled = true;
        };
    }, [jobId]);
    

    const isOwner = !!job?.ownerEmail && job.ownerEmail === userEmail;
    const isPrivate = job?.visibility === "private";
    const isUnlisted = job?.visibility === "unlisted";
    const isPublic = job?.visibility === "public";
    const commentsAllowed = isPublic || isOwner; //12-01-25 Update: allow the owner to comment on private/unlisted videos too. However, in general, only on public videos: everyone can comment

    //view gating: you can tighten this later if needed
    const viewerCanSee =
        !job?.visibility || //if missing, default to visible for owner
        isPublic ||
        isUnlisted ||
        isOwner;

    //--- Save title + visibility via PATCH /highlights/{job_id} ---
    const handleSaveMeta = async (e: FormEvent) => {
        e.preventDefault();
        if (!jobId) return;
        if (!isOwner) return;

        try {
        setSavingMeta(true);

        const payload = {
            title: title.trim() || null,
            visibility,
        };

        const res = await fetch(
            `${API_BASE}/highlights/${encodeURIComponent(
            jobId as string
            )}`,
            {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            }
        );

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(
            `Failed to save metadata: ${res.status} ${res.statusText} – ${txt}`
            );
        }

        //Refresh local job state with the new values
        setJob((prev) =>
            prev
            ? {
                ...prev,
                title: payload.title || undefined,
                visibility: payload.visibility,
                }
            : prev
        );
        } catch (err: any) {
        console.error("Error saving metadata", err);
        alert(err?.message || "Failed to save metadata");
        } finally {
        setSavingMeta(false);
        }
    };

    //--- Save description (NOW WIRED TO BACKEND) ---
    const handleSaveDescription = async (e: FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        if (!jobId) return;
    
        try {
        setSavingDescription(true);
    
        const payload = {
            description: description.trim(),
        };
    
        const res = await fetch(
            `${API_BASE}/highlights/${encodeURIComponent(jobId as string)}`,
            {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            }
        );
    
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(
            `Failed to save description: ${res.status} ${res.statusText} – ${txt}`
            );
        }
    
        const json = await res.json();
        const updated = json.item as Partial<JobDoc> | undefined;
    
        //sync local job state with what Firestore now has
        if (updated) {
            setJob((prev) =>
            prev
                ? {
                    ...prev,
                    description: updated.description ?? payload.description,
                }
                : prev
            );
        }
        } catch (err: any) {
        console.error("Error saving description", err);
        alert(err?.message || "Failed to save description");
        } finally {
        setSavingDescription(false);
        }
    };

    //--- Comment handling (NOW CONNECTED TO BACKEND) ---
    const handleAddComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!jobId || !viewerCanSee) return;
        if (!newComment.trim()) return;
    
        if (!userEmail) {
        alert("You must be logged in to comment.");
        return;
        }
    
        try {
        setPostingComment(true);
    
        //optimistic local update
        const now = new Date().toISOString();
        const optimistic: Comment = {
            id: `local-${now}`,
            authorEmail: userEmail,
            text: newComment.trim(),
            createdAt: now,
        };
        setComments((prev) => [optimistic, ...prev]);
        setNewComment("");
    
        //POST to /video-comments (FastAPI)
        const res = await fetch(`${API_BASE}/video-comments`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            highlightId: jobId,
            authorEmail: userEmail,
            text: optimistic.text,
            }),
        });
    
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(
            `Failed to post comment: ${res.status} ${res.statusText} – ${txt}`
            );
        }
    
        const json = await res.json();
        const stored = json.item as {
            id: string;
            authorEmail: string;
            text: string;
            createdAt: string;
        };
    
        //replace the optimistic comment with the stored version
        setComments((prev) => [
            stored,
            ...prev.filter((c) => c.id !== optimistic.id),
        ]);
        } catch (err: any) {
        console.error("Error adding comment", err);
        alert(err?.message || "Failed to add comment");
    
        //rollback optimistic add on error
        setComments((prev) =>
            prev.filter((c) => !c.id.startsWith("local-"))
        );
        } finally {
        setPostingComment(false);
        }
    };

    //12-06-25 Saturday 9pm - View tracking: count a view when user watches at least threshold of the video (half the video) or 30s, whichever is smaller 
    //Standalone view tracking: count a view when user
    //watches at least threshold (half the video or 30s) *continuously*.
    function handleStandaloneTimeUpdate(
        ev: React.SyntheticEvent<HTMLVideoElement>
    ) {
        if (!jobId || !job) return;

        //If this browser has already counted a view for this highlight, do nothing.
        if (hasStoredView(jobId as string)) {
            viewProgressRef.current.hasCounted = true;
            return;
        }
            
        const video = ev.currentTarget;
    
        //Prefer the stored highlightDurationSeconds; fall back to video.duration
        const duration =
        (job.highlightDurationSeconds ?? 0) > 0
            ? job.highlightDurationSeconds!
            : video.duration || 0;
    
        if (!duration || !Number.isFinite(duration)) return;
    
        //threshold = 30s OR half the video, whichever is smaller
        const threshold = Math.min(30, duration / 2);
        const vp = viewProgressRef.current;
    
        //Keep thresholdSeconds in sync for debugging / future UI
        if (!vp.thresholdSeconds || vp.thresholdSeconds !== threshold) {
        vp.thresholdSeconds = threshold;
        }
    
        //Already counted a view for this page load
        if (vp.hasCounted) return;
    
        const current = video.currentTime;
    
        //First tick: seed lastTime and wait for the next update
        if (vp.lastTime == null) {
            vp.lastTime = current;
            return;
        }
    
        const delta = current - vp.lastTime;
    
        //If time jumped backwards or too far forward (seek/skip),
        //treat as an interruption and reset the continuous timer.
        if (delta <= 0 || delta > 1.5) {
            vp.continuousSeconds = 0;
            vp.lastTime = current;
            return;
        }
    
        //Normal playback – accumulate uninterrupted watch time
        vp.continuousSeconds += delta;
        vp.lastTime = current;
    
        if (vp.continuousSeconds < vp.thresholdSeconds) return;
    
        //Reached the continuous-watch threshold – count 1 view and fire backend
        vp.hasCounted = true;
        markStoredView(jobId as string);
    
        (async () => {
        try {
            const r = await fetch(`${API_BASE}/video-engagement/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ highlightId: jobId }),
            });
    
            if (!r.ok) return;
    
            //Optional: if the API returns the new viewsCount, you could
            //update local UI state here.
        } catch (err) {
            console.error("record_view (standalone) failed:", err);
        }
        })();
    }
  
      //12-07-25 Sunday 12:30pm - View tracking: count a view when user watches at least threshold of the video (half the video) or 30s, whichever is smaller 
      const handleStandaloneInterrupt = (ev: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = ev.currentTarget;
        const vp = viewProgressRef.current;

        if (vp.hasCounted) return;
      
        vp.continuousSeconds = 0;
        vp.lastTime = video.currentTime;
      };

      async function handleStandaloneLike() {
        if (!jobId) return;
      
        const alreadyLiked = isLikedLocally(jobId);
        const nextLiked = !alreadyLiked;
        const delta = nextLiked ? 1 : -1;
      
        //optimistic localStorage + UI
        setLikedLocally(jobId, nextLiked);
        setLikedLocallyState(nextLiked);
        setLikesCount(prev => {
          const base = prev ?? 0;
          return Math.max(0, base + delta);
        });
      
        try {
          const r = await fetch(`${API_BASE}/video-engagement/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ highlightId: jobId, delta }),
          });
      
          if (!r.ok) throw new Error("like failed");
      
          const json = await r.json().catch(() => null);
          if (typeof json?.likesCount === "number") {
            setLikesCount(json.likesCount);
          }
        } catch (err) {
          console.error("record_like standalone failed:", err);
      
          //revert if backend fails
          setLikedLocally(jobId, alreadyLiked);
          setLikedLocallyState(alreadyLiked);
          setLikesCount(prev => {
            const base = prev ?? 0;
            return Math.max(0, base - delta);
          });
        }
      }
    
    //12-09-25 Tuesday 4pm - Added share button to standalone video player page
    //Share button – copy the current /video/[jobId] URL to clipboard
    function handleShareClick() {
      if (typeof window === "undefined") return;
      // refresh URL just in case (e.g. if env changed)
      setShareUrl(window.location.href);
      setShareCopied(false);
      setShareOpen(true);
    }

    //12-09-25 Tuesday 4pm - copy handler
    async function handleCopyShareLink() {
      if (!shareUrl) return;

      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          setShareCopied(true);
        } else {
          // Fallback prompt
          window.prompt("Copy this link:", shareUrl);
        }
      } catch {
        window.prompt("Copy this link:", shareUrl);
      }
    }

      
  //--- Render ---
  if (!jobId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">
          Invalid URL – missing job ID in route.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg font-semibold">Loading video…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-600 mb-2">
          {error || "Could not load this highlight."}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!viewerCanSee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">
          This video is private.
        </p>
        <p className="text-gray-600 mb-4">
          You don&apos;t have permission to view this highlight.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Go to Sign-In
        </button>
      </div>
    );
  }

    const displayTitle =
      title || job.title || job.originalFileName || "Untitled highlight";


    return (
        <div className="min-h-screen bg-gray-100">
          {/*Top bar (kept from your original) */}
          {/* <header className="w-full bg-white border-b">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Back to Dashboard
                </Link>
              </div>
      
              {userEmail && (
                <div className="text-xs text-gray-600">
                  Logged in as <span className="font-medium">{userEmail}</span>
                </div>
              )}
            </div>
          </header> */}
          {/* Top bar */}
          <header className="w-full bg-white border-b">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              {/* Left: HoopTuber logo -> Dashboard */}
              <Link
                href="/" //HoopTuber logo links back to Home Page
                className="flex items-center gap-2"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  ▶
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  HoopTuber
                </span>
              </Link>

              {/*Right: either "logged in as" or Sign In button */}
              {isAuthed ? (
                <div className="text-xs text-gray-600">
                  Logged in as{" "}
                  <span className="font-medium">{userEmail}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={requireAuth}
                  className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-black"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/*YouTube-style main column layout */}
          <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
            {/*1. Video player */}
            <section>
              <div className="bg-black rounded-xl overflow-hidden shadow">
                {signedUrl ? (
                  <video
                    className="w-full aspect-video bg-black"
                    src={signedUrl}
                    controls
                    onTimeUpdate={handleStandaloneTimeUpdate}
                    onPause={handleStandaloneInterrupt}
                    onSeeking={handleStandaloneInterrupt}
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center text-gray-200">
                    No video URL available.
                  </div>
                )}
              </div>
            </section>
      
            {/*2.Title + Like button + basic meta (all in one card) */}
            <section className="bg-white rounded-xl shadow p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/*Left: title + meta */}
                {isOwner ? (
                  //OWNER VIEW – can edit title & visibility
                  <form onSubmit={handleSaveMeta} className="flex-1 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Title
                      </label>
                      <input
                        type="text"
                        value={displayTitle}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          Visibility
                        </div>
                        <select
                          value={visibility}
                          onChange={(e) =>
                            setVisibility(e.target.value as Visibility)
                          }
                          className="mt-1 border rounded px-2 py-1 text-sm"
                        >
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div className="text-xs text-gray-500 text-right">
                        <div>
                          Uploaded: {formatDate(job.createdAt) || "Unknown"}
                        </div>
                        {job.highlightDurationSeconds != null && (
                          <div>
                            Length: {formatDuration(job.highlightDurationSeconds)}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingMeta}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-70"
                    >
                      {savingMeta ? "Saving…" : "Save title & visibility"}
                    </button>
                  </form>
                ) : (
                  //NON-OWNER VIEW – plain text title, no inputs or visibility dropdown
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        Title
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {displayTitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        {/*we could optionally show visibility text here if you want */}
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div>
                          Uploaded: {formatDate(job.createdAt) || "Unknown"}
                        </div>
                        {job.highlightDurationSeconds != null && (
                          <div>
                            Length: {formatDuration(job.highlightDurationSeconds)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/*Right side: Like + Share buttons (YouTube-style) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isAuthed ? handleStandaloneLike : requireAuth}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition
                      ${likedLocally
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    <span aria-hidden="true" className="text-base">
                      {likedLocally ? "❤️" : "🤍"}
                    </span>
                    <span>{likedLocally ? "Liked" : "Like"}</span>
                    <span className="text-xs text-gray-500">
                      {likesCount ?? 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareClick}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                  >
                    <span aria-hidden="true">🔗</span>
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 3.Description section (below title/like) */}
            <section className="bg-white rounded-xl shadow p-4">
              {isOwner ? (
                //OWNER VIEW – editable textarea
                <form onSubmit={handleSaveDescription} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Description
                    </h2>
                    <span className="text-[11px] text-gray-500">
                      You can edit this description
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm resize-none"
                    placeholder="Add a description for this run or highlight…"
                  />

                  <button
                    type="submit"
                    disabled={savingDescription}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-70"
                  >
                    {savingDescription ? "Saving…" : "Save description"}
                  </button>
                </form>
              ) : (
                //NON-OWNER VIEW – plain text only
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Description
                    </h2>
                  </div>

                  {description && description.trim().length > 0 ? (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      No description provided.
                    </p>
                  )}
                </div>
              )}
            </section>
      
            {/*4.Comments section (full-width, under description) */}
            <section className="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-900">Comments Section</h2>
      
              {commentsAllowed ? (
                <>
                  {/*Add comment form */}
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm resize-none"
                      placeholder={
                        userEmail
                          ? "Add a comment…"
                          : "Log in to add a comment…"
                      }
                      disabled={!userEmail || postingComment}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={
                          !userEmail || !newComment.trim() || postingComment
                        }
                        className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                      >
                        {postingComment ? "Posting…" : "Comment"}
                      </button>
                    </div>
                  </form>
      
                  {/*Comment list */}
                  {comments.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No comments yet. Be the first to comment.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-auto">
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">
                              {c.authorEmail}
                            </span>
                            <span className="text-gray-500">
                              {formatDate(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {c.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  Comments are only available on public videos. This highlight is{" "}
                  <span className="font-semibold">
                    {job.visibility || "private"}
                  </span>
                  .
                </p>
              )}
            </section>
          </main>
          {/* ===================== */}
          {/* Share dialog overlay */}
          {/* ===================== */}
          {shareOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Share highlight
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShareOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {/*Email button */}
                <div>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      "Check out this HoopTuber highlight"
                    )}&body=${encodeURIComponent(shareUrl)}`}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white text-xs">
                      ✉
                    </span>
                    Email
                  </a>
                </div>

                {/*Link + copy */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">
                    Video link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 border rounded px-2 py-1 text-xs bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                    >
                      {shareCopied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {shareCopied && (
                    <p className="text-[11px] text-green-600">
                      Link copied to clipboard
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );     
}