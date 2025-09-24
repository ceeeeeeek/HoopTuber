"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

// If you're using the shadcn/ui Button, import it.
// Otherwise replace with your own button element.
import { Button } from "@/components/ui/button";

export default function TryFreeUploadButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const onClick = async () => {
    try {
      setPending(true);
      // Ask your Node/Express server if a session exists
      const r = await fetch("/api/me", {
        method: "GET",
        credentials: "include", // send the session cookie
        headers: { "Accept": "application/json" },
      });

      if (r.ok) {
        router.push("/upload");
      } else {
        // Take the user to login and include a `next=/upload` so we can bounce them back
        router.push("/login?next=/upload");
      }
    } catch {
      router.push("/login?next=/upload");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? "Checking…" : "Try Free Upload"}
    </Button>
  );
}
