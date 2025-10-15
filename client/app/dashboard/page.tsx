"use client"

//useEffect import from version 2 using getSession edit 2 (from 10-10-25 Friday this morning):
//import { getSession } from "next-auth/react";
//useEffect import from version 2 using getSession edit 2 (from 10-10-25 Friday this morning):
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Upload, BarChart3, Users, Clock, Download, Share } from "lucide-react"
import Link from "next/link"
import ProfileDropdown from "../app-components/ProfileDropdown"

interface UserVideo {
  id: string
  url: string
  fileName: string
  uploadedAt: string
  size: number
  processed: boolean
  highlightCount: number
  duration: number
}

export default function DashboardPage() {
  const [userVideos, setUserVideos] = useState<UserVideo[]>([])
  const [loading, setLoading] = useState(true)

  const [me, setMe] = useState<{ name?: string; photo?: string } | null>(null);

  const fetchUserVideos = async () => {
    try {
      const response = await fetch("/api/user-videos?userId=demo-user&limit=20")
      const data = await response.json()

      if (data.success) {
        setUserVideos(data.videos)
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error)
    } finally {
      setLoading(false)
    }
  }
  //useEffect version 1 using getSession edit 1 (remmoved /api/me; from 10-10-25 Friday this morning):
  // useEffect(() => {
  //   let cancelled = false;
  
  //   (async () => {
  //     const r = await fetch("/api/me");
  //     if (!r.ok) {
  //       window.location.href = "/login";
  //       return;
  //     }
  //     const j = await r.json();
  //     if (cancelled) return;
  
  //     setMe(j.user);
  //     // now that we know the user is authenticated, load their data
  //     await fetchUserVideos();
  //   })();
  
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [fetchUserVideos]);
  
  //useEffect version 2 using getSession edit 2 (from 10-10-25 Friday this morning):
  // useEffect(() => {
  //   let cancelled = false;
  //   (async () => {
  //     const s = await getSession();
  //     if (!s?.user) {
  //       window.location.href = "/login?next=/dashboard";
  //       return;
  //     }
  //     if (cancelled) return;
  
  //     setMe({ name: s.user.name ?? undefined, photo: (s.user as any).image ?? undefined });
  //     await fetchUserVideos();
  //   })();
  //   return () => { cancelled = true; };
  // }, []);

  //useEffect version 3 using getSession edit 3 (from 10-10-25 Friday this morning):
  // useEffect(() => {
  //   let cancelled = false;
  //   (async () => {
  //     const r = await fetch("/api/auth/session", {
  //       method: "GET",
  //       credentials: "include",
  //       headers: { Accept: "application/json" },
  //       cache: "no-store",
  //     });
  //     const j = await r.json().catch(() => null);
  
  //     if (!j?.user) {
  //       window.location.href = "/login?next=/dashboard";
  //       return;
  //     }
  //     if (cancelled) return;
  
  //     setMe(j.user);
  //     await fetchUserVideos();
  //   })();
  
  //   return () => { cancelled = true; };
  // }, []);

  //useEffect version 4 MOST RECENT EDIT 10-10-25 Friday - fetch /api/auth/session - removes reliance on /api/me and aligns with NextAuth
  // useEffect(() => {
  //   let cancelled = false;
  //   (async () => {
  //     const r = await fetch("/api/auth/session", { cache: "no-store" });
  //     const data = await r.json().catch(() => null);
  //     if (cancelled) return;
  
  //     if (!data?.user) {
  //       window.location.href = "/login?next=/dashboard";
  //       return;
  //     }
  
  //     // setMe(data.user);
  //     await fetchUserVideos();
  //   })();
  //   return () => { cancelled = true; };
  // }, []);

  useEffect(() => {
    let cancelled = false;
  
    (async () => {
      const r = await fetch("/api/auth/session", { cache: "no-store" });
      const s = await r.json().catch(() => null);
  
      if (!s?.user) {
        window.location.href = "/login";
        return;
      }
      if (cancelled) return;
  
      setMe(s.user);
      await fetchUserVideos();
    })();
  
    return () => { cancelled = true; };
  }, []);
    
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append("video", file)
  formData.append("userId", "demo-user") // optionally pass userId

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
    const data = await res.json()
    if (data.success) {
      fetchUserVideos() // Refresh video list
    }
  } catch (err) {
    console.error("Upload failed", err)
  }
}


  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">HoopTuber</span>
            </Link>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
              <Upload className="w-5 h-5 text-gray-700" />
                <span className="text-sm text-gray-700 font-medium">Upload Video</span>
                <input
                  type="file"
                  accept="video/mp4,video/mov"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </label>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Basketball Videos</h1>
          <p className="text-gray-600">Manage your uploaded videos and generated highlights</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Upload className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{userVideos.length}</p>
                  <p className="text-gray-600 text-sm">Videos Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {userVideos.reduce((sum, video) => sum + video.highlightCount, 0)}
                  </p>
                  <p className="text-gray-600 text-sm">Highlights Created</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {Math.round(userVideos.reduce((sum, video) => sum + video.duration, 0) / 60)}m
                  </p>
                  <p className="text-gray-600 text-sm">Total Footage</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-gray-600 text-sm">Team Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Videos List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Videos ({userVideos.length})</TabsTrigger>
            <TabsTrigger value="processed">Processed ({userVideos.filter((v) => v.processed).length})</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading your videos...</p>
              </div>
            ) : userVideos.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No videos uploaded yet</h3>
                  <p className="text-gray-600 mb-4">Upload your first basketball game to get started!</p>
                  <Button asChild>
                    <Link href="/upload/enhanced">Upload Your First Video</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userVideos.map((video) => (
                  <Card key={video.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{video.fileName}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{formatDuration(video.duration)}</span>
                              <span>{formatFileSize(video.size)}</span>
                              <span>{new Date(video.uploadedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={video.processed ? "default" : "secondary"}>
                                {video.processed ? "Processed" : "Processing"}
                              </Badge>
                              {video.processed && <Badge variant="outline">{video.highlightCount} highlights</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => window.open(video.url, "_blank")}>
                            <Play className="w-4 h-4 mr-2" />
                            Watch
                          </Button>
                          {video.processed && (
                            <>
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                              <Button size="sm" variant="outline">
                                <Share className="w-4 h-4 mr-2" />
                                Share
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {userVideos
              .filter((v) => v.processed)
              .map((video) => (
                <Card key={video.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Play className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{video.fileName}</h3>
                          <p className="text-sm text-gray-600">{video.highlightCount} highlights generated</p>
                          <Badge variant="default">Ready to share</Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" asChild>
                          <Link href={`/highlights/${video.id}`}>View Highlights</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            {userVideos.slice(0, 5).map((video) => (
              <Card key={video.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{video.fileName}</h3>
                        <p className="text-sm text-gray-600">
                          Uploaded {new Date(video.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.open(video.url, "_blank")}>
                      <Play className="w-4 h-4 mr-2" />
                      Watch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}