
// client/app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import DashboardClient from "./DashboardClient2";
import AuthGuard from "@/components/authGuard";

export default function Page() {
  return (
    <AuthGuard>
      <DashboardClient />
    </AuthGuard>
  );
}