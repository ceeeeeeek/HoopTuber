import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import RoutePrefetcher from "./app-components/RoutePrefetcher"
import SessionProvider from "./app-components/SessionProvider"

export const metadata: Metadata = {
  title: 'HoopTuber',
  description: 'Create your own basketball highlights in seconds!',
  generator: 'v0.dev',
  icons: {
    icon: "/hooptuberlogo1.png"
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
          <RoutePrefetcher />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}