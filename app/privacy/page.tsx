// app/privacy/page.tsx
"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="w-8 h-8 bg-orange-500 rounded-full grid place-items-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </span>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/terms" className="text-gray-600 hover:text-orange-500">Terms</Link>
            <Link href="/" className="text-gray-600 hover:text-orange-500">Home</Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">
          Legal Entity: TeamLead Technology, Inc.  •  Last updated: Oct 2025
        </p>

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-10 space-y-10">
        <section id="intro" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="text-gray-700">
                HoopTuber uses AI to create basketball highlight reels from user-submitted videos. Users can comment, vote, and participate in groups on our web-based, mobile-friendly platform.
            </p>
        </section>

        <section id="collection" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>User-submitted videos, audio, and related data</li>
                <li>Account and profile information</li>
                <li>Comments, votes, group participation</li>
                <li>Device/browser data, usage analytics, cookies</li>
            </ul>
            <p className="text-gray-500 text-sm">Source: Privacy Policy. Reference: oaicite:13</p>
        </section>

        <section id="use" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Data</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Create highlight reels, enable social features, and improve the platform</li>
                <li>Develop/test/improve AI &amp; ML systems using user content (default consent)</li>
                <li>Select and promote featured reels</li>
                <li>Send marketing communications (we do not sell personal data)</li>
            </ul>
            <p className="text-gray-500 text-sm">Source: Privacy Policy. :contentReference[oaicite:14]</p>
        </section>

        <section id="ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">4. AI Training Disclosure</h2>
            <p className="text-gray-700">
                By submitting content, you grant TeamLead a license to use submissions for AI training and improvement as part of our operations. No separate opt-in is required at this time. :contentReference[oaicite:15]
            </p>
        </section>

        <section id="youth" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">5–7. Youth &amp; Marketing</h2>
            <p className="text-gray-700">
                We verify age and obtain parental consent where required; marketing to users under 18 follows applicable restrictions. :contentReference[oaicite:16]
            </p>
        </section>

        <section id="transparency" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">8–11. Transparency, Controls &amp; Moderation</h2>
            <p className="text-gray-700">
                We publish transparency reports, provide algorithmic controls (including chronological viewing where available), and enforce content restrictions; tools help reduce addictive patterns for minors. :contentReference[oaicite:17]
            </p>
        </section>

        <section id="retention" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">12–16. Retention, Comms, Security &amp; Cookies</h2>
            <p className="text-gray-700">
                We practice data minimization, offer communication opt-outs, protect data with reasonable security, support international transfers with safeguards, and provide cookie preferences consistent with CCPA and other laws. :contentReference[oaicite:18]
            </p>
        </section>

        <section id="changes" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">17. Changes</h2>
            <p className="text-gray-700">
                Policy updates will be communicated to users; continued use signifies acceptance. Reference: oaicite:19
            </p>
        </section>

          <div className="border-t pt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-orange-600 hover:underline">Read our Terms</Link>
            <Link href="/" className="text-gray-600 hover:underline">Back to Home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
