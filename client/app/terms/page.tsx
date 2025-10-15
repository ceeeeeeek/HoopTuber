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
            Using HoopTuber constitutes agreement to these Terms. Discontinue use if you do not agree.            
            </p>
        </section>

          {/* 2. User Responsibilities */}
        <section id="user-resp" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">2. User Responsibilities</h2>
            <p className="text-gray-700">
            Users agree to upload only lawful, permitted content and refrain from pornography, unauthorized copyrighted material, scams, or prohibited content.            
            </p>
        </section>

          {/* 3. Content Rights & AI Use */}
        <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">3. Content Rights &amp; AI Use</h2>
            <p className="text-gray-700">
            Users retain ownership of their content but grant TeamLead a perpetual, worldwide, royalty-free license to use, modify, display, and promote submissions. 
            By default, submissions may be used for training HoopTuber’s AI and machine learning systems as part of platform development and moderation.            
            </p>
        </section>

          {/* 4. Affiliate Links & Partnerships */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">4. Affiliate Links &amp; Partnerships</h2>
            <p className="text-gray-700">
            HoopTuber may include product reviews and guides with affiliate links, earning commissions. 
            These partnerships do not affect editorial independence.           
            </p>
        </section>

          {/* 5. Age Verification & Parental Consent */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">5. Age Verification &amp; Parental Consent</h2>
            <p className="text-gray-700">
            Users certify they meet age requirements or parental consent is obtained. 
            HoopTuber may terminate accounts found to be underage without consent.          
            </p>
        </section>

          {/* 6. Advertising to Minors */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">6. Advertising to Minors</h2>
            <p className="text-gray-700">
            Marketing complies with laws restricting targeting and data usage for minors.
            </p>
        </section>

          {/* 7. Transparency & Appeals */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">7. Transparency &amp; Appeals</h2>
            <p className="text-gray-700">
            Users may appeal content removals and receive clear explanations for enforcement actions.           
            </p>
        </section>

          {/* 8. Algorithmic Controls */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">8. Algorithmic Controls</h2>
            <p className="text-gray-700">
            Content is personalized through algorithms with available user controls to adjust the experience.           
            </p>
        </section>

          {/* 9. Community Guidelines */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">9. Community Guidelines</h2>
            <p className="text-gray-700">
            No hate speech, threats, harassment, spam, or illegal content. 
            Violations may result in removal, suspension, or termination.          
            </p>
        </section>

          {/* 10. Protection of Minors */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">10. Protection of Minors</h2>
            <p className="text-gray-700">
            Includes parental oversight and usage time limits consistent with law.          
            </p>
        </section>

          {/* 11. Content Moderation Policy */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">11. Content Moderation Policy</h2>
            <p className="text-gray-700">
            HoopTuber enforces clear content review, removal, and appeals procedures balancing expression and safety.          
            </p>
        </section>

          {/* 12. Employee Social Media Use */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">12. Employee Social Media Use</h2>
            <p className="text-gray-700">
            Employees must act professionally, safeguard confidential information, and avoid harming HoopTuber’s reputation online.          
            </p>
        </section>

          {/* 13. Data Protection and Security*/}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">13. Data Protection and Security</h2>
            <p className="text-gray-700">
            Robust security protects data. Breaches will be handled per California laws.
            </p>
        </section>

          {/* 14. Cookie Policy */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">14. Cookie Policy</h2>
            <p className="text-gray-700">
            Users receive cookies and tracking technology notices and can manage preferences.
            </p>
        </section>

          {/* 15. Accessibility */}
          <section id="content-ai" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">15. Accessibility</h2>
            <p className="text-gray-700">
            HoopTuber commits to accessibility and provides accommodations upon request.
            </p>
        </section>

          {/* 16. Dispute Resolution */}
        <section id="dispute" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">16. Dispute Resolution &amp; Arbitration</h2>
            <p className="text-gray-700">
            Disputes will first be attempted to resolve informally. 
            Unresolved disputes submitted voluntarily to binding arbitration in California under AAA rules. 
            Class actions and jury trials are waived.            
            </p>
        </section>

          {/* 17. Limitation of Liability */}
        <section id="limits" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">17. Limitation of Liability</h2>
            <p className="text-gray-700">
            TeamLead’s liability is limited to direct damages up to $500.
            </p>
        </section>

          {/* 18. Governing Law */}
          <section id="limits" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">18. Governing Law</h2>
            <p className="text-gray-700">
            These terms are governed by California law.
            </p>
        </section>

          {/* 19. Changes to Terms */}
          <section id="limits" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">19. Changes to Terms</h2>
            <p className="text-gray-700">
            Material changes will be notified; continued use indicates acceptance.
            </p>
        </section>

          {/* footer links */}
          <div className="border-t pt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-orange-600 hover:underline">Read our Privacy Policy</Link>
            <Link href="/" className="text-gray-600 hover:underline">Back to Home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
