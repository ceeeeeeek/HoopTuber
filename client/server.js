//server.js (Wednesday 10-02-25 Version) - at repo root

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const next = require("next");

// redis setup
const { createClient } = require("redis");

const RedisStore = require("connect-redis");

const dev = process.env.NODE_ENV !== "production"; // change !== to === for production, !== for dev
const app = next({ dev, dir: "." }); // serve your Next.js app/ pages
const handle = app.getRequestHandler();

// redis session setup
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.connect().catch(console.error);
// error handling for connecting to redis
redisClient.on("error", (err) =>  {
  console.error("Redis connection error: ", err)
});
const sessionStore = new RedisStore({
  client: redisClient,
});

// Minimal passport user shape
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

async function start() {
  await app.prepare();
  const server = express();

  if (!dev) server.set("trust proxy", 1);

  server.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: !dev,
        sameSite: dev ? "lax": "none",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );
  server.use(passport.initialize());
  server.use(passport.session());

  // When starting Google auth, remember ?next=… in the session
  // capture ?next=/upload and stash it in the session
  server.get("/auth/google",
    (req, res, next) => {
      const nextUrl = typeof req.query.next === "string" ? req.query.next : null;
      // only allow internal paths for safety
      req.session.returnTo = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/upload";
      next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // In the callback, redirect to the stored destination (default /dashboard)
  server.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=1" }),
  (req, res) => {
    const dest = req.session.returnTo || "/upload";
    delete req.session.returnTo;              // clean up
    res.redirect(dest);
  }
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

  //Catch-all: NO '*' or '(.*)' — just a plain middleware
  server.use((req, res) => handle(req, res));

  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server listening on :${port}`));
}

start();
