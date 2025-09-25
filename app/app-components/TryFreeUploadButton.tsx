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

  const onClick = async () => {
    try {
      setPending(true);
      // Ask your Node/Express server if a session exists
      const r = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      // Take the user to login and include a `next=/upload` so we can bounce them back
      router.push(r.ok ? "/upload" : "/login?next=/upload");
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
