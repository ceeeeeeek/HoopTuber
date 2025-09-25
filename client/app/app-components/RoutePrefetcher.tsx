"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // add any routes you want “hot” right after first paint
    router.prefetch("/upload");
    router.prefetch("/login");
    router.prefetch("/dashboard");
  }, [router]);

  return null;
}
