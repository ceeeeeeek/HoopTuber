//client/lib/server/firestore.ts - Wednesday 10-22-25 Update
//Centralized Firestore client using hooptuberdev.json.
//Exports helpers for rawVideos and highlightVideos collections.

// client/lib/server/firestore.ts
import { Firestore, FieldValue, Timestamp } from "@google-cloud/firestore";

// Re-use your env wiring (already present in users.ts)
const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Helpers
const toEmailKey = (e: string) => String(e || "").trim().toLowerCase();
//const RAW = () => firestore.collection("Raw");
const HIGHLIGHTS = () => firestore.collection("Highlights");

type FireDate = Timestamp | FieldValue;

// ---- DB Shapes (server-side) ----
// export type RawVideoDoc = {
//   id: string;
//   ownerEmail: string;
//   url: string;
//   fileName: string;
//   size: number;
//   duration: number;
//   processed?: boolean;
//   highlightCount?: number;
//   uploadedAtIso: string;   // normalized for API responses
//   createdAtIso: string;    // normalized for API responses
//   // The actual stored fields in Firestore also have:
//   // createdAt: FireDate; updatedAt: FireDate; uploadedAtIso: string;
// };

export type HighlightDoc = {
  id: string;
  ownerEmail: string;
  jobId: string;
  downloadUrl: string;
  title?: string | null;
  isPublic?: boolean;
  createdAtIso: string;
  stats?: {
    totalShots: number;
    madeShots: number;
    shootingPercentage: number;
  } | null;
};

// Normalize Firestore Timestamp | FieldValue to ISO string (best effort)
const toIso = (v: unknown): string => {
  if (v && typeof v === "object" && "toDate" in (v as any)) {
    // Timestamp
    try {
      // @ts-ignore
      return ((v as Timestamp).toDate() as Date).toISOString();
    } catch {}
  }
  return new Date().toISOString();
};

// // ---- RAW: list/create/update/delete ----
// export async function listRaw(ownerEmail: string, limit = 50): Promise<RawVideoDoc[]> {
//   const snap = await RAW()
//     .where("ownerEmail", "==", toEmailKey(ownerEmail))
//     .orderBy("uploadedAtIso", "desc")
//     .limit(limit)
//     .get();

//   return snap.docs.map((d) => {
//     const x = d.data() as any;
//     return {
//       id: d.id,
//       ownerEmail: x.ownerEmail,
//       url: x.url,
//       fileName: x.fileName,
//       size: x.size ?? 0,
//       duration: x.duration ?? 0,
//       processed: x.processed ?? false,
//       highlightCount: x.highlightCount ?? 0,
//       uploadedAtIso: x.uploadedAtIso ?? toIso(x.createdAt),
//       createdAtIso: x.createdAtIso ?? toIso(x.createdAt),
//     } as RawVideoDoc;
//   });
// }

// type CreateRawPayload = {
//   url: string;
//   fileName: string;
//   size: number;
//   duration: number;
//   uploadedAtIso?: string;
//   processed?: boolean;
//   highlightCount?: number;
// };

// export async function createRaw(ownerEmail: string, payload: CreateRawPayload): Promise<RawVideoDoc> {
//   const doc = {
//     ownerEmail: toEmailKey(ownerEmail),
//     url: payload.url,
//     fileName: payload.fileName,
//     size: payload.size ?? 0,
//     duration: payload.duration ?? 0,
//     uploadedAtIso: payload.uploadedAtIso ?? new Date().toISOString(),
//     processed: payload.processed ?? false,
//     highlightCount: payload.highlightCount ?? 0,
//     createdAt: FieldValue.serverTimestamp(),
//     updatedAt: FieldValue.serverTimestamp(),
//   };

//   const ref = await RAW().add(doc);
//   // Read it back to normalize timestamps
//   const snap = await ref.get();
//   const x = snap.data() as any;

//   return {
//     id: ref.id,
//     ownerEmail: x.ownerEmail,
//     url: x.url,
//     fileName: x.fileName,
//     size: x.size ?? 0,
//     duration: x.duration ?? 0,
//     processed: x.processed ?? false,
//     highlightCount: x.highlightCount ?? 0,
//     uploadedAtIso: x.uploadedAtIso ?? toIso(x.createdAt),
//     createdAtIso: toIso(x.createdAt),
//   };
// }

// export async function updateRaw(
//   ownerEmail: string,
//   id: string,
//   patch: Partial<Omit<CreateRawPayload, "url" | "fileName">> & { url?: string; fileName?: string }
// ): Promise<RawVideoDoc | null> {
//   const ref = RAW().doc(id);
//   const snap = await ref.get();
//   if (!snap.exists) return null;
//   const data = snap.data() as any;
//   if (toEmailKey(data.ownerEmail) !== toEmailKey(ownerEmail)) return null;

//   const next = { ...patch, updatedAt: FieldValue.serverTimestamp() };
//   await ref.update(next as any);

//   const latest = await ref.get();
//   const x = latest.data() as any;

//   return {
//     id,
//     ownerEmail: x.ownerEmail,
//     url: x.url,
//     fileName: x.fileName,
//     size: x.size ?? 0,
//     duration: x.duration ?? 0,
//     processed: x.processed ?? false,
//     highlightCount: x.highlightCount ?? 0,
//     uploadedAtIso: x.uploadedAtIso ?? toIso(x.createdAt),
//     createdAtIso: x.createdAtIso ?? toIso(x.createdAt),
//   };
// }

// export async function deleteRaw(ownerEmail: string, id: string): Promise<boolean> {
//   const ref = RAW().doc(id);
//   const snap = await ref.get();
//   if (!snap.exists) return true;
//   const data = snap.data() as any;
//   if (toEmailKey(data.ownerEmail) !== toEmailKey(ownerEmail)) return false;
//   await ref.delete();
//   return true;
// }

// ---- HIGHLIGHTS (same normalization pattern) ----
type CreateHighlightPayload = {
  jobId: string;
  downloadUrl: string;
  title?: string | null;
  isPublic?: boolean;
  stats?: HighlightDoc["stats"];
};

export async function listHighlights(ownerEmail: string, limit = 50): Promise<HighlightDoc[]> {
  const snap = await HIGHLIGHTS()
    .where("ownerEmail", "==", toEmailKey(ownerEmail))
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      id: d.id,
      ownerEmail: x.ownerEmail,
      jobId: x.jobId,
      downloadUrl: x.downloadUrl,
      title: x.title ?? null,
      isPublic: !!x.isPublic,
      createdAtIso: toIso(x.createdAt),
      stats: x.stats ?? null,
    };
  });
}

export async function createHighlight(ownerEmail: string, p: CreateHighlightPayload): Promise<HighlightDoc> {
  const doc = {
    ownerEmail: toEmailKey(ownerEmail),
    jobId: p.jobId,
    downloadUrl: p.downloadUrl,
    title: p.title ?? null,
    isPublic: p.isPublic ?? false,
    stats: p.stats ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = await HIGHLIGHTS().add(doc);
  const snap = await ref.get();
  const x = snap.data() as any;

  return {
    id: ref.id,
    ownerEmail: x.ownerEmail,
    jobId: x.jobId,
    downloadUrl: x.downloadUrl,
    title: x.title ?? null,
    isPublic: !!x.isPublic,
    createdAtIso: toIso(x.createdAt),
    stats: x.stats ?? null,
  };
}

export async function updateHighlight(
  ownerEmail: string,
  id: string,
  patch: Partial<CreateHighlightPayload>
): Promise<HighlightDoc | null> {
  const ref = HIGHLIGHTS().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (toEmailKey(data.ownerEmail) !== toEmailKey(ownerEmail)) return null;

  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() } as any);
  const latest = await ref.get();
  const x = latest.data() as any;

  return {
    id,
    ownerEmail: x.ownerEmail,
    jobId: x.jobId,
    downloadUrl: x.downloadUrl,
    title: x.title ?? null,
    isPublic: !!x.isPublic,
    createdAtIso: toIso(x.createdAt),
    stats: x.stats ?? null,
  };
}

export async function deleteHighlight(ownerEmail: string, id: string): Promise<boolean> {
  const ref = HIGHLIGHTS().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return true;
  const data = snap.data() as any;
  if (toEmailKey(data.ownerEmail) !== toEmailKey(ownerEmail)) return false;
  await ref.delete();
  return true;
}
