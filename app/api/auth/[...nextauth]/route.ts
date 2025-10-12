//api/auth/[...nextauth]/route.ts (My Sunday 10-05-25 Version) 
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs";
import { z } from "zod";

// NEW: Firestore + mailer
import { Firestore, FieldValue } from "@google-cloud/firestore";
import nodemailer from "nodemailer";
import path from "path";

// --- NEW: Firestore client (service-account) ---
const firestore = new Firestore({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.FIRESTORE_KEY_FILE
      ? path.resolve(process.env.FIRESTORE_KEY_FILE)
      : process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        : undefined, // falls back to ADC if neither is set
  });
  
  // --- NEW: Nodemailer (Gmail App Password) ---
  const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NOTIFY_EMAIL,             // sender gmail (has 2SV + App Password)
      pass: process.env.NOTIFY_EMAIL_APP_PASSWORD // 16-char app password
    },
  });

  // --- Local users collection helpers (site-native accounts - so that users can create accounts with email and passwords) ---
  const USERS = () => firestore.collection("users");

  function emailKey(email?: string | null) {
    return String(email || "").trim().toLowerCase();
  }
  
  async function findUserByEmail(email: string) {
    const doc = await USERS().doc(emailKey(email)).get();
    return doc.exists ? ({ id: doc.id, ...(doc.data() as any) }) : null;
  }

  // --- NEW: helper: upsert lead + append login log + email team ---
  async function saveLeadAndNotify(opts: {
    user: { id?: string | null; email?: string | null; name?: string | null; image?: string | null };
    provider: string;
    kind?: "login" | "signup";
    sourcePath?: string;
  }) {
    const { user, provider, kind = "login", sourcePath = "/" } = opts;
    const uid = (user.id || user.email || "").toString();
    if (!uid) return; // nothing to write if no identity
  
    const leads = firestore.collection("leads");
    const docRef = leads.doc(uid);
    const now = new Date();
    const nowIso = now.toISOString();
  
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const base = {
        email: user.email || null,
        name: user.name || null,
        photo: user.image || null,
        provider,
        lastSource: sourcePath,
        lastLogin: FieldValue.serverTimestamp(),
        lastLoginIso: nowIso,
      };
      if (snap.exists) {
        tx.update(docRef, base);
      } else {
        tx.set(docRef, {
          ...base,
          firstSeen: FieldValue.serverTimestamp(),
          firstSeenIso: nowIso,
        });
      }
    });
  
    await firestore
      .collection("leadLog")
      .doc(uid)
      .collection("logins")
      .add({
        uid,
        email: user.email || null,
        name: user.name || null,
        source: sourcePath,
        when: FieldValue.serverTimestamp(),
        whenIso: nowIso,
        provider,
        kind,
      });
  
    const to = (process.env.NOTIFY_TO || process.env.NOTIFY_EMAIL || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    if (to.length) {
      await mailer.sendMail({
        from: process.env.NOTIFY_EMAIL,
        to,
        subject: `[HoopTuber] ${provider} ${kind}: ${user.email || user.name || uid}`,
        text: [
          `A user ${kind} via ${provider}.`,
          `Name: ${user.name || "(none)"}`,
          `Email: ${user.email || "(none)"}`,
          `Source path: ${sourcePath}`,
          `When: ${nowIso}`,
        ].join("\n"),
      });
    }
  }
  
// Validate login payload
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 chars"),
});

// Compare plaintext password to stored bcrypt hash
async function verifyUser(email?: string, password?: string) {
  const parsed = LoginSchema.safeParse({ email, password });
  if (!parsed.success) return null;

  const userDoc = await findUserByEmail(parsed.data.email);
  if (!userDoc || !userDoc.passwordHash) return null;

  const ok = await bcrypt.compare(parsed.data.password, userDoc.passwordHash);
  if (!ok) return null;

  // What NextAuth expects to treat them as “logged in”
  return {
    id: userDoc.id,                          // we use emailKey(email) as id
    email: userDoc.email,
    name: userDoc.name ?? null,
  };
}

  // ---------- UNCHANGED: NextAuth config (providers/pages/secret) ----------
  const handler = NextAuth({
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      CredentialsProvider({
        name: "Sign in",
        credentials: {
          email: { label: "Email", type: "email", placeholder: "" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {                               // ✅ uses Firestore + bcrypt now
          const user = await verifyUser(credentials?.email, credentials?.password);
          if (!user) throw new Error("Invalid email or password");
          return user;
        },
      })
    ],
    callbacks: {
      // NEW: write to Firestore + email on every successful sign-in
      async signIn({ user, account }) {
        try {
          await saveLeadAndNotify({
            user: {
              id: (user as any).id ?? null,
              email: user.email ?? null,
              name: user.name ?? null,
              image: (user as any).image ?? null,
            },
            provider: account?.provider || "unknown",
            kind: "login",
            // If you pass a 'next' param in your sign-in link, you could forward it here.
            sourcePath: "/",
          });
        } catch (e) {
          console.warn("Lead capture/notify failed:", (e as Error).message);
        }
        return true; // do not block login if logging fails
      },
  
      // UNCHANGED (you can keep your logs if you like)
      async session({ session, token }) {
        return session;
      },
      async jwt({ token, user }) {
        return token;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: { signIn: "/login" },
  });
  
  export { handler as GET, handler as POST };

//hooptuber-docker-merge version on GitHub (Last updated by Chris A. on Sunday 10-05-2025)

// import NextAuth from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import CredentialsProvider from "next-auth/providers/credentials"

// async function verifyUser(email?: string, password?: string) {
//   // Temporary hardcoded example for testing, replace with real user verification logic when actual DB is implemented:
//   if (email === "test@example.com" && password === "123456") {
//     return { id: "1", name: "Test User", email }
//   }

//   // If user not found or password incorrect:
//   return null
// }

// const handler = NextAuth({
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//     CredentialsProvider({
//         name: "Sign in",
//         credentials: {
//             email: {
//                 label: "Email",
//                 type: "email",
//                 placeholder: "",
//             },
//         password: { label: "Paddword", type: "password" },
//         },
//               async authorize(credentials) {
//         // Verifying user with example
//         const user = await verifyUser(credentials?.email, credentials?.password)
//         if (!user) {
//           throw new Error("Invalid email or password")
//         }
//         return user
//       },
//     }),
//   ],
//   callbacks: {
//     // callback to monitor every time user logs in
//     async signIn({ user, account, profile, email, credentials }) {
//       console.log("New login attempt from:", user)
//       return true
//     },
//     // callback to monitor session activity
//     async session({ session, token}) {
//       console.log("Session callback for: ", session.user?.email)
//       return session
//     },
//     // mointoring JWT token 
//     async jwt({ token, user }) {
//       if (user) {
//         console.log("JWT issued for: ", user.email)
//       }
//       return token
//     }
//   },
//   secret: process.env.NEXTAUTH_SECRET,
//   pages: {
//     signIn: "/login", // optional custom login page
//   },
// })

// export { handler as GET, handler as POST }

//-------------------------------------------------------