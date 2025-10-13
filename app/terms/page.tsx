// app/terms/page.tsx
"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header bar (light) */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="w-8 h-8 bg-orange-500 rounded-full grid place-items-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </span>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-gray-600 hover:text-orange-500">Privacy</Link>
            <Link href="/" className="text-gray-600 hover:text-orange-500">Home</Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-gray-600 mb-8">
          Legal Entity: TeamLead Technology, Inc.  •  Last updated: Oct 2025
        </p>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-10 space-y-10">
          {/* 1. Acceptance */}
        <section id="acceptance" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance</h2>
            <p className="text-gray-700">
                Using HoopTuber means you agree to these Terms. If you do not agree, discontinue use. [See content reference 0]
            </p>
        </section>

          {/* 2. User Responsibilities */}
        <section id="user-resp" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">2. User Responsibilities</h2>
            <p className="text-gray-700">
                Upload only lawful, permitted content. No pornography, unauthorized copyrighted material, scams, or prohibited content. {/* Reference: contentReference[oaicite:1] */}
            </p>
        </section>

          {/* 3. Content Rights & AI Use */}
        <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">3. Content Rights &amp; AI Use</h2>
            <p className="text-gray-700">
                You retain ownership of your content, but grant TeamLead a perpetual, worldwide, royalty-free license to use, modify, display, and promote submissions. By default, submissions may be used to train HoopTuber’s AI/ML systems for platform development and moderation.
            </p>
        </section>

          {/* 4–15 condensed bullets */}
        <section id="more-terms" className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">4–15. Additional Terms (Summary)</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Affiliate links/reviews may appear; editorial independence is maintained. [See content reference 3]</li>
                <li>Age verification/parental consent requirements; underage accounts may be terminated. [See content reference 4]</li>
                <li>Advertising to minors complies with applicable laws. [See content reference 5]</li>
                <li>Transparency and appeals for enforcement actions; algorithmic controls available. [See content reference 6]</li>
                <li>Community guidelines forbid hate speech, threats, harassment, spam, illegal content. [See content reference 7]</li>
                <li>Protection of minors and accessibility commitments. [See content reference 8]</li>
                <li>Data protection, cookies, and security practices described. [See content reference 9]</li>
            </ul>
        </section>

          {/* 16. Dispute Resolution */}
        <section id="dispute" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">16. Dispute Resolution &amp; Arbitration</h2>
            <p className="text-gray-700">
                Disputes are addressed informally first, then—if unresolved—submitted to binding arbitration in California under AAA rules; class actions and jury trials are waived. :contentReference[oaicite:10]
            </p>
        </section>

          {/* 17–19 */}
        <section id="limits" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">17–19. Limits, Law, Changes</h2>
            <p className="text-gray-700">
                Liability is limited to direct damages up to $500; California law governs; material changes will be notified and continued use indicates acceptance. :contentReference[oaicite:11]
            </p>
        </section>

          {/* footer links */}
          <div className="border-t pt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-orange-600 hover:underline">See our Privacy Policy</Link>
            <Link href="/" className="text-gray-600 hover:underline">Back to Home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
