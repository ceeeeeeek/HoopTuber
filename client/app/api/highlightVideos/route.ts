//client/app/api/highlightVideos/route.ts - Wednesday 10-22-25 Update
//GET → fetch highlights for a video/user.
//POST → insert new highlight data into "highlights" collection.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import {
  listHighlights,       
  createHighlight,
  updateHighlight,
  deleteHighlight,
  HighlightDoc,
} from "@/lib/server/firestore";

// GET /api/highlightVideos?limit=50
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me?.email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "50");

  //listHighlights
  const highlights = await listHighlights(me.email, isNaN(limit) ? 50 : Math.min(limit, 200));
  return NextResponse.json({ success: true, highlights });
}

// POST /api/highlightVideos
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me?.email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Partial<HighlightDoc> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid json" }, { status: 400 });
  }

  const created = await createHighlight(me.email, {
    jobId: String(body.jobId || ""),
    downloadUrl: String(body.downloadUrl || ""),
    title: (body.title as string | null) ?? null,
    isPublic: Boolean(body.isPublic ?? false),
    stats: body.stats || null,
  });

  return NextResponse.json({ success: true, highlight: created });
}

// PUT /api/highlightVideos
export async function PUT(req: Request) {
  const me = await getSessionUser();
  if (!me?.email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid json" }, { status: 400 });
  }

  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  const patch: Partial<HighlightDoc> = {};
  if (typeof body.downloadUrl === "string") patch.downloadUrl = body.downloadUrl;
  if (typeof body.title === "string" || body.title === null) patch.title = body.title ?? null;
  if (typeof body.isPublic === "boolean") patch.isPublic = body.isPublic;
  if (typeof body.stats === "object") patch.stats = body.stats;

  const updated = await updateHighlight(me.email, id, patch);
  if (!updated) {
    return NextResponse.json({ success: false, error: "not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json({ success: true, highlight: updated });
}

// DELETE /api/highlightVideos?id=abc123
export async function DELETE(req: Request) {
  const me = await getSessionUser();
  if (!me?.email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") || "");
  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  const ok = await deleteHighlight(me.email, id);
  if (!ok) {
    return NextResponse.json({ success: false, error: "not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
