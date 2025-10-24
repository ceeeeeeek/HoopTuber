//client/app/api/analysis/start/route.ts - Thursday 10-23-25 Version
//Purpose of client/app/api/analysis/start/route.ts -
//we want FastAPI to know who is uploading so it can stamp ownerEmail on the Job/Raw documents. 
//The Next.js route runs on the server, reads the session, and forwards the email in a header
//How client/app/api/analysis/start/route.ts is used:
//From your client, POST to /api/analysis/start instead of talking to FastAPI directly.
//This ensures the user must be signed in, and their email is forwarded as x-owner-email, which we read in FastAPI’s /upload via Header(...).
//Without this hop, you’d be trusting the browser to tell your API who the user is. The server-to-server hop keeps the identity trustworthy.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // IMPORTANT: make sure process.env.API_BASE points at your FastAPI,
  // e.g. NEXT_PUBLIC_API_BASE=http://localhost:8000 in .env (backend running)
  const r = await fetch(process.env.NEXT_PUBLIC_API_BASE + "/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-email": session.user.email,      // <- forwarded identity
    },
    body: JSON.stringify(body),
  });

  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
