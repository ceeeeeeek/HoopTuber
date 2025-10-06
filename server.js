//server.js (Sunday 09-30-25 Version) - at repo root

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const next = require("next");

//Firestore + google email for OAuth 2.0 - for leads signing into HoopTuber with Google gmail accounts
const path = require("path");
const { Firestore, FieldValue } = require("@google-cloud/firestore");
const nodemailer = require("nodemailer");
//Firestore + google email for OAuth 2.0

//local (email/password) auth flow - for leads signing into HoopTuber with accounts made on HoopTuber
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: "." }); // serve your Next.js app/ pages
const handle = app.getRequestHandler();

//Minimal passport user shape
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: dev
        ? "http://localhost:3000/auth/google/callback"
        : "https://app.hooptuber.com/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        name: profile.displayName,
        photo: profile.photos?.[0]?.value,
        email: profile.emails?.[0]?.value,
      };
      return done(null, user);
    }
  )
);

//Firestore init client (service-account key file) - for leads
const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.FIRESTORE_KEY_FILE
    ? path.resolve(process.env.FIRESTORE_KEY_FILE)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined, // falls back to ADC if neither is set
});

//10-02-25 Thursday addition 4:00pm
//Local users collection helpers (site-native accounts) - should be placed right after Firestore init because it needs firestore initialized FIRST
const USERS = () => firestore.collection("users");

function emailKey(email) {
  return String(email).trim().toLowerCase();
}

async function findUserByEmail(email) {
  const doc = await USERS().doc(emailKey(email)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}
//10-02-25 Thursday addition 4:00pm

//Nodemailer (Gmail with App Password)
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NOTIFY_EMAIL,
    pass: process.env.NOTIFY_EMAIL_APP_PASSWORD,
  },
});

//10-02-25 Thursday addition 4:00pm
//saveLeadAndNotify() VERSION with both (one-per-user and a history), 
//you can write to two collections: an upsert to leads/{user.id} and an append to leadLog/{user.id}/{loginId}.
//Upserts one document per user at leads/{user.id} (preserves firstSeen).
//+
//Also appends a history entry at leadLog/{user.id}/logins/{autoId}.
async function saveLeadAndNotify({ user, sourcePath, provider = "google", kind = "login" }) {
  try {
    const leads = firestore.collection("leads");
    const docRef = leads.doc(user.id); // stable per-user (google id or our local uid)
    const now = new Date();
    const nowIso = now.toISOString();

    // Upsert 1 row per person (firstSeen once, lastLogin every time)
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const base = {
        email: user.email || null,
        name: user.name || null,
        photo: user.photo || null,
        provider,
        lastSource: sourcePath || "/",
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

    // Append per-event history: leadLog/{uid}/logins/{autoId}
    await firestore
      .collection("leadLog")
      .doc(user.id)
      .collection("logins")
      .add({
        uid: user.id,
        email: user.email || null,
        name: user.name || null,
        source: sourcePath || "/",
        when: FieldValue.serverTimestamp(),
        whenIso: nowIso,
        provider,
        kind, // "signup" or "login"
      });

    // Email notify
    const to = (process.env.NOTIFY_TO || process.env.NOTIFY_EMAIL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (to.length) {
      await mailer.sendMail({
        from: process.env.NOTIFY_EMAIL,
        to,
        subject: `[HoopTuber] ${provider} ${kind}: ${user.email || user.name || user.id}`,
        text: [
          `A user ${kind} via ${provider}.`,
          `Name: ${user.name || "(none)"}`,
          `Email: ${user.email || "(none)"}`,
          `Source path: ${sourcePath || "/"}`,
          `When: ${nowIso}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("Lead save/email failed:", err);
  }
}
//10-02-25 Thursday addition 4:00pm


async function start() {
  await app.prepare();
  //Verify mailer early – this will log a clear warning if Gmail/App Password is misconfigured
  try {
    await mailer.verify();
    console.log("Mailer ready");
  } catch (err) {
    console.warn("Mailer config problem:", err.message);
  }
  const server = express();

  if (!dev) server.set("trust proxy", 1);

  //10-02-25 Thursday addition 4:00pm
  //parsers - to read JSON form bodies for local auth endpoints; must be placed before server.use(session({...}))
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  //10-02-25 Thursday addition 4:00pm

  server.use(
    session({
      secret: process.env.SESSION_SECRET || "change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: !dev,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );
  server.use(passport.initialize());
  server.use(passport.session());

  //When starting Google auth, remember ?next=… in the session
  //capture ?next=/upload and stash it in the session
  //remember ?next=... in session (default /upload)
  server.get("/auth/google",
    (req, res, next) => {
      const nextUrl = typeof req.query.next === "string" ? req.query.next : null;
      // only allow internal paths for safety
      req.session.returnTo = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/upload";
      next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  server.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=1" }),
    async (req, res) => {
      const dest = req.session.returnTo || "/upload";
  
      //record lead + notify, but don't block the redirect on failures
      try {
        await saveLeadAndNotify({
          user: req.user,                 //{ id, name, email, photo }
          sourcePath: dest,               //where the flow intends to go next
        });
      } catch (e) {
        console.error("Lead capture/notify error:", e);
        //continue anyway
      }
  
      delete req.session.returnTo;    
      res.redirect(dest);
    }
  );

//Logout Route  
  server.get("/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });

//Simple "am I logged in?" API used by your UI/middleware
//API for the dashboard header
  server.get("/api/me", (req, res) => {
    if (!req.user) return res.status(401).json({ ok: false });
    const { name, photo } = req.user;
    res.json({ ok: true, user: { name, photo } });
  });

  server.get("/healthz", (_req, res) => res.send("ok"));

  //Catch-all: NO '*' or '(.*)' — just a plain middleware
  server.use((req, res) => handle(req, res));

  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server listening on :${port}`));
}

start();
