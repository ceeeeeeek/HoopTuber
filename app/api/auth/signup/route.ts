// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import path from "path";
import nodemailer from "nodemailer";

// --- reuse the same Firestore init style as your nextauth route ---
const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE
    ? path.resolve(process.env.FIRESTORE_KEY_FILE)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined,
});

// --- mailer (optional, for signup notifications) ---
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NOTIFY_EMAIL,
    pass: process.env.NOTIFY_EMAIL_APP_PASSWORD,
  },
});

// Helpers (same as in route.ts)
const USERS = () => firestore.collection("users");
const emailKey = (e: string) => String(e).trim().toLowerCase();

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// Optional: share this with your nextauth route (DRY). For now, inline:
async function saveLeadAndNotify({
  user, provider, kind, sourcePath,
}: {
  user: { id?: string|null; email?: string|null; name?: string|null; image?: string|null };
  provider: string;
  kind: "signup" | "login";
  sourcePath?: string;
}) {
  const uid = (user.id || user.email || "") + "";
  if (!uid) return;
  const now = new Date();
  const nowIso = now.toISOString();

  const leads = firestore.collection("leads");
  const docRef = leads.doc(uid);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const base = {
      email: user.email || null,
      name: user.name || null,
      photo: user.image || null,
      provider,
      lastSource: sourcePath || "/",
      lastLogin: FieldValue.serverTimestamp(),
      lastLoginIso: nowIso,
    };
    if (snap.exists) tx.update(docRef, base);
    else tx.set(docRef, { ...base, firstSeen: FieldValue.serverTimestamp(), firstSeenIso: nowIso });
  });

  await firestore.collection("leadLog").doc(uid).collection("logins").add({
    uid,
    email: user.email || null,
    name: user.name || null,
    source: sourcePath || "/",
    when: FieldValue.serverTimestamp(),
    whenIso: nowIso,
    provider,
    kind, // "signup"
  });

  const to = (process.env.NOTIFY_TO || process.env.NOTIFY_EMAIL || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (to.length) {
    await mailer.sendMail({
      from: process.env.NOTIFY_EMAIL,
      to,
      subject: `[HoopTuber] credentials signup: ${user.email || user.name || uid}`,
      text: `New user SIGNED UP.\nName: ${user.name}\nEmail: ${user.email}\nWhen: ${nowIso}\n`,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok:false, error:"Invalid signup payload" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const id = emailKey(email);

    // prevent duplicates
    const exists = await USERS().doc(id).get();
    if (exists.exists) {
      return NextResponse.json({ ok:false, error:"Email already registered" }, { status: 409 });
    }

    // hash & store
    const passwordHash = await bcrypt.hash(password, 12);
    await USERS().doc(id).set({
      email,
      name,
      passwordHash,
      createdAt: FieldValue.serverTimestamp(),
    });

    await saveLeadAndNotify({
      user: { id, email, name, image: null },
      provider: "credentials",
      kind: "signup",
      sourcePath: "/",
    });

    return NextResponse.json({ ok:true }, { status: 201 });
  } catch (err:any) {
    console.error("Signup failed:", err.message || err);
    return NextResponse.json({ ok:false, error:"Signup failed" }, { status: 500 });
  }
}
