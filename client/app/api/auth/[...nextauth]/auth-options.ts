// client/app/api/auth/[...nextauth]/auth-options.ts - Wednesday 10-22-25 Update
// NEW — re-export your NextAuth options so both the route handler AND server code can import them.

import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { Firestore } from "@google-cloud/firestore"
import path from "path"

// Keep this inline minimal, or move shared helpers out to lib if you prefer:

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE
    ? path.resolve(process.env.FIRESTORE_KEY_FILE)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined,
})
const USERS = () => firestore.collection("users")
const emailKey = (e?: string|null) => String(e || "").trim().toLowerCase()

async function verifyUser(email?: string, password?: string) {
  if (!email || !password) return null
  const snap = await USERS().doc(emailKey(email)).get()
  if (!snap.exists) return null
  const data = snap.data() as any
  if (!data?.passwordHash) return null
  const ok = await bcrypt.compare(password, data.passwordHash)
  if (!ok) return null
  return { id: emailKey(email), email, name: data.name ?? null }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Sign in",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(c) {
        const user = await verifyUser(c?.email, c?.password)
        if (!user) throw new Error("Invalid email or password")
        return user
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
}
