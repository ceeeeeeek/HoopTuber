//client/app/app-components/WarmAuthServer.tsx - Wednesday 10-22-25 Update
//This is for server warm-up of nextauth to assist with dev mode only (Not that important for production mode)
//WarmAuthServer.tsx makes server warm-up runs before hydration, guaranteeing the dev server compiles /api/auth/[...nextauth] on the initial request.
//WarmAuthServer.tsx to do an absolute, no-cache fetch during SSR. 
//This forces Next to compile /api/auth/[...nextauth] before hydration and before the user can click anything.

import { headers } from "next/headers";

export default async function WarmAuthServer() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto =
      h.get("x-forwarded-proto") ??
      (host?.startsWith("localhost") ? "http" : "https");

    const absolute = `${proto}://${host}/api/auth/session`;

    //Force compile + bypass any cache
    await fetch(absolute, {
      method: "GET",
      cache: "no-store",
      //The `next` key silences Static Optimization and forces runtime fetch
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    }).catch(() => {});
  } catch {
    //swallow — this should never block the page
  }
  return null;
}