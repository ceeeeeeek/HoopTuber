// lib/users.ts
import { Firestore } from "@google-cloud/firestore";
import path from "path";
import bcrypt from "bcryptjs";

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

export type UserDoc = {
  id: string;      // email lower-cased
  name: string;
  email: string;
  passwordHash: string;
  createdAtIso: string;
};

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const id = emailKey(email);
  const snap = await USERS().doc(id).get();
  return snap.exists ? ({ id, ...(snap.data() as any) } as UserDoc) : null;
}

export async function createUser(name: string, email: string, password: string): Promise<UserDoc> {
  const id = emailKey(email);
  const hash = await bcrypt.hash(password, 12);
  const nowIso = new Date().toISOString();

  const doc: Omit<UserDoc, "id"> = {
    name,
    email: id,
    passwordHash: hash,
    createdAtIso: nowIso,
  };

  await USERS().doc(id).set(doc);
  return { id, ...doc };
}
