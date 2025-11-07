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
  children = "Join The Waitlist",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const onClick = async () => {
    try {
      setPending(true);
      const r = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      // Take the user to login and include a `next=/waitlist` so we can bounce them back
      const data = await r.json()
      const isLoggedIn = !!data?.user;

      router.push(r.ok ? "/waitlist" : "/login?next=/waitlist");
    } catch {
      router.push("/login?next=/waitlist");
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
