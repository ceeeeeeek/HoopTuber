"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/useAuth";

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
  const { user: currentUser, loading: authLoading } = useAuth();

  const onClick = () => {
    // If user is authenticated, go to upload page
    // Otherwise, go to login with redirect back to upload
    if (currentUser) {
      router.push("/upload");
    } else {
      router.push("/login?next=/upload");
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={authLoading}
      className={className}
    >
      {authLoading ? (
        "Loading…"
      ) : (
        <span className="inline-flex items-center">
          {withIcon && <Smartphone className="w-5 h-5 mr-2" />}
          {children}
        </span>
      )}
    </Button>
  );
}
