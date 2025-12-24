
// client/app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import DashboardClient from "./DashboardClientNewUI";

export default function Page() {
  return <DashboardClient />;
}