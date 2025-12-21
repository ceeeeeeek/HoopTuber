//client/app/my-runs/page.tsx - 11-18-25 Tuesday Version 3pm 

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MyRunsClient from "./MyRunsClient";

export default async function MyRunsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?next=/my-runs");
  }

  return <MyRunsClient />;
}
