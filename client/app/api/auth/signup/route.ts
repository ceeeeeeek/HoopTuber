//app/api/auth/signup/route.ts - 12-02-25 Tuesday 7pm Version - Hashed Credentials Signup Route for Next.js 14+ with Firestore and Zod 
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

// const SignupSchema = z.object({
//   name: z.string().min(1),
//   email: z.string().email(),
//   password: z.string().min(8),
// });

//12-02-25 Tuesday 3pm - Expanded signup schema
const SignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  birthday: z
    .string()
    .min(1, "Birthday is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD"),//optional: enforce YYYY-MM-DD
  phone: z.string().min(7, "Phone number is too short"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});


//Optional: share this with your nextauth route (DRY). For now, inline:
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

    // if (!parsed.success) {
    //   return NextResponse.json({ ok:false, error:"Invalid signup payload" }, { status: 400 });
    // }
    // const { name, email, password } = parsed.data;
    //12-02-25 Tuesday 3pm - Updated the POST handler to use these expanded signup schema
    if (!parsed.success) {
      console.error("Invalid signup payload", parsed.error.format());
      return NextResponse.json(
        { error: "Invalid signup payload" },
        { status: 400 }
      );
    }
    const { firstName, lastName, email, birthday, phone, password } =
      parsed.data;

    const name = `${firstName} ${lastName}`.trim();
    //12-02-25 Tuesday 3pm - Updated the POST handler to use these expanded signup schema

    const id = emailKey(email);

    //prevent duplicates
    const exists = await USERS().doc(id).get();
    if (exists.exists) {
      return NextResponse.json({ ok:false, error:"Email already registered" }, { status: 409 });
    }

    // hash & store
    const passwordHash = await bcrypt.hash(password, 12);
    // await USERS().doc(id).set({
    //   email,
    //   name,
    //   passwordHash,
    //   createdAt: FieldValue.serverTimestamp(),
    // });
    //12-02-25 Tuesday 3pm - Updated the Firestore write to use these expanded signup schema
    await USERS().doc(id).set({
      name,                  // full name, for backwards compatibility
      firstName,
      lastName,
      email,
      birthday,
      phone,
      passwordHash,
      provider: "credentials",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
