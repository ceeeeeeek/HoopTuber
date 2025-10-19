//Remove cases of /api/me

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import clsx from "clsx";

type ButtonProps = React.ComponentProps<typeof Button>;

type Props = {
  withIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
} & Pick<ButtonProps, "size" | "variant">;

export default function TryFreeUploadButton({
  size = "lg",
  variant = "default",
  withIcon = true,
  className,
  children = "Try Free Upload",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  //My onClick function (from Friday 10-10-2025)
  // const onClick = async () => {
  //   try {
  //     setPending(true);
  
  //     const r = await fetch("/api/auth/session", {
  //       method: "GET",
  //       credentials: "include",
  //       headers: { Accept: "application/json" },
  //       cache: "no-store",
  //     });
  
  //     const data = await r.json().catch(() => null);
  //     const isAuthed = !!data?.user;         // <- the *only* reliable check
  
  //     router.push(isAuthed ? "/upload" : "/login?next=/upload");
  //   } finally {
  //     setPending(false);
  //   }
  // };

  // const onClick = async () => {
  //   try {
  //     setPending(true);
  //     // Ask your Node/Express server if a session exists
  //     const r = await fetch("/api/auth/session", {
  //       method: "GET",
  //       credentials: "include",
  //       headers: { Accept: "application/json" },
  //     });
  //     // Take the user to login and include a `next=/upload` so we can bounce them back
  //     const data = await r.json()
  //     const isLoggedIn = !!data?.user;
      
  //     router.push(r.ok ? "/upload" : "/login?next=/upload");
  //   } catch {
  //     router.push("/login?next=/upload");
  //   } finally {
  //     setPending(false);
  //   }
  // };

  //10-19-25 Sunday 2:48pm edit -
  //your current button still routes based on r.ok, not on whether there’s a user in the session JSON, so it will keep sending you to /upload even when logged out. 
  //r.ok is always 200 for /api/auth/session (logged-in returns { user: … }, logged-out returns { }). You must branch on data?.user, not r.ok.
  //Here’s a corrected, drop-in onClick (add cache: "no-store" to avoid stale responses):
  const onClick = async () => {
    try {
      setPending(true);
  
      const r = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
  
      // NextAuth returns 200 whether logged in or not.
      // Only trust the presence of `data.user`.
      const data = await r.json().catch(() => null);
      const isAuthed = !!data?.user;
  
      router.push(isAuthed ? "/upload" : "/login?next=/upload");
    } catch {
      router.push("/login?next=/upload");
    } finally {
      setPending(false);
    }
  };
  

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={pending}
      className={className}
    >
      {pending ? (
        "Checking…"
      ) : (
        <span className="inline-flex items-center">
          {withIcon && <Smartphone className="w-5 h-5 mr-2" />}
          {children}
        </span>
      )}
    </Button>
  );
}
