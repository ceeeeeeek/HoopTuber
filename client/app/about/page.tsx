// app/about/page.tsx
import Link from "next/link";
import { Play, Users, Target, Rocket, Trophy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "About Us • HoopTuber",
  description:
    "Meet the team building AI-powered basketball highlights. Our mission is to help every hooper showcase their game.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Top Bar */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-orange-500">
              Home
            </Link>
            <Link href="/about" className="text-gray-900 font-medium">
              About Us
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-orange-500">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="container mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="mb-4 bg-orange-100 text-orange-800 hover:bg-orange-100">
              Our Story
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              We’re building the easiest way to turn{" "}
              <span className="text-orange-500">basketball games</span> into
              shareable <span className="text-orange-500">film highlight videos</span>.
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Every hooper deserves a great highlight reel — without having to spend hours editing software and watching footage. 
              Our service is designed for hoopers, by hoopers who want to use as many tools as they can to get better at the game of basketball.
              Less time editing, more time hooping!
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/upload">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Try Free Upload
                </Button>
              </Link>
              {/* <Link href="/#demo">
                <Button variant="outline">Watch Demo</Button>
              </Link> */}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-white shadow">
            <div className="aspect-video bg-gray-900">
              <video
                className="w-full h-full object-cover"
                src="/demo/demohighlightvid1.mp4"
                playsInline
                controls
                poster="/demo/demohighlightvid1-poster.jpg"
              />
            </div>
            <div className="p-4 text-sm text-gray-600">
              Real highlights. Real hoops. Powered by AI.
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Pillars */}
      <section className="py-14 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Our Mission</h2>
          <p className="max-w-3xl mx-auto text-center text-gray-600 mb-10">
            Unlock every player’s potential by making high-quality highlights—for film study purposes. 
            Perfect for athletes, teams, families, and fans of the game of basketball.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-orange-100 mx-auto mb-4 flex items-center justify-center">
                  <Target className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Precision AI</h3>
                <p className="text-gray-600">
                  Precise shot detection and subject recognition tailored for pickup basketball games
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-orange-100 mx-auto mb-4 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Speed & Simplicity</h3>
                <p className="text-gray-600">
                  Go from full game to shareable highlights in minutes—not
                  hours
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-orange-100 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">For the Community</h3>
                <p className="text-gray-600">
                  Built for players, coaches, and teams to share their best basketball highlights
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats / Credibility */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="container mx-auto grid md:grid-cols-3 gap-6">
          {[
            { value: "1,000+", label: "Highlights generated" },
            { value: "5x", label: "Faster than manual editing" },
            { value: "75-90%", label: "Shot-detection accuracy*" },
          ].map((s, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-8 pb-8">
                <div className="text-3xl font-extrabold text-gray-900">
                  {s.value}
                </div>
                <div className="text-gray-600 mt-2">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-center text-gray-400 mt-4">
          *Accuracy varies by camera placement, lighting, and video quality.
        </p>
      </section>

      {/* Values */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="container mx-auto grid md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Film Study</h3>
              </div>
              <p className="text-gray-600">
                We obsess over getting better at the fundamentals: It all starts with watching film.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Share to Your Feed</h3>
              </div>
              <p className="text-gray-600">
                Collborate and share your best highlights on your feed for other hoopers to see.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 bg-orange-500 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Want to email us?</h2>
          <p className="text-lg opacity-90 mb-6">
          We collaborate with teams, parks, rec leagues, and hoopers.
          </p>
          <a href="mailto:team@hooptuber.com">
            <Button variant="secondary" className="text-gray-900">
              <Mail className="w-5 h-5 mr-2" />
              Email the Team
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="container mx-auto text-center text-gray-400">
          © {new Date().getFullYear()} HoopTuber. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
