
// client/app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import DashboardClient from "./DashboardClient2";

export default function Page() {
  return <DashboardClient />;
}