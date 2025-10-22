//client/app/api/rawVideos/route.ts - Wednesday 10-22-25 Update
// GET → fetch videos for a user.
// POST → insert new uploaded video metadata into "raw" collection.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import {
  listRaw,           
  createRaw,
  updateRaw,
  deleteRaw,
  RawVideoDoc,
} from "@/lib/server/firestore";

// GET /api/rawVideos?limit=50
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me?.email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "50");

  //listRaw
  const videos = await listRaw(me.email, isNaN(limit) ? 50 : Math.min(limit, 200));
  return NextResponse.json({ success: true, videos });
}

// POST /api/rawVideos
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me?.email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Partial<RawVideoDoc> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid json" }, { status: 400 });
  }

  const payload = {
    url: String(body.url || ""),
    fileName: String(body.fileName || "video.mp4"),
    uploadedAtIso: String(body.uploadedAtIso || new Date().toISOString()),
    size: Number(body.size || 0),
    duration: Number(body.duration || 0),
    processed: Boolean(body.processed ?? false),
    highlightCount: Number(body.highlightCount || 0),
  };

  if (!payload.url) {
    return NextResponse.json({ success: false, error: "url required" }, { status: 400 });
  }

  const created = await createRaw(me.email, payload);
  return NextResponse.json({ success: true, video: created });
}

// PUT /api/rawVideos
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

  const patch: Partial<RawVideoDoc> = {};
  if (typeof body.processed === "boolean") patch.processed = body.processed;
  if (typeof body.highlightCount === "number") patch.highlightCount = body.highlightCount;
  if (typeof body.fileName === "string") patch.fileName = body.fileName;

  const updated = await updateRaw(me.email, id, patch);
  if (!updated) {
    return NextResponse.json({ success: false, error: "not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json({ success: true, video: updated });
}

// DELETE /api/rawVideos?id=abc123
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

  const ok = await deleteRaw(me.email, id);
  if (!ok) {
    return NextResponse.json({ success: false, error: "not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
