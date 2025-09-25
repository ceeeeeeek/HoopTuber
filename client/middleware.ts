//middleware.ts (Wednesday 09-24-25 Version)
//middleware.ts - When not logged in, manually typing localhost:3000/upload in the browser will redirect to /login?next=/upload

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const sid = req.cookies.get("connect.sid")?.value;

  // If no session cookie at all → definitely not logged in
  if (!sid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Validate the session by calling your Node /api/me
  try {
    const r = await fetch(`${req.nextUrl.origin}/api/me`, {
      // forward just the session cookie
      headers: { cookie: `connect.sid=${sid}` },
      // avoid caching any auth checks
      cache: "no-store",
    });

    if (r.status !== 200) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  } catch {
    // If the check fails for any reason, be safe and require login
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Auth OK → continue to /upload
  return NextResponse.next();
}

// Only run this middleware for /upload (and any nested paths)
export const config = {
  matcher: ["/upload/:path*"],
};
