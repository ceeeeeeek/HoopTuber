//client/app/my-runs/MyRunsClient.tsx - Sunday 11-30-25 Version 6:30pm

"use client"; 

import React, { useState, useEffect, useCallback, useMemo } from "react"; 
import {
  Play,
  Upload,
  Globe2,
  Plus,
  User,
  Users,
  Eye,
  Lock,
  Trash2,
  Pencil,
  ChevronDown,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";                  
import Link from "next/link";
import { useSession } from "next-auth/react";
import ProfileDropdown from "../app-components/ProfileDropdown";
import CreateRunModal from "./CreateRunModal"; //12-11-25 Thursday 7:30pm - Better polished Create a Run button modal for my-runs page
import InviteLinkModal from "./InviteLinkModal"; //12-11-25 Thursday 7:30pm - Better polished Invite Link button modal for my-runs page
import RunSettingsModal, { RunSettingsDraft } from "./RunSettingsModal";
import VisibilityWarningModal from "./VisibilityWarningModal";
import { useRouter } from "next/navigation";
import { DribbleIcon } from "@/components/icons/DribbleIcon";
import { DribbleIcon2 } from "@/components/icons/DribbleIcon2";

//reuse your FastAPI base like DashboardClient
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

//11/30/25 Update: Abort-related “NetworkError when attempting to fetch resource” won’t be treated as real failures.
//Your UI states (highlightsError, folderError, etc.) will only show for real failures, not cancelled requests.
//Combined with the polling you already wired up, /dashboard will feel much less “glitchy” and should stay in sync as soon as the worker writes the highlight docs.
//helper so aborted fetches don't show as "real" errors
function isAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === "AbortError"
  ) || (err as any)?.name === "AbortError";
}

//typed visibility for runs
type RunVisibility = "public" | "private" | "unlisted";

//11-22-25 Saturday 12am - For my runs page
//--- My Runs API types (separate from highlightFolders) ---
type RunsSummary = {
    runId: string;
    name: string;
    ownerEmail: string;
    visibility: RunVisibility;
    members?: string[];
    highlightIds?: string[];
    createdAt?: string;
    updatedAt?: string;
    maxMembers?: number | null;
    location?: string;
    allowComments?: boolean;
    allowInviteLinks?: boolean;
    pinnedMessage?: string;
    featuredHighlightId?: string;
    publicThumbnailHighlightId?: string;
    publicThumbnail?: string;      //or a highlightId/jobId later
    pinnedHighlightId?: string;    //highlight the owner pins
  };

  //12-01-25 Monday 4pm - Highlight summary type
  type HighlightSummary = {
    jobId: string;
    title?: string;
    originalFileName?: string;
    signedUrl?: string; //12-09-25 Tuesday 1pm - We also get a signed URL from /highlights; use it for thumbnails on the my-runs page
  };
  

//11-22-25 Saturday 12am - For my runs page
//===================== RUNS API HELPERS/HANDLERS (START) =====================
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
    //patch: Partial<Pick<RunsSummary, "name" | "visibility">>
    patch: Partial<RunsSummary>
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
    //backend should return {inviteUrl: "https://..." }
    if (typeof data.inviteUrl === "string") {
      return data.inviteUrl;
    }
    //fallback: if only token returned, construct a reasonable URL
    if (typeof data.token === "string") {
      return `${window.location.origin}/join/${data.token}`;
    }
    throw new Error("Invite URL not found in response");
  }

  
//===================== RUNS API HELPERS (END) =====================
//11-22-25 Saturday 12am - For my runs page

//11-22-25 Saturday 12am - For my runs page
//===================== COMPONENT (START) ============================
//Props come from server wrapper in app/my-runs/page.tsx         
//export default function MyRunsClient({ userEmail }: { userEmail: string }) {
//component - MyRunsClient()
export default function MyRunsClient() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const userEmail = session?.user?.email || "";

    //Flag so we only hit the backend once we know:
    //1) auth is ready AND 2) we actually have a logged-in email.
    const backendReady = status === "authenticated" && !!userEmail;

    const [runs, setRuns] = useState<RunsSummary[]>([]);           
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    //12-01-25 Monday 4pm - Highlight summary map state
    const [highlightMap, setHighlightMap] = useState<Record<string, HighlightSummary>>({});

    //12-09-25 Tuesday 1pm - which runs have their thumbnails expanded?
    const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});

    //12-09-25 Tuesday 1pm - lightbox for enlarged thumbnail view
    const [lightbox, setLightbox] = useState<{
      runId: string;
      highlightIds: string[];
      index: number;
    } | null>(null);

    //For creating a run
    const [creating, setCreating] = useState<boolean>(false);

    //For rename modal
    //const [editingRunId, setEditingRunId] = useState<string | null>(null);
    //const [renameValue, setRenameValue] = useState<string>("");
  
    //For visibility dropdown
    const [visibilityMenuFor, setVisibilityMenuFor] = useState<string | null>(
        null
    );

    //For invite link feedback
    const [inviteBusyFor, setInviteBusyFor] = useState<string | null>(null);
    const [inviteCopiedFor, setInviteCopiedFor] = useState<string | null>(null);

    //12-11-25 Thursday 8pm - For visibility change warning modal
    //For "make public" warning modal
    const [visibilityWarningOpen, setVisibilityWarningOpen] = useState(false);
    const [pendingVisibility, setPendingVisibility] = useState<{
      run: RunsSummary | null;
      visibility: RunVisibility | null;
    }>({
      run: null,
      visibility: null,
    });

    //12-11-25 Thursday 7:30pm - For my runs page — accepts name directly (used by modal)
    const [pendingConfirmAction, setPendingConfirmAction] = useState<null | (() => Promise<void>)>(null);

    //12-11-25 Thursday 7:30pm - Better polished Invite Link button Modal for my-runs page
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteUrl, setInviteUrl] = useState("");
    
    //12-11-25 Thursday 7:30pm - Better polished Create a Run button Modal for my-runs page
    const [createModalOpen, setCreateModalOpen] = useState(false);

    //12-16-25 Tuesday 9:30pm - Run Settings Modal for my-runs page
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsRun, setSettingsRun] = useState<RunsSummary | null>(null);
    const [settingsSaving, setSettingsSaving] = useState(false);

    //12-21-25 Sunday 6am - Build dropdown menu options for the run settings modal in my-runs page
    const settingsHighlightOptions =
    (settingsRun?.highlightIds ?? []).map((hId) => {
      const meta = highlightMap[hId];
      return {
        id: hId,
        label: meta?.title || meta?.originalFileName || hId,
        thumbUrl: meta?.signedUrl, //optional: lets the modal preview the thumbnail choice
      };
    });


    //12-16-25 Tuesday 9:30pm - Run Settings Modal save handler
    async function saveRunSettings(draft: RunSettingsDraft) {
      if (!settingsRun) return;

      const selectedThumb =
      settingsHighlightOptions.find(
        (o) => o.id === (draft.publicThumbnailHighlightId ?? "")
      )?.thumbUrl || "";

      const patch: any = {
        maxMembers: draft.maxMembers ?? null,
        location: draft.location ?? "",
        allowComments: !!draft.allowComments,
        allowInviteLinks: !!draft.allowInviteLinks,
        pinnedMessage: draft.pinnedMessage ?? "",
        visibility: draft.visibility,
        featuredHighlightId: draft.featuredHighlightId ?? "",
        publicThumbnailHighlightId: draft.publicThumbnailHighlightId ?? "",
        publicThumbnailUrl: selectedThumb,
        name: draft.name?.trim() || settingsRun.name,
      };
    
      const doSave = async () => {
        try {
          setSettingsSaving(true);
          const updated = await apiUpdateRun(settingsRun.runId, patch);
    
          setRuns((prev) => prev.map((r) => (r.runId === updated.runId ? updated : r)));
          setSettingsRun(updated);
          setSettingsOpen(false);
        } catch (e: any) {
          alert(e?.message || "Failed to save run settings.");
        } finally {
          setSettingsSaving(false);
        }
      };
    
      //if switching to public from non-public, reuse warning modal
      if (draft.visibility === "public" && settingsRun.visibility !== "public") {
        setPendingConfirmAction(() => doSave);
        setVisibilityWarningOpen(true);
        return;
      }
    
      await doSave();
    }
    
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
        //if (!userEmail) return;
        //wait until auth is ready and we have an email
        if (!backendReady) {
            //optional debug log
            console.log("MyRuns loadRuns skipped (backend not ready yet)", {
                status,
                userEmail,
            });
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const items = await apiListRuns(userEmail);
            setRuns(items);

          } catch (err: any) {
            //treat aborted fetches as non-errors
            if (isAbortError(err)) {
              console.debug("MyRuns loadRuns aborted, ignoring");
              return;
            }
            //real error handling + state reset
            console.error("MyRuns apiListRuns error", err);
            setError(err?.message || "Failed to load runs.");
        setRuns([]);
        } finally {
        setLoading(false);
        }
    }, [backendReady, status, userEmail]);

    //11-30-25 Sunday 1:30pm - Added polling useEffect - polling to keep in sync with uploads + assignments
    //Poll runs so /my-runs updates instantly after uploads or assignments
    //Single-shot effect – no polling, no twitch
    useEffect(() => {
      if (!userEmail || !backendReady) return; //guard

      let cancelled = false; 

      const tick = async () => {
        if (cancelled) return;         
        try {
          await loadRuns();             //reuse loader
        } catch (err) {
          //ignore aborts, log real errors
          if (isAbortError(err)) return;
          console.error("MyRuns load error", err);
        }
      };

      //run once whenever deps change (auth becomes ready, userEmail changes)
      tick();

      return () => {
        cancelled = true;              
      };
    }, [userEmail, backendReady, loadRuns]); //dependency/deps array

    //12-01-25 Monday 4pm - Load highlight metadata for mapping IDs to names
    useEffect(() => {
      if (!backendReady || !userEmail) return;
    
      let cancelled = false;
    
      const loadHighlightMetadata = async () => {
        try {
          const url = `${API_BASE}/highlights?ownerEmail=${encodeURIComponent(
            userEmail
          )}&limit=500`;
          const r = await fetch(url, { cache: "no-store" });
    
          if (!r.ok) {
            const text = await r.text().catch(() => "");
            throw new Error(
              `Failed to load highlights: ${r.status} ${r.statusText} ${text}`
            );
          }
    
          const data = await r.json();
          const items = Array.isArray(data?.items)
            ? (data.items as HighlightSummary[])
            : [];
    
          if (cancelled) return;
    
          const map: Record<string, HighlightSummary> = {};
          for (const h of items) {
            if (h.jobId) {
              map[h.jobId] = h;
            }
          }
          setHighlightMap(map);
        } catch (err: any) {
          if (isAbortError(err)) {
            console.debug("MyRuns load highlights aborted, ignoring");
            return;
          }
          console.error("MyRuns load highlights error", err);
          //We can silently fall back to showing raw IDs if this fails
        }
      };
    
      loadHighlightMetadata();
    
      return () => {
        cancelled = true;
      };
    }, [backendReady, userEmail]);    

      //12-11-25 Tuesday 7:30pm - For my runs page — accepts name directly (used by modal)
      const handleCreateRun = async (name: string) => {
        if (!userEmail) return;
        if (!name.trim()) return;

        try {
          setCreating(true);
          const run = await apiCreateRun(userEmail, name.trim(), "private");
          setRuns((prev) => [run, ...prev]);
        } catch (e: any) {
          alert(e?.message || "Failed to create run.");
        } finally {
          setCreating(false);
        }
      };

      // const openRenameModal = (run: RunsSummary) => {
      //   setEditingRunId(run.runId);
      //   setRenameValue(run.name);
      // };
    
      // const cancelRename = () => {
      //   setEditingRunId(null);
      //   setRenameValue("");
      // };
    
      // const saveRename = async () => {
      //   if (!editingRunId || !renameValue.trim()) return;
      //   try {
      //     const updated = await apiUpdateRun(editingRunId, {
      //       name: renameValue.trim(),
      //     });
      //     setRuns((prev) =>
      //       prev.map((r) => (r.runId === updated.runId ? updated : r))
      //     );
      //     cancelRename();
      //   } catch (e: any) {
      //     alert(e?.message || "Failed to rename run.");
      //   }
      // };
    
      //updateVisibility()- no UI - helper that really talks to the backend
      const updateVisibility = async (
        run: RunsSummary,
        visibility: RunVisibility
      ) => {
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

      //Main handler used by your visibility menu
      const changeVisibility = async (
        run: RunsSummary,
        visibility: RunVisibility
      ) => {
        if (run.visibility === visibility) {
          setVisibilityMenuFor(null);
          return;
        }

        //If switching to public, open the nice modal instead of window.confirm()
        if (visibility === "public") {
          setPendingVisibility({ run, visibility });
          setVisibilityWarningOpen(true);
          //close the little dropdown immediately
          setVisibilityMenuFor(null);
          return;
        }

        //Any non-public change can go straight through
        await updateVisibility(run, visibility);
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

      //12-11-25 Thursday 8pm - For my runs page - “Open settings” helper function
      function openRunSettings(run: RunsSummary) {
        setSettingsRun(run);
        setSettingsOpen(true);
      }
      
      //12-09-25 Tuesday 1pm - Thumbnails in my-runs page
      const toggleRunThumbnails = (runId: string) => {
        setExpandedRuns((prev) => ({
          ...prev,
          [runId]: !prev[runId],
        }));
      };
      

      //Guard the whole main UI - If you want to avoid showing the “Failed to load runs” message while auth is still loading, you can gate the render.
      if (status === "loading") {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500 text-sm">Loading your runs…</p>
          </div>
        );
      }
      
      if (!backendReady) {
        //Not authenticated: you could redirect, or show a message.
        //For now just show nothing / a simple message.
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500 text-sm">Please sign in to view your runs.</p>
          </div>
        );
      }
//11-23-25 Sunday 11am - For my runs page

//============================ Actions (END) ============================

//============================ RENDER UI (START)============================
return (
    <div className="min-h-screen bg-gray-50">
      {/*Header (same as Dashboard page) –UI */}
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
        {/*Page title – expanded actions */}
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

          {/*Join a Run + Create a Run actions – replaces single button layout */}
          <div className="flex items-center gap-3">     
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              onClick={() => router.push("/join-a-run")}
            >
              <DribbleIcon2 className="w-5 h-5" />
              Join a Run
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
              onClick={() => setCreateModalOpen(true)}
              disabled={creating || !userEmail}
            >
              <Plus className="w-5 h-5" />
              {creating ? "Creating…" : "Create a Run"}
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700"
              onClick={() => router.push("/dashboard")}
            >
              <User className="w-5 h-5" />
              Dashboard
            </button>
          </div>
        </header>

        {/*=== My Runs gallery === richer content */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DribbleIcon className="w-7 h-7 text-purple-600" />
              <h2 className="text-lg font-semibold">My Runs</h2>
            </div>

            {/*Secondary Join for small screens – text updated */}
            {/* <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs md:text-sm text-gray-800 hover:bg-gray-50"
              onClick={() => router.push("/join-a-run")}
            >
              <Globe2 className="w-4 h-4" />
              Join a Run
            </button> */}
          </div>

          {/*loading / error / empty - text updated */}
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
                    {/*Top row: name + owner + visibility + delete – richer header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <DribbleIcon className="w-5 h-5 text-purple-600 mt-1" />
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
                        {/*visibility dropdown*/}
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

                        {/*settings + rename + delete*/}
                        <div className="flex items-center gap-2">
                          {owned && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => openRunSettings(run)}
                            >
                              <Settings className="w-3 h-3" />
                              Settings
                            </button>
                        )}
                        {/* <div className="flex items-center gap-2"> */}
                          {/* {owned && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => openRenameModal(run)}
                            >
                              <Pencil className="w-3 h-3" />
                              Rename
                            </button>
                          )} */}
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
                        {/* </div> */}
                      </div>
                    </div>
                  </div>

                    {/*body copy – updated text */}
                    <p className="text-xs text-gray-500">
                      In a later step, this card will show the latest
                      highlight videos for this run plus a comment stream
                      for your squad.
                    </p>

                    {/*meta rows: members + highlights + invite */}
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
                        <DribbleIcon className="w-4 h-4 text-purple-600" />
                        <span>
                          {videoCount === 1
                            ? "1 highlight"
                            : `${videoCount} highlights`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        onClick={async () => {
                          try {
                            setInviteBusyFor(run.runId);
                            const url = await apiInviteRun(run.runId);
                            setInviteUrl(url);
                            setInviteOpen(true);
                          } catch (err:any) {
                            alert(err?.message || "Failed to create invite link.");
                          } finally {
                            setInviteBusyFor(null);
                          }
                        }}
                        disabled={!!inviteBusyFor}
                      >
                        <LinkIcon className="w-3 h-3" />
                        Invite link
                      </button>
                    </div>

                    {/*Members list */}
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

                    {/*12-09-25 Tuesday 1pm - Add thumbnails to my-runs page */}
                    {(run.highlightIds?.length || 0) > 0 && (
                      <div className="mt-3 border-t pt-2">
                        {/*header row: label + chevron toggle */}
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-semibold text-gray-500">
                            Highlights
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleRunThumbnails(run.runId)}
                            className="inline-flex items-center rounded-full px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                          >
                            <span className="mr-1">
                              {(expandedRuns[run.runId] ?? false)
                                ? "Hide thumbnails"
                                : "Show thumbnails"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform",
                                (expandedRuns[run.runId] ?? false) && "rotate-180"
                              )}
                            />
                          </button>
                        </div>

                        {/*always show labels as chips */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {run.highlightIds?.map((hId) => {
                            const meta = highlightMap[hId];
                            const label = meta?.title || meta?.originalFileName || hId;

                            return (
                              <span
                                key={hId}
                                className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-mono text-orange-700"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>

                        {/*when expanded, show a horizontal strip of thumbnails (0s frame) */}
                        {(expandedRuns[run.runId] ?? false) && (
                          <div className="mt-2 overflow-x-auto">
                            <div className="flex gap-3 pb-2">
                              {run.highlightIds?.map((hId, idx) => {
                                const meta = highlightMap[hId];
                                const label = meta?.title || meta?.originalFileName || hId;
                                const thumbUrl = meta?.signedUrl;

                                if (!thumbUrl) return null;

                                return (
                                  <div
                                    key={hId}
                                    className="flex-shrink-0 w-40"
                                  >
                                    {/*title above thumbnail */}
                                    <div className="text-[11px] font-mono text-gray-600 mb-1 truncate">
                                      {label}
                                    </div>

                                    {/*thumbnail as tiny video frame (no controls) */}
                                    <button
                                      type="button"
                                      className="block focus:outline-none"
                                      onClick={() =>
                                        setLightbox({
                                          runId: run.runId,
                                          highlightIds: run.highlightIds ?? [],
                                          index: idx,
                                        })
                                      }
                                    >
                                      <video
                                        src={thumbUrl}
                                        className="w-40 h-24 rounded-md border border-gray-200 object-cover"
                                        preload="metadata"
                                        muted
                                        playsInline
                                      />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )} {/*12-09-25 Tuesday 1pm - Add thumbnails to my-runs page */}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/*12-09-25 Tuesday 1pm - Lightbox for thumbnails */}
        {lightbox &&
          (() => {
            const { runId, highlightIds, index } = lightbox;
            const ids = highlightIds || [];
            if (!ids.length) return null;

            const currentId = ids[index] ?? ids[0];
            const meta = currentId ? highlightMap[currentId] : undefined;
            const label =
              meta?.title || meta?.originalFileName || currentId;
            const url = meta?.signedUrl;

            if (!url) return null;

            const go = (dir: "prev" | "next") => {
              setLightbox((prev) => {
                if (!prev) return prev;
                const list = prev.highlightIds || [];
                if (!list.length) return prev;
                let nextIndex = prev.index + (dir === "next" ? 1 : -1);
                if (nextIndex < 0) nextIndex = list.length - 1;
                if (nextIndex >= list.length) nextIndex = 0;
                return { ...prev, index: nextIndex };
              });
            };

            return (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                <div className="relative w-full max-w-4xl mx-4 bg-black rounded-lg overflow-hidden">
                  {/*close button */}
                  <button
                    type="button"
                    className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                    onClick={() => setLightbox(null)}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/*label */}
                  <div className="px-4 pt-3 pb-2 text-sm text-gray-100">
                    {label}
                  </div>

                  {/*video at full size */}
                  <div className="relative flex items-center justify-center bg-black">
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black"
                      onClick={() => go("prev")}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <video
                      src={url}
                      className="max-h-[70vh] w-full object-contain"
                      controls
                      autoPlay
                    />

                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black"
                      onClick={() => go("next")}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/*12-11-25 Tuesday 7:30pm - the Create Run Modal – overlay */}
        <CreateRunModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreate={async (name) => {
            await handleCreateRun(name);
            setCreateModalOpen(false);
          }}
        />

        {/*12-11-25 Tuesday 7:30pm - the Invite Link Modal – overlay */}
        <InviteLinkModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          url={inviteUrl}
        />

        {/*12-11-25 Tuesday 8pm - the Visibility Warning Modal – when changing from Private (default) to Public */}
        {/* Visibility Warning Modal – Private → Public */}
        <VisibilityWarningModal
          open={visibilityWarningOpen}
          onCancel={() => {
            setVisibilityWarningOpen(false);
            setPendingVisibility({ run: null, visibility: null });
            setPendingConfirmAction(null);
          }}
          onConfirm={async () => {
            //close modal first
            setVisibilityWarningOpen(false);

            //1) if we were confirming a deferred "save settings" action, run it
            const action = pendingConfirmAction;
            setPendingConfirmAction(null);
            if (action) {
              await action();
              return;
            }

            //2) otherwise fall back to the standard visibility dropdown flow
            if (!pendingVisibility.run || !pendingVisibility.visibility) return;
            await updateVisibility(pendingVisibility.run, pendingVisibility.visibility);
            setPendingVisibility({ run: null, visibility: null });
          }}
        />

        {/*12-16-25 Tuesday 9:30pm - the Run Settings Modal Modal - for the owner to set rules and settings of a run*/}
        <RunSettingsModal
          open={settingsOpen}
          saving={settingsSaving}
          runName={settingsRun?.name || "Run"}
          initial={{
            visibility: (settingsRun?.visibility || "private") as any,
            maxMembers: settingsRun?.maxMembers ?? null,
            location: settingsRun?.location ?? "",
            allowComments: settingsRun?.allowComments ?? true,
            allowInviteLinks: settingsRun?.allowInviteLinks ?? true,
            pinnedMessage: settingsRun?.pinnedMessage ?? "",
            featuredHighlightId: settingsRun?.featuredHighlightId ?? "",
            publicThumbnailHighlightId: settingsRun?.publicThumbnailHighlightId ?? "",
          }}
          onClose={() => {
            setSettingsOpen(false);
            setSettingsRun(null);
          }}
          onSave={(draft) => {
            void saveRunSettings(draft); 
          }}
          highlightOptions={settingsHighlightOptions} 
        />

        {/*the rename "modal" – overlay */}
        {/* {editingRunId && (
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
        )}  */}
      </main>
    </div>
  );
}
//============================ RENDER UI (END)============================
