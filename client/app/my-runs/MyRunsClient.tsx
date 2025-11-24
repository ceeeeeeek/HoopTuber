//client/app/my-runs/MyRunsClient.tsx - 11-19-25 Wednesday Version 3pm 

//comment for version / wiring
"use client"; 

import React, { useState, useEffect, useCallback, useMemo } from "react"; 
import { Play, Upload, Globe2, Plus, Users, Eye, Lock, Trash2, Pencil, ChevronDown, Link as LinkIcon } from "lucide-react";            
import { cn } from "@/lib/utils";                  
import Link from "next/link";
//import { useSession } from "next-auth/react";
import ProfileDropdown from "../app-components/ProfileDropdown";

// 🔁 Dribbling icon – same look as before
// (copied from your previous MyRunsClient)          
export function DribbleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      {/* ball */}                                    
      <circle cx="17" cy="5" r="3" fill="currentColor" />
      {/* body */}
      <path
        d="M10 8L8 13l2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* front leg */}
      <path
        d="M10 16l-1.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* back leg */}
      <path
        d="M10 15l2.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* arm toward ball */}
      <path
        d="M10 9.5L14 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* head */}
      <circle cx="10" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

//reuse your FastAPI base like DashboardClient
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

//typed visibility for runs
type RunVisibility = "public" | "private" | "unlisted";

//11-22-25 Saturday 12am - For my runs page
// --- My Runs API types (separate from highlightFolders) ---
type RunsSummary = {
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

//11-22-25 Satuday 12am - For my runs page
//===================== RUNS API HELPERS (START) =====================
async function apiListRuns(memberEmail: string): Promise<RunsSummary[]> {
    const url = `${API_BASE}/runs?memberEmail=${encodeURIComponent(memberEmail)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(
        `Failed to load runs: ${r.status} ${r.statusText} ${txt}`
      );
    }
    const data = await r.json();
    return Array.isArray(data?.items) ? (data.items as RunsSummary[]) : [];
  }

  async function apiCreateRun(
    ownerEmail: string,
    name: string,
    visibility: RunVisibility = "private"
  ): Promise<RunsSummary> {
    const r = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ownerEmail, visibility }),
    });
  
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(
        `Failed to create run: ${r.status} ${r.statusText} ${txt}`
      );
    }
  
    const data = await r.json();
    return data.run as RunsSummary;
  }
  
  async function apiUpdateRun(
    runId: string,
    patch: Partial<Pick<RunsSummary, "name" | "visibility">>
  ): Promise<RunsSummary> {
    const r = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(
        `Failed to update run: ${r.status} ${r.statusText} ${txt}`
      );
    }
  
    const data = await r.json();
    return data.run as RunsSummary;
  }
  
  async function apiDeleteRun(runId: string): Promise<void> {
    const r = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}`, {
      method: "DELETE",
    });
  
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(
        `Failed to delete run: ${r.status} ${r.statusText} ${txt}`
      );
    }
  }
  
  async function apiInviteRun(runId: string): Promise<string> {
    const r = await fetch(
      `${API_BASE}/runs/${encodeURIComponent(runId)}/invite`,
      {
        method: "POST",
      }
    );
  
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(
        `Failed to create invite: ${r.status} ${r.statusText} ${txt}`
      );
    }
  
    const data = await r.json();
    // backend should return { inviteUrl: "https://..." }
    if (typeof data.inviteUrl === "string") {
      return data.inviteUrl;
    }
    // fallback: if only token returned, construct a reasonable URL
    if (typeof data.token === "string") {
      return `${window.location.origin}/join/${data.token}`;
    }
    throw new Error("Invite URL not found in response");
  }
//===================== RUNS API HELPERS (END) =====================
//11-22-25 Satuday 12am - For my runs page

//11-22-25 Satuday 12am - For my runs page
//===================== COMPONENT (START) ============================
// Props come from server wrapper in app/my-runs/page.tsx         
export default function MyRunsClient({ userEmail }: { userEmail: string }) {
//export default function MyRunsClient() {
    const [runs, setRuns] = useState<RunsSummary[]>([]);           
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    //For creating a run
    const [creating, setCreating] = useState<boolean>(false);

    //For rename modal
    const [editingRunId, setEditingRunId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState<string>("");
  
    //For visibility dropdown
    const [visibilityMenuFor, setVisibilityMenuFor] = useState<string | null>(
        null
    );

    //For invite link feedback
    const [inviteBusyFor, setInviteBusyFor] = useState<string | null>(null);
    const [inviteCopiedFor, setInviteCopiedFor] = useState<string | null>(null);
    
    //helper to check ownership
    const isOwner = useCallback(
        (run: RunsSummary) => run.ownerEmail === userEmail,
        [userEmail]
    );

    //filter My Runs = anything you're a member of
    const memberRuns = useMemo(
        () => runs.filter((r) => r.members?.includes(userEmail)),
        [runs, userEmail]
    );

    //real loader for runs
    const loadRuns = useCallback(async () => {
        if (!userEmail) return;
        try {
        setLoading(true);
        setError(null);
        const items = await apiListRuns(userEmail);
        setRuns(items);
        } catch (e: any) {
        console.error("loadRuns error", e);
        setError(e?.message || "Failed to load runs.");
        setRuns([]);
        } finally {
        setLoading(false);
        }
    }, [userEmail]);

    //(load on mount) but now uses loadRuns + member logic
    useEffect(() => {
        if (!userEmail) return;
        loadRuns();
      }, [userEmail, loadRuns]);

    //11-22-25 Saturday 12am - For my runs page

    //load runs from FastAPI using ownerEmail
    // useEffect(() => {
    //     if (!userEmail) return;

    //     let cancelled = false;

    //     (async () => {
    //     try {
    //         setLoading(true);
    //         setError(null);
    //         const items = await apiListRuns(userEmail);
    //         if (!cancelled) setRuns(items);
    //     } catch (e: any) {
    //         if (!cancelled) setError(e?.message || "Failed to load runs");
    //     } finally {
    //         if (!cancelled) setLoading(false);
    //     }
    //     })();

    //     return () => {
    //     cancelled = true;
    //     };
    // }, [userEmail]);

    // // simple guard (shouldn’t usually hit because page.tsx already checks)
    // if (!userEmail) {
    //     return (
    //     <main className="min-h-screen bg-slate-50">
    //         <div className="max-w-6xl mx-auto px-4 py-10 text-gray-600">
    //         Missing user email. Please sign in again.
    //         </div>
    //     </main>
    //     );
    // }
//===================== COMPONENT (END) ============================

//============================ Actions (START) ============================
//11-22-25 Saturday 12am - For my runs page
    // const handleCreateRun = async () => {
    //     if (!userEmail) {
    //     alert("You need to be logged in to create a run.");
    //     return;
    //     }
    
    //     const name = window.prompt("Name your run", "Wednesday Run");
    //     if (!name) return; // cancelled or empty
    
    //     try {
    //     // optional: you can show a subtle loading state if you want
    //     const res = await fetch(`${API_BASE}/runs`, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({
    //         name,
    //         ownerEmail: userEmail,
    //         // visibility optional here; backend defaults to "private"
    //         }),
    //     });
    
    //     if (!res.ok) {
    //         console.error("Failed to create run", await res.text());
    //         alert("Failed to create run. Please try again.");
    //         return;
    //     }
    
    //     const data = await res.json();
    //     const newRun = data.run;
    
    //     // Prepend new run into current list
    //     setRuns((prev) => [newRun, ...(prev || [])]);
    //     } catch (err) {
    //     console.error("Error creating run", err);
    //     alert("Network error while creating run.");
    //     }
    // };
//11-22-25 Saturday 12am - For my runs page

//11-23-25 Sunday 11am - For my runs page
    const handleCreateRun = async () => {
        if (!userEmail) return;
        const name = prompt("Name your run:");
        if (!name || !name.trim()) return;
        try {
          setCreating(true);
          const run = await apiCreateRun(userEmail, name.trim(), "private");
          // Prepend to the list
          setRuns((prev) => [run, ...prev]);
        } catch (e: any) {
          alert(e?.message || "Failed to create run.");
        } finally {
          setCreating(false);
        }
      };

      const openRenameModal = (run: RunsSummary) => {
        setEditingRunId(run.runId);
        setRenameValue(run.name);
      };
    
      const cancelRename = () => {
        setEditingRunId(null);
        setRenameValue("");
      };
    
      const saveRename = async () => {
        if (!editingRunId || !renameValue.trim()) return;
        try {
          const updated = await apiUpdateRun(editingRunId, {
            name: renameValue.trim(),
          });
          setRuns((prev) =>
            prev.map((r) => (r.runId === updated.runId ? updated : r))
          );
          cancelRename();
        } catch (e: any) {
          alert(e?.message || "Failed to rename run.");
        }
      };
    
      const changeVisibility = async (run: RunsSummary, visibility: RunVisibility) => {
        if (run.visibility === visibility) {
          setVisibilityMenuFor(null);
          return;
        }
        try {
          const updated = await apiUpdateRun(run.runId, { visibility });
          setRuns((prev) =>
            prev.map((r) => (r.runId === updated.runId ? updated : r))
          );
        } catch (e: any) {
          alert(e?.message || "Failed to update visibility.");
        } finally {
          setVisibilityMenuFor(null);
        }
      };
    
      const handleDeleteRun = async (run: RunsSummary) => {
        if (!isOwner(run)) {
          alert("Only the run owner can delete this run.");
          return;
        }
        const ok = confirm(
          `Delete run "${run.name}"? This does not delete any highlight videos, only the run grouping.`
        );
        if (!ok) return;
    
        try {
          await apiDeleteRun(run.runId);
          setRuns((prev) => prev.filter((r) => r.runId !== run.runId));
        } catch (e: any) {
          alert(e?.message || "Failed to delete run.");
        }
      };
    
      const handleInviteLink = async (run: RunsSummary) => {
        try {
          setInviteBusyFor(run.runId);
          const inviteUrl = await apiInviteRun(run.runId);
          await navigator.clipboard.writeText(inviteUrl);
          setInviteCopiedFor(run.runId);
          setTimeout(() => setInviteCopiedFor(null), 2000);
        } catch (e: any) {
          alert(e?.message || "Failed to create/copy invite link.");
        } finally {
          setInviteBusyFor(null);
        }
      };
//11-23-25 Sunday 11am - For my runs page

//============================ Actions (END) ============================
//11-22-25 Saturday 12am - For my runs page

//============================ RENDER (START)============================
return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (same as Dashboard page) –UI */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              HoopTuber
            </span>
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

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Page title – expanded actions */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              My Runs
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              See the pickup runs you&apos;re part of and the highlight
              videos shared there.
            </p>
          </div>

          {/* Join + Create actions – replaces single button layout */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
              onClick={() =>
                alert(
                  "Join a Run page will show all public runs and let you join them. We’ll wire it up next."
                )
              }
            >
              <Globe2 className="w-4 h-4" />
              Join a Run
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
              onClick={handleCreateRun}
              disabled={creating || !userEmail}
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating…" : "Create Run"}
            </button>
          </div>
        </header>

        {/* === My Runs gallery === richer content */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DribbleIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">My Runs</h2>
            </div>

            {/* Secondary Join for small screens – text updated */}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs md:text-sm text-gray-800 hover:bg-gray-50"
              onClick={() =>
                alert(
                  "Join a Run (secondary button) – same future behavior as the primary button."
                )
              }
            >
              <Globe2 className="w-4 h-4" />
              Join a Run
            </button>
          </div>

          {/* loading / error / empty - text updated */}
          {loading && (
            <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
              Loading your runs…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && memberRuns.length === 0 && (
            <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
              You haven&apos;t joined any runs yet. Use{" "}
              <span className="font-medium">Create Run</span> to start a
              new run,{" "}
              <span className="font-medium">Join a Run</span> to find
              public runs, or assign highlights to runs from your
              Dashboard.
            </div>
          )}

          {!loading && !error && memberRuns.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {memberRuns.map((run) => {
                const videoCount = run.highlightIds?.length ?? 0; 
                const memberCount = run.members?.length ?? 1;      
                const owned = isOwner(run);                        

                //choose icon for visibility
                const visibilityIcon =
                  run.visibility === "public"
                    ? Eye
                    : run.visibility === "private"
                    ? Lock
                    : LinkIcon;
                const VisibilityIconComp = visibilityIcon;

                return (
                  <article
                    key={run.runId}
                    className="rounded-lg border bg-white p-4 flex flex-col justify-between gap-3"
                  >
                    {/* Top row: name + owner + visibility + delete – richer header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <DribbleIcon className="w-4 h-4 text-purple-600 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {run.name}
                            </h3>
                            {owned && (
                              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                You&apos;re the admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Owned by:{" "}
                            <span className="font-mono">
                              {run.ownerEmail}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {/* visibility dropdown*/}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibilityMenuFor((prev) =>
                                prev === run.runId ? null : run.runId
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-700 border hover:bg-gray-100"
                          >
                            <VisibilityIconComp className="w-3 h-3" />
                            <span className="capitalize">
                              {run.visibility}
                            </span>
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {visibilityMenuFor === run.runId && owned && (
                            <div className="absolute right-0 mt-1 w-40 rounded-md border bg-white shadow-md text-xs z-10">
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                onClick={() =>
                                  changeVisibility(run, "private")
                                }
                              >
                                <Lock className="w-3 h-3" />
                                Private
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                onClick={() =>
                                  changeVisibility(run, "unlisted")
                                }
                              >
                                <LinkIcon className="w-3 h-3" />
                                Unlisted
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                onClick={() =>
                                  changeVisibility(run, "public")
                                }
                              >
                                <Eye className="w-3 h-3" />
                                Public
                              </button>
                            </div>
                          )}
                        </div>

                        {/* rename + delete*/}
                        <div className="flex items-center gap-2">
                          {owned && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => openRenameModal(run)}
                            >
                              <Pencil className="w-3 h-3" />
                              Rename
                            </button>
                          )}
                          {owned && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteRun(run)}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* body copy – updated text */}
                    <p className="text-xs text-gray-500">
                      In a later step, this card will show the latest
                      highlight videos for this run plus a comment stream
                      for your squad.
                    </p>

                    {/* meta rows: members + highlights + invite */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <div className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>
                          {memberCount === 1
                            ? "1 member"
                            : `${memberCount} members`}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1">
                        <DribbleIcon className="w-3 h-3 text-purple-600" />
                        <span>
                          {videoCount === 1
                            ? "1 highlight"
                            : `${videoCount} highlights`}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        onClick={() => handleInviteLink(run)}
                        disabled={!!inviteBusyFor}
                      >
                        <LinkIcon className="w-3 h-3" />
                        {inviteBusyFor === run.runId
                          ? "Creating link…"
                          : inviteCopiedFor === run.runId
                          ? "Link copied!"
                          : "Invite link"}
                      </button>
                    </div>

                    {/* Members list */}
                    {(run.members?.length || 0) > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <p className="text-[11px] font-semibold text-gray-500 mb-1">
                          Members
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {run.members?.map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-700"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highlight IDs list – (simple debug-style) */}
                    {(run.highlightIds?.length || 0) > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <p className="text-[11px] font-semibold text-gray-500 mb-1">
                          Highlight IDs
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {run.highlightIds?.map((hId) => (
                            <span
                              key={hId}
                              className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-mono text-orange-700"
                            >
                              {hId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Simple rename "modal" – overlay */}
        {editingRunId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
              <h2 className="text-sm font-semibold mb-2">
                Rename run
              </h2>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full rounded-md border px-2 py-1 text-sm mb-3"
              />
              <div className="flex justify-end gap-2 text-sm">
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border text-gray-700 hover:bg-gray-50"
                  onClick={cancelRename}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                  onClick={saveRename}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
//============================ RENDER (END)============================
