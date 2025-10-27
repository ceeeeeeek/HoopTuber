//client/app/dashboard/page.tsx - 10-22-25 Wednesday Update
//"use client"
//No longer need "use client" in page.tsx because DashboardClient.tsx is the client component.

// // Server component wrapper — renders the client-only dashboard UI
// import DashboardClient from "./DashboardClient";

// export default function Page() {
//   return <DashboardClient />;
// }
//---------------------------------------------------------
//client/app/dashboard/page.tsx - 10-26-25 Sunday Update
import DashboardClient from "./DashboardClient";

export default function Page() {
  return <DashboardClient />; // UNCHANGED placement of the client component
}


