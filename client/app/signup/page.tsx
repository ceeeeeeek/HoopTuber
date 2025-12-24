"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsAnimating(true)

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true)
      setEmail("")
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition">
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
          <nav className="flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-orange-500 transition">
              Back to Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl">
            <CardContent className="pt-8 pb-8 px-6 sm:px-8">
              {!submitted ? (
                <div className="space-y-6">
                  {/* Logo */}
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                      <Image
                        src="/hooptubericon2.png"
                        alt="HoopTuber Logo"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Heading */}
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      Join the Waitlist
                    </h1>
                    <p className="text-gray-600">
                      Be the first to know when we launch. Get early access and exclusive updates.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition ${
                          isAnimating ? "scale-[0.98]" : "scale-100"
                        }`}
                      />
                    </div>

                    <Button
                      type="submit"
                      className={`w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold transition-all ${
                        isAnimating ? "scale-95" : "scale-100"
                      }`}
                      disabled={isAnimating}
                    >
                      {isAnimating ? "Joining..." : "Notify Me at Launch"}
                    </Button>
                  </form>

                  {/* Footer Text */}
                  <p className="text-center text-sm text-gray-500">
                    We'll never share your email. Unsubscribe anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 py-4 animate-in fade-in zoom-in duration-500">
                  {/* Success Icon */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300 delay-100">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-10 h-10 text-white animate-in zoom-in duration-300 delay-200" />
                      </div>
                    </div>
                  </div>

                  {/* Success Message */}
                  <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <h2 className="text-2xl font-bold text-gray-900">
                      You're on the list!
                    </h2>
                    <p className="text-gray-600">
                      Thanks for signing up! We'll send you an email when we launch.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    <Button
                      onClick={() => {
                        setSubmitted(false)
                        setIsAnimating(false)
                      }}
                      variant="outline"
                      className="w-full py-6 text-base"
                    >
                      Sign up another email
                    </Button>
                    <Button
                      asChild
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base"
                    >
                      <Link href="/">Return to Home</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto text-center text-sm text-gray-600">
          <p>&copy; 2025 HoopTuber. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
