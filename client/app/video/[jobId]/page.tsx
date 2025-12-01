//client/app/video/[jobId]/page.tsx - 12-01-25 Update - This dyanmic route file page.tsx handles the video job page rendering based on jobId.
//That gives you URLs like: /video/4ed3e82d-8ab4-4954-9497-fe614bbf7ffa
//…and matches the href={/video/${encodeURIComponent(h.jobId)}} you already use in the dashboard.
//+
//This new dynamic route will:
//Read jobId from the URL using useParams().
//Fetch the highlight record (including signedUrl, title, description, visibility, ownerEmail, etc.) from your FastAPI backend via GET /highlights/{jobId}?signed=true.
//Render a large YouTube-style player (16:9 video, native controls: play/pause, fullscreen, quality menu if the browser/source supports it).
//Show title, owner, date, and visibility under the player.
//Show an editable description for the owner (PATCHes /highlights/{jobId} with description).
//Show a comments section: Lists existing comments for that video (from GET /comments?highlightId=... – you’ll add these endpoints to FastAPI / Firestore).
//Lets allowed users post a new comment via POST /comments.
//Only allows comments if:
// The video is public, or
// The signed-in user is the owner (you can tighten this later if you want).

"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

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
}

interface DownloadResponse {
  ok: boolean;
  url?: string; // signed URL
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

  const { data: session, status: sessionStatus } = useSession();
  const userEmail = (session?.user as any)?.email as string | undefined;

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
  
        //seed title + visibility
        setTitle(
          jobData.title ||
            jobData.originalFileName ||
            "Untitled highlight"
        );
        setVisibility(jobData.visibility || "private");
  
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
    !job?.visibility || // if missing, default to visible for owner
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
          Back to Dashboard
        </button>
      </div>
    );
  }

  const displayTitle =
    title || job.title || job.originalFileName || "Untitled highlight";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple top bar */}
      <header className="w-full bg-white border-b">
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
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left column: video player */}
        <section className="flex-1">
          <div className="bg-black rounded-xl overflow-hidden shadow">
            {signedUrl ? (
              <video
                className="w-full aspect-video"
                src={signedUrl}
                controls
                // if you want autoplay: uncomment
                // autoPlay
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-gray-200">
                No video URL available.
              </div>
            )}
          </div>

          {/*Shot stats, basic meta etc could go here later */}
        </section>

        {/*Right column: title, meta, description, comments */}
        <section className="w-full lg:w-80 flex flex-col gap-6">
          {/* Meta / title / visibility */}
          <div className="bg-white rounded-xl shadow p-4">
            <form onSubmit={handleSaveMeta} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">
                  Title
                </label>
                <input
                  type="text"
                  value={displayTitle}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isOwner}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-gray-500">
                    Visibility
                  </div>
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as Visibility)
                    }
                    disabled={!isOwner}
                    className="mt-1 border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="text-xs text-right text-gray-500">
                  <div>
                    Uploaded: {formatDate(job.createdAt) || "Unknown"}
                  </div>
                  {job.highlightDurationSeconds != null && (
                    <div>
                      Length:{" "}
                      {formatDuration(job.highlightDurationSeconds)}
                    </div>
                  )}
                </div>
              </div>

              {isOwner && (
                <button
                  type="submit"
                  disabled={savingMeta}
                  className="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-70"
                >
                  {savingMeta ? "Saving…" : "Save title & visibility"}
                </button>
              )}
            </form>
          </div>

          {/*Description */}
          <div className="bg-white rounded-xl shadow p-4">
            <form onSubmit={handleSaveDescription} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Description
                </h2>
                {!isOwner && (
                  <span className="text-[11px] text-gray-500">
                    Owner can edit description
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isOwner}
                className="w-full border rounded px-2 py-1 text-sm resize-none disabled:bg-gray-100"
                placeholder="Add a description for this run or highlight…"
              />
              {isOwner && (
                <button
                  type="submit"
                  disabled={savingDescription}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-70"
                >
                  {savingDescription ? "Saving…" : "Save description"}
                </button>
              )}
            </form>
          </div>

          {/*Comments */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Comments
            </h2>

            {commentsAllowed ? (
                <>
                {/* Add comment form */}
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

                {/* Comment list */}
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
                Comments are only available on public videos. This
                highlight is{" "}
                <span className="font-semibold">
                  {job.visibility || "private"}
                </span>
                .
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
