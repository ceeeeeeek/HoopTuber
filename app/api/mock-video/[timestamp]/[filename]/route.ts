import type { NextRequest } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { timestamp: string; filename: string } }) {
  const { timestamp, filename } = params

  // Create a mock video response
  const mockVideoContent = `
Mock Basketball Video
Filename: ${decodeURIComponent(filename)}
Uploaded: ${new Date(Number.parseInt(timestamp)).toISOString()}
Duration: 10:30
Resolution: 1920x1080
Size: 45.2 MB

This is a simulated video file for development purposes.
In production, this would be an actual MP4 video file.

Basketball Highlights:
- Shot at 2:15 - Made 3-pointer
- Shot at 4:32 - Missed layup  
- Shot at 6:18 - Made jump shot
- Shot at 8:45 - Made dunk
- Shot at 9:12 - Made free throw

Total Shots: 5
Made Shots: 4
Shooting Percentage: 80%
`

  return new Response(mockVideoContent, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${decodeURIComponent(filename)}.txt"`,
    },
  })
}
