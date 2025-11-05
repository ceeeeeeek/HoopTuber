// client/app/dashboard/HighlightsSection.tsx - Tuesday 11-04-25 Version 7:50pm
// You need to fetch from FastAPI directly instead of /api/highlightVideos
// If your dashboard is not populated with highlight videos that means your dashboard is calling the old
// Next API route which does not return any items of /api/highlightVideos. 
// Instead we want to call FastAPI directly from the dashboard to get the highlight videos.
"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type HighlightItem = {
  jobId: string;
  originalFileName?: string;
  title?: string;
  finishedAt?: string;
  signedUrl?: string;     
  outputGcsUri?: string; 
  status?: string;        
};

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

export default function HighlightsSection() {
  const { data: session } = useSession();

  const [items, setItems]   = React.useState<HighlightItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState<string | null>(null);

  //lets you click “Refresh” without reloading the page
  const [bump, setBump] = React.useState(0);

  React.useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        //call FastAPI directly (not Next API)
        const url =
          `${API_BASE.replace(/\/+$/, "")}/highlights` +
          `?ownerEmail=${encodeURIComponent(email)}` +
          `&limit=100&signed=true`;

        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`GET /highlights ${r.status}: ${txt}`);
        }

        const data = await r.json();
        //FastAPI returns { items: [...] } — read from data.items
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
      } catch (e: any) {
        console.error("Failed to load highlights:", e);
        setItems([]);
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [session?.user?.email, bump]); // PRESERVED + NEW bump

  //manual refresh
  const onRefresh = () => setBump((n) => n + 1);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Highlight Videos</h3>
        {/*a tiny refresh button */}
        <button
          onClick={onRefresh}
          className="text-sm px-3 py-1 rounded bg-neutral-100 hover:bg-neutral-200"
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading your highlights…</p>}
      {error && <p className="text-red-600">Couldn’t load highlights: {error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="border rounded p-6 text-center text-sm text-neutral-600">
          No highlight videos yet.
          <div className="mt-3">
            <Link
              href="/upload"
              className="inline-block rounded bg-orange-500 text-white px-4 py-2"
            >
              Go to Upload
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((h) => (
            <li key={h.jobId} className="border rounded overflow-hidden">
              {/*simple video preview — prefer signedUrl if present */}
              <div className="relative aspect-video bg-black">
                <video
                  src={h.signedUrl ?? undefined}
                  controls
                  className="w-full h-full"
                />
              </div>

              <div className="p-3">
                <div className="text-sm font-medium truncate">
                  {h.title || h.originalFileName || h.jobId}
                </div>
                <div className="text-xs text-neutral-500">
                  {h.finishedAt ? new Date(h.finishedAt).toLocaleString() : ""}
                </div>

                {/*simple Rename/Delete (works with your backend) */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => {
                      const newTitle = prompt("New name?", h.title || h.originalFileName || "");
                      if (!newTitle) return;
                      const r = await fetch(`${API_BASE.replace(/\/+$/, "")}/highlights/${h.jobId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: newTitle }), // NEW
                      });
                      if (r.ok) onRefresh();
                      else alert("Rename failed");
                    }}
                    className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200"
                  >
                    Rename
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm("Delete this highlight?")) return;
                      const r = await fetch(`${API_BASE.replace(/\/+$/, "")}/highlights/${h.jobId}`, {
                        method: "DELETE",
                      });
                      if (r.ok) onRefresh();
                      else alert("Delete failed");
                    }}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
