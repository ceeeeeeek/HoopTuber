// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import path from "path";

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE
    ? path.resolve(process.env.FIRESTORE_KEY_FILE)
    : undefined,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token)
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  const usersRef = firestore.collection("users");
  const snap = await usersRef.where("verificationToken", "==", token).limit(1).get();

  if (snap.empty)
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });

  const doc = snap.docs[0];
  await doc.ref.update({
    verified: true,
    verificationToken: FieldValue.delete(),
    verifiedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/verified-success`);
}
