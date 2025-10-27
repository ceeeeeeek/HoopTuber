//HoopTuber frontend landing page - the first page you see
"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Smartphone, Users, Zap, Star, Download, ArrowRight, X } from "lucide-react"
import Link from "next/link"
import TryFreeUploadButton from "./app-components/TryFreeUploadButton"
import ProfileDropdown from "./app-components/ProfileDropdown"
import { useSession } from "next-auth/react"


export default function LandingPage() {
  const { data: session, status } = useSession()

  //inline player state + ref
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  //helpers
  function startPlayback() {
    setPlaying(true);
    setEnded(false);
    // give the <video> a tick to mount before playing
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  }

  function replay() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
    setEnded(false);
  }

  useEffect(() => {
    if (!playing && videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
  }, [playing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
          <Link href="/about" className="text-gray-600 hover:text-orange-500">
              About Us
            </Link>            
            <Link href="#features" className="text-gray-600 hover:text-orange-500">
              Features
            </Link>
            {status === "authenticated" && session ? (
              <>
                <TryFreeUploadButton
                  size="sm"
                  variant="secondary"
                  className="rounded-full bg-gray-900 hover:bg-black text-white"
                  withIcon={false}
                >
                  Try Free
                </TryFreeUploadButton>
                <ProfileDropdown />
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-orange-500">
                  Login
                </Link>
                <TryFreeUploadButton
                  size="sm"
                  variant="secondary"
                  className="rounded-full bg-gray-900 hover:bg-black text-white"
                  withIcon={false}
                >
                  Try Free
                </TryFreeUploadButton>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-orange-100 text-orange-800 hover:bg-orange-100">
            An AI-Powered Basketball Highlight Maker
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Turn Your Game Into
            <span className="text-orange-500"> Epic Highlights</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your basketball footage and let HoopTuber's AI automatically detect every basket, creating highlight-style reels
            that showcase your best plays on the court
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <TryFreeUploadButton
          size="lg"
          variant="default"
          className="bg-orange-500 hover:bg-orange-600"
          withIcon
          />
          <Button size="lg" variant="outline" asChild>
            <Link
              href="#demo"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("demo")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Link>
          </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How HoopTuber Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Record & Upload</h3>
                <p className="text-gray-600">
                  Record & upload your pickup basketball footage
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Detection</h3>
                <p className="text-gray-600">
                  Use our AI to automatically detect your team's baskets and key plays
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Share & Connect</h3>
                <p className="text-gray-600">
                  Create highlights, share them with friends, & build your own basketball community
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
          
      {/* Demo Section (INLINE video with poster + replay overlay) */}
      <section id="demo" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">See HoopTuber in Action</h2>

          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">

              {/* The video lives in the box the whole time */}
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                src="/demo/demohighlightvid1.mp4"
                playsInline
                controls={playing}            // controls appear once playing starts
                poster="/demo/demohighlightvid1-poster.jpg"  // <-- put a frame-0 screenshot here
                onEnded={() => setEnded(true)}
              />

              {/* Poster state: big play CTA centered */}
              {!playing && (
                <button
                  onClick={startPlayback}
                  className="absolute inset-0 grid place-items-center bg-black/30 hover:bg-black/20 transition"
                  aria-label="Play demo video"
                >
                  <span className="inline-flex items-center rounded-full bg-white/95 px-4 py-2 shadow">
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                    Play Demo Video
                  </span>
                </button>
              )}

              {/* Replay overlay: appears when video ends */}
              {ended && (
                <button
                  onClick={replay}
                  className="absolute inset-0 grid place-items-center bg-black/40 hover:bg-black/30 transition"
                  aria-label="Replay demo video"
                >
                  <span className="inline-flex items-center rounded-full bg-white/95 px-5 py-2 shadow">
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 11-6-6z" />
                    </svg>
                    Replay
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {/* <section id="pricing" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-3xl font-bold text-orange-500 mb-4">$0</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />1 video analysis
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Basic highlight reel
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Share to social media
                  </li>
                </ul>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/upload">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-orange-200 relative">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-orange-500">Most Popular</Badge>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <p className="text-3xl font-bold text-orange-500 mb-4">
                  $4.99<span className="text-sm text-gray-500">/month</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Unlimited video analysis
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Team groups & sharing
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Player identification
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Auto-share to groups
                  </li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/subscribe">Start Premium</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-orange-500 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Elevate Your Game?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of local hoopers & support your local hoop
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* <Button size="lg" variant="secondary" asChild>
              <Link href="/upload">
                Try Free Upload
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button> */}
            <TryFreeUploadButton />
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-orange-500"
              asChild
            >
              {/* <Link href="#download">
                <Download className="w-5 h-5 mr-2" />
                Download App
              </Link> */}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-xl font-bold">HoopTuber</span>
              </div>
              <p className="text-gray-400">AI-powered & ready for pickup</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#features">Features</Link>
                </li>
                {/* 10-12-2025 Sunday 10:15am update - to website frontend */}
                {/* Removed pricing + pricing link */}
                {/* <li>
                  <Link href="#pricing">Pricing</Link>
                </li> */}
                {/* <li>
                  <Link href="/login">Try Free</Link>
                  <Link href="/upload">Try Free</Link>
                </li> */}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/about">About Us</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
                <li>
                  <Link href="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms & Conditions</Link>
                </li>
              </ul>
            </div>
            {/* Download iOS App + Android App at Footer of landing page */}
            {/* <div>
              <h4 className="font-semibold mb-4">Download</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#ios">iOS App</Link>
                </li>
                <li>
                  <Link href="#android">Android App</Link>
                </li>
              </ul>
            </div> */}
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 HoopTuber. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}