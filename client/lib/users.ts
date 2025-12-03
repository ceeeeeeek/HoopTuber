//lib/users.ts - 12-02-25 Tuesday 7pm Version
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

//12-02-25 Tuesday 3pm - Updated the Firestore write to use these expanded signup schema
export interface UserDoc {
  id: string;
  name?: string | null;
  email: string;
  passwordHash?: string | null;
  provider?: string | null;
  createdAt?: FirebaseFirestore.Timestamp | null;
  updatedAt?: FirebaseFirestore.Timestamp | null;

  //optional profile fields
  firstName?: string | null;
  lastName?: string | null;
  birthday?: string | null;  //store as string "YYYY-MM-DD"
  phone?: string | null;
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const id = emailKey(email);
  const snap = await USERS().doc(id).get();
  return snap.exists ? ({ id, ...(snap.data() as any) } as UserDoc) : null;
}

//Create a new user document
export async function createUser({
  id,
  name,
  email,
  passwordHash,
  firstName,
  lastName,
  birthday,
  phone,
}: Omit<UserDoc, "createdAt" | "updatedAt">) {
  return USERS().doc(id).set({
    name,
    email,
    passwordHash,
    firstName,
    lastName,
    birthday,
    phone,
    provider: "credentials",
    createdAt: new Date(), //or FieldValue.serverTimestamp()
    updatedAt: new Date(),
  });
}

