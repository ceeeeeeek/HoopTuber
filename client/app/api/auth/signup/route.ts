// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import path from "path";
import nodemailer from "nodemailer";
import crypto from "crypto";


const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE
    ? path.resolve(process.env.FIRESTORE_KEY_FILE)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined,
});
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
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Invalid username"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 chars"),
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
    console.log("Signup request body:" , body);
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Signed up validation error: ", parsed.error.flatten());
      return NextResponse.json({ ok:false, error:"Invalid signup payload" }, { status: 400 });
    }

  const { name, username, email, password } = parsed.data;
    const id = emailKey(email);

    // prevent duplicates: email and username
    const exists = await USERS().doc(id).get();
    if (exists.exists) {
      return NextResponse.json({ ok:false, error:"Email already registered" }, { status: 409 });
    }
    if (username) {
      const usernameQuery = await USERS().where("username", "==", String(username).trim()).limit(1).get();
      if (!usernameQuery.empty) {
        return NextResponse.json({ ok:false, error:"Username already taken" }, { status: 409 });
      }
    }

    // hash & store
    const verificationToken = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 12);
    await USERS().doc(id).set({
      email,
      name,
      username,
      passwordHash,
      createdAt: FieldValue.serverTimestamp(),
      verified: false,
      verificationToken,
    });
    // after await USERS().doc(id).set(...)
const verifyLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

await mailer.sendMail({
  from: `"HoopTuber" <${process.env.NOTIFY_EMAIL}>`,
  to: email,
  subject: "Verify your HoopTuber account",
  html: `
    <h2>Welcome to HoopTuber, ${name}!</h2>
    <p>Please verify your email by clicking below:</p>
    <a href="${verifyLink}" target="_blank" 
       style="background:#ff7a00;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;">
      Verify Email
    </a>
    <p>If you didn’t sign up, you can safely ignore this email.</p>
  `,
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
