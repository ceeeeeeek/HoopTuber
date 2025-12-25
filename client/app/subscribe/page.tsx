"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Play, ArrowLeft, Users, Upload, BarChart3 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SubscribePage() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
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
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-orange-100 text-orange-800">Upgrade to Premium</Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Unlock Your Full Potential</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get unlimited video analysis, team features, and advanced analytics to take your game to the next level.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white rounded-lg p-1 flex">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isAnnual ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isAnnual ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Annual
                <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Save 20%</Badge>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Free Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <p className="text-3xl font-bold text-gray-900">$0</p>
                  <p className="text-sm text-gray-500">Forever</p>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>1 video analysis per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Basic highlight reels</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Share to social media</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>View community clips</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-orange-200 relative">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-orange-500">Most Popular</Badge>
              <CardHeader>
                <CardTitle className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Premium</h3>
                  <p className="text-3xl font-bold text-orange-500">
                    ${isAnnual ? "3.99" : "4.99"}
                    <span className="text-sm text-gray-500">/{isAnnual ? "month" : "month"}</span>
                  </p>
                  {isAnnual && <p className="text-sm text-gray-500">Billed annually ($47.88/year)</p>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="font-medium">Unlimited video analysis</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Advanced AI detection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Team groups & collaboration</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Player identification & tagging</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Auto-share to team groups</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Advanced analytics dashboard</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Priority customer support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Early access to new features</span>
                  </li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">Start Premium Trial</Button>
                <p className="text-xs text-gray-500 text-center mt-2">7-day free trial • Cancel anytime</p>
              </CardContent>
            </Card>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold mb-2">Unlimited Uploads</h3>
                <p className="text-sm text-gray-600">Analyze as many games as you want with no monthly limits</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold mb-2">Team Collaboration</h3>
                <p className="text-sm text-gray-600">Create groups, share clips, and collaborate with your team</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-sm text-gray-600">
                  Track your progress with detailed shooting and performance stats
                </p>
              </CardContent>
            </Card>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-sm text-gray-600">
                  Yes, you can cancel your subscription at any time. You'll continue to have access until the end of
                  your billing period.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What video formats are supported?</h3>
                <p className="text-sm text-gray-600">
                  We support MP4, MOV, and AVI formats up to 2GB in size for optimal processing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How accurate is the AI detection?</h3>
                <p className="text-sm text-gray-600">
                  Our AI has 95%+ accuracy in detecting baskets and improves with community feedback and tagging.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Can I use this for team analysis?</h3>
                <p className="text-sm text-gray-600">
                  Premium includes team features for coaches and players to collaborate and share insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
