// client/app/dashboard/RawVsHighlightsSection.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Download, Share, Trash2, Pencil, Upload as UploadIcon, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

type RawRow = {
  id: string
  url: string
  fileName: string
  uploadedAt: string
  size: number
  processed: boolean
  highlightCount: number
  duration: number
}

type HighlightRow = {
  id: string
  jobId: string
  downloadUrl: string
  title?: string | null
  isPublic?: boolean
  createdAtIso: string
  stats?: {
    totalShots: number
    madeShots: number
    shootingPercentage: number
  } | null
}

// Make the same base your /upload page uses
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export default function RawVsHighlightsSection() {
  const [active, setActive] = useState<"raw" | "highlights">("raw")
  const [raws, setRaws] = useState<RawRow[]>([])
  const [highs, setHighs] = useState<HighlightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState("")
  const router = useRouter()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = async (tab: "raw" | "highlights") => {
    setLoading(true)
    try {
      if (tab === "raw") {
        const r = await fetch("/api/rawVideos?limit=50", { cache: "no-store" })
        const j = await r.json()
        if (j?.success) setRaws(j.videos)
      } else {
        const r = await fetch("/api/highlightVideos?limit=50", { cache: "no-store" })
        const j = await r.json()
        if (j?.success) setHighs(j.highlights)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const fmtSize = (b: number) => {
    const s = ["Bytes", "KB", "MB", "GB"]
    if (b === 0) return "0 Bytes"
    const i = Math.floor(Math.log(b) / Math.log(1024))
    return Math.round((b / Math.pow(1024, i)) * 100) / 100 + " " + s[i]
  }
  const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`

  // ---------- Actions: rename / delete ----------
  const renameDoc = async (kind: "raw" | "highlight", id: string, nextName: string) => {
    if (!nextName.trim()) return
    const url = kind === "raw" ? "/api/rawVideos" : "/api/highlightVideos"
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fileName: nextName, title: nextName }), // allow both fields
    })
    if (r.ok) {
      if (kind === "raw") {
        setRaws((prev) => prev.map((x) => (x.id === id ? { ...x, fileName: nextName } : x)))
      } else {
        setHighs((prev) => prev.map((x) => (x.id === id ? { ...x, title: nextName } : x)))
      }
      setRenamingId(null)
      setRenameText("")
    }
  }

  const deleteDoc = async (kind: "raw" | "highlight", id: string) => {
    const url = kind === "raw" ? `/api/rawVideos?id=${encodeURIComponent(id)}` : `/api/highlightVideos?id=${encodeURIComponent(id)}`
    const r = await fetch(url, { method: "DELETE" })
    if (r.ok) {
      if (kind === "raw") setRaws((prev) => prev.filter((x) => x.id !== id))
      else setHighs((prev) => prev.filter((x) => x.id !== id))
    }
  }

  // ---------- Upload to profile (RAW only) ----------
  const onPickRawFromComputer = () => fileInputRef.current?.click()

  const uploadRawToProfile = async (file: File) => {
    // 1) upload the binary to your API (preferred path)
    // Try /upload-raw, fallback to /upload?raw=1
    const fd = new FormData()
    fd.append("video", file)

    let apiRes: Response | null = null
    try {
      apiRes = await fetch(`${API_BASE}/upload-raw`, { method: "POST", body: fd })
      if (!apiRes.ok) throw new Error(`upload-raw ${apiRes.status}`)
    } catch {
      const res2 = await fetch(`${API_BASE}/upload?raw=1`, { method: "POST", body: fd })
      if (!res2.ok) throw new Error(`upload?raw=1 ${res2.status}`)
      apiRes = res2
    }

    // Expect backend returns something like { gcsUri, url? }
    const apiJson = await apiRes.json().catch(() => ({} as any))
    const sourceUri = apiJson.gcsUri || apiJson.videoGcsUri || null
    const url = apiJson.url || apiJson.httpUrl || "" // optional

    // 2) create Raw doc
    const createRes = await fetch("/api/rawVideos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        size: file.size,
        sourceUri,
        url,
        duration: 0,
      }),
    })
    if (!createRes.ok) throw new Error("failed to create Raw record")

    // reload list
    await load("raw")
  }

  // ---------- Send to AI (RAW -> /upload) ----------
  const sendRawToAI = (id: string) => {
    router.push(`/upload?preselect=${encodeURIComponent(id)}`)
  }

  // ---------- Publish toggle (Highlights) ----------
  const togglePublish = async (h: HighlightRow) => {
    const next = !h.isPublic
    const r = await fetch("/api/highlightVideos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: h.id, isPublic: next }),
    })
    if (r.ok) setHighs((prev) => prev.map((x) => (x.id === h.id ? { ...x, isPublic: next } : x)))
  }

  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="w-full">
      <TabsList>
        <TabsTrigger value="raw">Raw Videos</TabsTrigger>
        <TabsTrigger value="highlights">Highlight Videos</TabsTrigger>
      </TabsList>

      {/* RAW TAB */}
      <TabsContent value="raw">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={async (e) => {
            // Capture the element BEFORE any await
            const inputEl = e.currentTarget;              // <-- keep a safe reference
            const file = inputEl.files?.[0];
          
            // Clear immediately so the same file can be re-selected later
            inputEl.value = "";
          
            if (!file) return;
          
            setLoading(true);
            try {
              await uploadRawToProfile(file);
            } catch (err) {
              console.error("Raw upload failed:", err);
            } finally {
              setLoading(false);
              // Don't touch e.currentTarget here — we already cleared via inputEl
                //e.currentTarget.value = "";
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }}
        />

        {/* Empty state */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
            <p className="text-gray-600 mt-2">Loading raw videos...</p>
          </div>
        ) : raws.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-gray-600">No raw videos yet.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={onPickRawFromComputer} className="bg-orange-500 hover:bg-orange-600">
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Upload from Computer to User Profile
                </Button>
                <Button variant="outline" onClick={() => router.push("/upload")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upload raw video for AI analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* RAW toolbar (exclusive) */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Button onClick={onPickRawFromComputer} className="bg-orange-500 hover:bg-orange-600">
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload from Computer to User Profile
              </Button>
              <Button variant="outline" onClick={() => router.push("/upload")}>
                <Sparkles className="w-4 h-4 mr-2" />
                Upload raw video for AI analysis
              </Button>
            </div>

            <div className="space-y-4">
              {raws.map((v) => (
                <Card key={v.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Play className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          {renamingId === v.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={renameText}
                                onChange={(e) => setRenameText(e.target.value)}
                                className="max-w-xs"
                              />
                              <Button size="sm" onClick={() => renameDoc("raw", v.id, renameText)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <h3 className="font-semibold">{v.fileName}</h3>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{fmtDur(v.duration)}</span>
                            <span>{fmtSize(v.size)}</span>
                            <span>{new Date(v.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={v.processed ? "default" : "secondary"}>
                              {v.processed ? "Processed" : "Unprocessed"}
                            </Badge>
                            {v.processed && <Badge variant="outline">{v.highlightCount} highlights</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(v.url, "_blank")}>
                          <Play className="w-4 h-4 mr-2" />
                          Watch
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => sendRawToAI(v.id)}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Send to AI
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRenamingId(v.id)
                            setRenameText(v.fileName)
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteDoc("raw", v.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </TabsContent>

      {/* HIGHLIGHTS TAB */}
      <TabsContent value="highlights">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
            <p className="text-gray-600 mt-2">Loading highlights...</p>
          </div>
        ) : highs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">No highlights yet. Process a raw video to create one.</p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => router.push("/upload")}>
                Go to Upload Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {highs.map((h) => (
              <Card key={h.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {renamingId === h.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button size="sm" onClick={() => renameDoc("highlight", h.id, renameText)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <h3 className="font-semibold">{h.title ?? "Highlight"}</h3>
                      )}

                      <div className="text-sm text-gray-600">
                        {new Date(h.createdAtIso).toLocaleString()} &middot; {h.isPublic ? "Public" : "Private"}
                      </div>
                      {h.stats && (
                        <div className="text-sm text-gray-700 mt-1">
                          {h.stats.madeShots}/{h.stats.totalShots} • {h.stats.shootingPercentage}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(h.downloadUrl, "_blank")}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => togglePublish(h)}>
                        <Share className="w-4 h-4 mr-2" />
                        {h.isPublic ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRenamingId(h.id)
                          setRenameText(h.title ?? "")
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteDoc("highlight", h.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
