//client/app/app-components/WarmAuthClient.tsx - Wednesday 10-22-25 Update
//This is for client warm-up of nextauth to assist with dev mode only (Not that important for production mode)
//WarmAuthClient.tsx is used to warm the client side, not only the server side with client\app\app-components\WarmAuthServer.tsx 
//A tiny client “warm-up” that a. guarantees the app is hydrated before we show an interactive button 
//and b. preloads the next-auth client code by calling getSession() once on mount.

"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function WarmAuthClient() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);               //Flag that hydration is done
    //Load next-auth client bundle + prime session cache
    getSession().catch(() => {});
    //Prefetch the routes your button might visit
    router.prefetch("/upload");
    router.prefetch("/login?next=/upload");
  }, [router]);

  //Render nothing; it just warms things up
  return null;
}
