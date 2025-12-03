//client/lib/server/session.ts - 10-22-25 Wednesday Update
//single place to get the session user (email + id/uid).

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

export type SessionUser = {
  email: string | null;
  uid: string | null;
  name: string | null;
};

/**
 * Reads the NextAuth session on the server and returns a small, stable shape.
 * Returns null if unauthenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    //In App Router, getServerSession(authOptions) works without req/res.
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    //prefer a normalized/stable email field
    const email = (session.user.email ?? null) as string | null;

    //if you ever add a stable id to the JWT, map it here; keep null for now
    const uid = (session as any)?.user?.id ?? null;

    return {
      email,
      uid,
      name: (session.user.name ?? null) as string | null,
    };
  } catch {
    return null;
  }
}

