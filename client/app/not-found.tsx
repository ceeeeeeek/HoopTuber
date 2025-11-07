"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/hooptubericon2.png"
              alt="HoopTuber Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <Button size="sm" variant="outline" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      {/* 404 Content */}
      <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <div className="max-w-2xl mx-auto">
          {/* 404 Number with Basketball Theme */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-orange-500 mb-4 animate-bounce">
              404
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Search className="w-6 h-6" />
              <p className="text-xl">Page Not Found</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Oops! This shot missed the basket
            </h2>
            <p className="text-gray-600 mb-6">
              The page you're looking for doesn't exist or has been moved.
              Don't worry though - let's get you back in the game!
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600"
                asChild
              >
                <Link href="/">
                  <Home className="w-5 h-5 mr-2" />
                  Back to Home
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
              >
                <Link href="/waitlist">
                  Try HoopTuber
                </Link>
              </Button>
            </div>
          </div>

          {/* Helpful Links */}
          <div className="text-sm text-gray-600">
            <p className="mb-2">Looking for something specific?</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/#features" className="hover:text-orange-500 transition">
                Features
              </Link>
              <Link href="/about" className="hover:text-orange-500 transition">
                About Us
              </Link>
              <Link href="/contact" className="hover:text-orange-500 transition">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 mt-auto">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Image
              src="/hooptubericon2.png"
              alt="HoopTuber Logo"
              width={24}
              height={24}
              className="object-contain"
            />
            <span className="font-semibold">HoopTuber</span>
          </div>
          <p className="text-gray-400 text-sm">
            &copy; 2025 HoopTuber. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
