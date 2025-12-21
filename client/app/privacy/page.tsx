//app/privacy/page.tsx
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
        <section id="introduction" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="text-gray-700">
            HoopTuber uses artificial intelligence to create basketball highlight reels from user-submitted videos. Users may comment, vote, and participate in groups on our web-based, mobile-friendly platform.
            </p>
        </section>

        <section id="infocollection" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>User-submitted videos, audio, and related data</li>
                <li>Account and profile information</li>
                <li>Comments, votes, and group participation</li>
                <li>Device and browser data, usage analytics, cookies</li>
            </ul>
        </section>

        <section id="use" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Data</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>To create highlight reels, enable social features, and improve the platform</li>
                <li>To develop, test, and improve AI and machine learning systems using user content (default consent)</li>
                <li>To select and promote featured reels</li>
                <li>To send marketing communications (we do not sell your personal data)</li>
            </ul>
        </section>

        <section id="ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">4. AI Training Disclosure</h2>
            <p className="text-gray-700">
            By submitting content, users grant TeamLead Technology, Inc. a license to use their submissions for AI training and improvement as part of platform operations. No separate opt-in is required at this time.
            </p>
        </section>

        <section id="youth" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">5. Affiliate Partnerships &amp; Product Reviews</h2>
            <p className="text-gray-700">
            HoopTuber may promote products via reviews and guides with affiliate links. We may earn commissions from purchases made through these links at no extra cost to users. We disclose these relationships to maintain transparency.
            </p>
        </section>

        <section id="youth" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">6. Age Verification &amp; Parental Consent</h2>
            <p className="text-gray-700">
            Users must be 13 years or older (or meet local minimum age). Reasonable verification and parental consent are obtained when required by law. Additional proof may be requested.
            </p>
        </section>

        <section id="youth" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">7. Advertising Restrictions for Minors</h2>
            <p className="text-gray-700">
            Marketing to users under 18 complies with applicable laws restricting targeted advertising and data use.
            </p>
        </section>

        <section id="transparency" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">8. Transparency &amp; Reporting</h2>
            <p className="text-gray-700">
            HoopTuber publishes transparency reports on content removals and enforcement actions to provide clarity on policy application.
            </p>
        </section>

        <section id="transparency" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">9. Algorithmic Transparency &amp; User Controls</h2>
            <p className="text-gray-700">
            We use algorithms to personalize content and highlight reels. Users may adjust feed preferences, including viewing content chronologically where available.
            </p>
        </section>

        <section id="transparency" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">10. Content Restrictions &amp; Moderation</h2>
            <p className="text-gray-700">
            Pornography, unauthorized copyrighted material, and illegal or prohibited content are forbidden. Violations may lead to content removal or account action.
            </p>
        </section>

        <section id="transparency" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">11. Protection Against Addictive Content</h2>
            <p className="text-gray-700">
            For minors, usage limits and parental controls promote healthy engagement. Resources and tools support responsible platform use.
            </p>
        </section>

        <section id="retention" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">12. Data Minimization &amp; Retention</h2>
            <p className="text-gray-700">
            Only necessary data is collected and retained per legal and operational needs, with extra care for minors.            </p>
        </section>

        <section id="retention" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">13. Marketing Communications</h2>
            <p className="text-gray-700">
            Users may receive communications from HoopTuber or partners, with opt-out options.
            </p>
        </section>

        <section id="retention" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">14. Security &amp; International Data</h2>
            <p className="text-gray-700">
            Reasonable security measures protect personal data. Data may be transferred and processed internationally with safeguards.            </p>
        </section>

        <section id="retention" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">15. Cookie Usage</h2>
            <p className="text-gray-700">
            We use cookies to enhance service and provide analytics. Users can manage cookie preferences consistent with CCPA and other laws.            </p>
        </section>

        <section id="retention" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">16. Accessibility Commitment</h2>
            <p className="text-gray-700">
            HoopTuber strives for platform accessibility under ADA and California law. Assistance is available upon request.            </p>
        </section>

        <section id="changes" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">17. Changes to Policy</h2>
            <p className="text-gray-700">
            Policy updates will be communicated to users. Continued use signifies acceptance.
            </p>
        </section>

          <div className="border-t pt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-orange-600 hover:underline">Read our Terms & Conditions</Link>
            <Link href="/" className="text-gray-600 hover:underline">Back to Home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
