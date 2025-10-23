//client\app\layout.tsx - Wednesday 10-22-25 Update
//Server warm-up runs before hydration, guaranteeing the dev server compiles /api/auth/[...nextauth] on the initial request.
//Using an absolute URL avoids any ambiguity for server fetch.
//Wrapping in <Suspense> keeps it from blocking your initial paint (the component returns null anyway).

import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import RoutePrefetcher from "./app-components/RoutePrefetcher"
import SessionProvider from "./app-components/SessionProvider"
import WarmAuthClient from "./app-components/WarmAuthClient"; //Client warmup
import WarmAuthServer from "./app-components/WarmAuthServer" //Server warmup

export const metadata: Metadata = {
  title: 'HoopTuber',
  description: 'Create your own basketball highlights in seconds!',
  generator: 'v0.dev',
  icons: { icon: "/hooptuberlogo1.png" }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
      <SessionProvider>
          {/* 1) Compile /api/auth/session during SSR before user can click */}
          <WarmAuthServer />
          {/* 2) After hydration, load next-auth client + prefetch routes */}
          <WarmAuthClient />
          {/*Existing prefetcher (fine to keep) */}
          <RoutePrefetcher />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
