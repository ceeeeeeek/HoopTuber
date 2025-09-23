// // server.js (repo root)

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: "." }); // serve your Next.js app/ pages
const handle = app.getRequestHandler();

// Minimal passport user shape
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    //callbackURL: "https://app.hooptuber.com/auth/google/callback", //When you deploy, switch to/uncomment when not testing LOCALLY and on app.hooptuber.com
    //callbackURL: "http://localhost:3000/auth/google/callback", //Keep your local server.js using the local callback during dev - http://localhost:3000/auth/google/callback
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

async function start() {
  await app.prepare();
  const server = express();

  if (!dev) server.set("trust proxy", 1);

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

 //Auth routes/writing the endpoints - to handle login and display user information 
  server.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  server.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=1" }),
    (req, res) => res.redirect("/dashboard")
  );

//Logout Route  
  server.get("/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });

//API for the dashboard header
  server.get("/api/me", (req, res) => {
    if (!req.user) return res.status(401).json({ ok: false });
    const { name, photo } = req.user;
    res.json({ ok: true, user: { name, photo } });
  });

  server.get("/healthz", (_req, res) => res.send("ok"));

  // ⬇️ Catch-all: NO '*' or '(.*)' — just a plain middleware
  server.use((req, res) => handle(req, res));

  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server listening on :${port}`));
}

start();
