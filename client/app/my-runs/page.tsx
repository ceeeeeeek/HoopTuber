//client/app/my-runs/page.tsx - 11-18-25 Tuesday Version 3pm

//11-18-25 Tuesday 3pm - Created My Runs Page
//my-runs Page + Gallery
//Will be plugged in later into backend - Firestore collection 'runs' for Runs
//Each run document in firesore will include the fields:
//{
//     "runId": "...",
//     "name": "Wednesday Run",
//     "ownerEmail": "…",
//     "createdAt": "...",
//     "visibility": "public" | "private",
//     "members": ["userA@gmail.com", "userB@gmail.com"],
//     "videoIds": ["jobid1", "jobid2"]
//   }
//-----------
//There will be GET /runs?ownerEmail=…, POST /runs, PATCH /runs/{runId}, POST /runs/{runId}/join, DELETE /runs/{runId}/leave

// client/app/my-runs/page.tsx
// Converted to client component to use Firebase auth

"use client";

import MyRunsClient from "./MyRunsClient";


export default function MyRunsPage() {
  // MyRunsClient now handles auth internally with useAuth hook
  // and redirects to login if not authenticated
  return <MyRunsClient />;
}