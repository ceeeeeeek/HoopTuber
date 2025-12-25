"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Heart, MessageCircle, Share, Bookmark, Users, Trophy, Plus } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const mockClips = [
  {
    id: 1,
    user: { name: "Mike Johnson", avatar: "/placeholder.svg?height=40&width=40", username: "@mikej" },
    title: "Clutch 3-pointer in overtime! 🔥",
    duration: "0:32",
    likes: 124,
    comments: 18,
    shares: 7,
    isLiked: false,
    tags: ["clutch", "3pointer", "overtime"],
    group: "Lakers Squad",
  },
  {
    id: 2,
    user: { name: "Sarah Chen", avatar: "/placeholder.svg?height=40&width=40", username: "@sarahc" },
    title: "Perfect form on this fadeaway 💯",
    duration: "0:28",
    likes: 89,
    comments: 12,
    shares: 4,
    isLiked: true,
    tags: ["fadeaway", "technique", "smooth"],
    group: "Warriors Team",
  },
  {
    id: 3,
    user: { name: "Alex Rivera", avatar: "/placeholder.svg?height=40&width=40", username: "@alexr" },
    title: "Ankle breaker crossover to the rim! 😤",
    duration: "0:41",
    likes: 203,
    comments: 31,
    shares: 15,
    isLiked: false,
    tags: ["crossover", "anklebreaker", "dunk"],
    group: "Street Ballers",
  },
]

export default function FeedPage() {
  const [likedClips, setLikedClips] = useState<number[]>([2])

  const toggleLike = (clipId: number) => {
    setLikedClips((prev) => (prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId]))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center space-x-4">
              <Button size="sm" variant="outline" asChild>
                <Link href="/upload">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload
                </Link>
              </Button>
              <Avatar>
                <AvatarImage src="/placeholder.svg?height=32&width=32" />
                <AvatarFallback>YU</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Navigation Tabs */}
          <Tabs defaultValue="my-group" className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-group" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                My Group
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex items-center">
                <Trophy className="w-4 h-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="following" className="flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                Following
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-group" className="space-y-6">
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-2">Lakers Squad</h2>
                <p className="text-gray-600 text-sm">5 members • 12 clips this week</p>
              </div>
              {mockClips.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  isLiked={likedClips.includes(clip.id)}
                  onToggleLike={() => toggleLike(clip.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="trending" className="space-y-6">
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-2">🔥 This Week's Best</h2>
                <p className="text-gray-600 text-sm">Top clips from the community</p>
              </div>
              {mockClips
                .slice()
                .reverse()
                .map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    isLiked={likedClips.includes(clip.id)}
                    onToggleLike={() => toggleLike(clip.id)}
                  />
                ))}
            </TabsContent>

            <TabsContent value="following" className="space-y-6">
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-2">Following</h2>
                <p className="text-gray-600 text-sm">Latest from players you follow</p>
              </div>
              {mockClips.slice(0, 2).map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  isLiked={likedClips.includes(clip.id)}
                  onToggleLike={() => toggleLike(clip.id)}
                />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function ClipCard({
  clip,
  isLiked,
  onToggleLike,
}: {
  clip: (typeof mockClips)[0]
  isLiked: boolean
  onToggleLike: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* User Info */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={clip.user.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {clip.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{clip.user.name}</p>
              <p className="text-gray-500 text-xs">{clip.user.username}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {clip.group}
          </Badge>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-gray-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <Button size="lg" variant="secondary" className="rounded-full">
              <Play className="w-8 h-8" />
            </Button>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {clip.duration}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold mb-2">{clip.title}</h3>
          <div className="flex flex-wrap gap-1 mb-3">
            {clip.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onToggleLike}
                className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                <span className="text-sm">{clip.likes + (isLiked && !clip.isLiked ? 1 : 0)}</span>
              </button>
              <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{clip.comments}</span>
              </button>
              <button className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors">
                <Share className="w-5 h-5" />
                <span className="text-sm">{clip.shares}</span>
              </button>
            </div>
            <button className="text-gray-600 hover:text-orange-500 transition-colors">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
