"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, MapPin, Users, Settings2, Pencil, Lock, Eye, Link as LinkIcon } from "lucide-react";

type RunVisibility = "public" | "private" | "unlisted";

type HighlightOption = {
    id: string;
    label: string;
    thumbUrl?: string;
  };
  
export type RunSettingsDraft = {
  maxMembers?: number | null;
  location?: string;
  visibility?: RunVisibility;
  allowComments?: boolean;
  allowInviteLinks?: boolean;
  pinnedMessage?: string;
  featuredHighlightId?: string;
  publicThumbnailHighlightId?: string;
  name?: string;
};

export default function RunSettingsModal({
  open,
  saving,
  runName,
  initial,
  onClose,
  onSave,
  highlightOptions,
}: {
  open: boolean;
  saving?: boolean; 
  runName: string;
  initial: RunSettingsDraft;
  onClose: () => void;
  onSave: (draft: RunSettingsDraft) => void;
  highlightOptions?: HighlightOption[];
}) {
    const [name, setName] = useState("");
    const [maxMembersText, setMaxMembersText] = useState<string>("");
    const [location, setLocation] = useState("");
    const [visibility, setVisibility] = useState<RunVisibility>("private");
    const [allowComments, setAllowComments] = useState(false);
    const [allowInviteLinks, setAllowInviteLinks] = useState(false);

    //“future” fields (still saved if you want)
    const [pinnedMessage, setPinnedMessage] = useState("");
    const [featuredHighlightId, setFeaturedHighlightId] = useState("");
    const [publicThumbnailHighlightId, setPublicThumbnailHighlightId] = useState("");

    useEffect(() => {
        if (!open) return;

        setName(initial.name || runName || "");
        setVisibility((initial.visibility as RunVisibility) || "private");

        setMaxMembersText(
        typeof initial.maxMembers === "number" && Number.isFinite(initial.maxMembers)
            ? String(initial.maxMembers)
            : ""
        );
        setLocation(initial.location || "");
        setAllowComments(!!initial.allowComments);
        setAllowInviteLinks(!!initial.allowInviteLinks);

        setPinnedMessage(initial.pinnedMessage || "");
        setFeaturedHighlightId(initial.featuredHighlightId || "");
        setPublicThumbnailHighlightId(initial.publicThumbnailHighlightId || "");
    }, [open, initial, runName]);

    const parsedMaxMembers = useMemo(() => {
        const n = Number(maxMembersText);
        if (!maxMembersText.trim()) return null;
        if (!Number.isFinite(n) || n <= 0) return NaN;
        return Math.floor(n);
    }, [maxMembersText]);

    if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 pt-8 shadow-xl">
        {/*Floating icon */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
            <Settings2 className="h-7 w-7" />
          </div>
        </div>

        {/*Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Run Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure what everyone sees on the <span className="font-medium">Join a Run page</span>.
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Run: <span className="font-medium">{runName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/*Body */}
        <div className="mt-5 space-y-4">
        {/* Rename (NEW) */}
            <div>
                <label className="block text-xs font-medium text-gray-700">Run name</label>
                    <div className="mt-1 relative">
                        <Pencil className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Friday Run"
                        className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                        />
                    </div>
            </div>
          {/*Max members */}
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Maximum members
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={maxMembersText}
                  onChange={(e) => setMaxMembersText(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
            {Number.isNaN(parsedMaxMembers) && (
              <p className="mt-1 text-xs text-red-600">Enter a positive number.</p>
            )}
          </div>

          {/*Visibility */}
          {/* <div>
            <label className="block text-xs font-medium text-gray-700">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as RunVisibility)}
              className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
            <p className="mt-1 text-[11px] text-gray-500">
              Public runs appear on <span className="font-medium">Join a Run</span>.
            </p>
          </div> */}
            <div>
                <label className="block text-xs font-medium text-gray-700">Visibility</label>

                <div className="mt-1 relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                    {visibility === "private" ? (
                        <Lock className="h-4 w-4" />
                    ) : visibility === "unlisted" ? (
                        <LinkIcon className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                    </span>

                    <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as RunVisibility)}
                    className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm shadow-sm"
                    >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                    </select>
                </div>

                <p className="mt-1 text-[11px] text-gray-500">
                    Public runs appear on <span className="font-medium">Join a Run</span>.
                </p>
            </div>

          {/*Location */}
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Gym location (optional)
            </label>
            <div className="mt-1 relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Maple Rec Center"
                className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>

          {/*Toggles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
              />
              Allow comments
            </label>

            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={allowInviteLinks}
                onChange={(e) => setAllowInviteLinks(e.target.checked)}
              />
              Allow invite links
            </label>
          </div>

          {/*Future fields (still saved) */}
            <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700">Social</p>

                <div>
                    <label className="block text-xs font-medium text-gray-700">
                        Owner pinned message / announcements
                    </label>
                    <textarea
                        value={pinnedMessage}
                        onChange={(e) => setPinnedMessage(e.target.value)}
                        placeholder="e.g. Games start at 7pm. Bring a light + dark shirt."
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
                        rows={3}
                    />
                </div>

                {/*Dropdown selectors instead of free-text highlight IDs */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/*Featured highlight (members-only later; we only store the selection now) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700">
                        Featured highlight (members only)
                        </label>

                        <select
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                        value={featuredHighlightId || ""}
                        onChange={(e) => setFeaturedHighlightId(e.target.value)}
                        >
                        <option value="">None</option>
                        {(highlightOptions ?? []).map((opt) => (
                            <option key={opt.id} value={opt.id}>
                            {opt.label}
                            </option>
                        ))}
                        </select>

                        <p className="mt-1 text-[11px] text-gray-500">
                        Members will see this after joining.
                        </p>
                    </div>

                    {/*Public thumbnail highlight (public-facing on Join a Run) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700">
                        Public thumbnail highlight
                        </label>

                        <select
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                        value={publicThumbnailHighlightId || ""}
                        onChange={(e) => setPublicThumbnailHighlightId(e.target.value)}
                        >
                        <option value="">None</option>
                        {(highlightOptions ?? []).map((opt) => (
                            <option key={opt.id} value={opt.id}>
                            {opt.label}
                            </option>
                        ))}
                        </select>

                        {/*Optional: show a tiny preview if we have a signedUrl */}
                        {(() => {
                        const chosen = (highlightOptions ?? []).find(
                            (x) => x.id === publicThumbnailHighlightId
                        );
                        if (!chosen?.thumbUrl) return null;
                        return (
                            <div className="mt-2">
                            <video
                                src={chosen.thumbUrl}
                                className="h-20 w-full rounded-md border object-cover"
                                preload="metadata"
                                muted
                                playsInline
                            />
                            <p className="mt-1 text-[11px] text-gray-500">Preview</p>
                            </div>
                        );
                        })()}
                    </div>
                </div>
            </div>
        </div>

        {/*Footer */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={!!saving}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({
                name: name.trim(),
                maxMembers: Number.isNaN(parsedMaxMembers) ? undefined : parsedMaxMembers,
                location: location.trim() || "",
                visibility,
                allowComments,
                allowInviteLinks,
                pinnedMessage: pinnedMessage.trim(),
                featuredHighlightId: featuredHighlightId.trim(),
                publicThumbnailHighlightId: publicThumbnailHighlightId.trim(),
              });
            }}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            {saving ? "Saving..." : "Save Run Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
