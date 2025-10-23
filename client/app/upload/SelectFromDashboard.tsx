//client/app/upload/SelectFromDashboard.tsx- Wednesday 10-22-25 Update
//Small component for reusing uploaded files from dashboard.
//Lets a user pick an existing raw video instead of uploading new.

//NEW — lets a user pick one of their existing Raw videos.

"use client"

import { useEffect, useState } from "react"

type RawItem = {
  id: string
  fileName: string
  size: number
  uploadedAt: string
  url: string
}

export default function SelectFromDashboard({
  onSelect,
}: {
  onSelect: (item: RawItem | null) => void
}) {
  const [items, setItems] = useState<RawItem[]>([])
  const [selected, setSelected] = useState<string>("")

  useEffect(() => {
    ;(async () => {
      const r = await fetch("/api/rawVideos?limit=100", { cache: "no-store" })
      const j = await r.json()
      if (j?.success) {
        setItems(
          (j.videos as any[]).map((v) => ({
            id: v.id,
            fileName: v.fileName,
            size: v.size,
            uploadedAt: v.uploadedAt,
            url: v.url,
          }))
        )
      }
    })()
  }, [])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Use an existing upload</label>
      <select
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        value={selected}
        onChange={(e) => {
          const id = e.target.value
          setSelected(id)
          const found = items.find((x) => x.id === id) || null
          onSelect(found)
        }}
      >
        <option value="">— Select a raw video —</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {new Date(it.uploadedAt).toLocaleDateString()} — {it.fileName} ({Math.round(it.size / 1024 / 1024)} MB)
          </option>
        ))}
      </select>
    </div>
  )
}
