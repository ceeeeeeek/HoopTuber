// app/api/auth/verify/route.ts
import { NextResponse } from "next/server";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import path from "path";

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE
    ? path.resolve(process.env.FIRESTORE_KEY_FILE)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined,
});

const USERS = () => firestore.collection("users");
const emailKey = (e: string) => String(e).trim().toLowerCase();

export async function GET(req: Request) {
try{
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email)
    return NextResponse.json({ ok: false, error: "Invalid verification link" }, { status: 400 });

  const userRef = USERS().doc(emailKey(email));
  const snap = await userRef.get();
  if (!snap.exists) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const data = snap.data();
  if (data?.verificationToken !== token)
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });

  await userRef.update({ 
    verified: true, 
    verificationToken: FieldValue.delete(),
    verifiedAt: FieldValue.serverTimestamp()
});

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/login?verified=true`);
} catch (err: any){
    console.error("Verification failed:", err);
    return NextResponse.json({ ok: false})
}
}
