//TryFreeUploadButton.tsx - Wednesday 10-22-25 Update

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { getSession } from "next-auth/react";

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
  //10-22-25 Wednesday 11:35pm edit
  const [mounted, setMounted] = React.useState(false);
  //10-22-25 Wednesday 11:35pm edit

  //Prefetch target routes so navigation is instant on first click
  React.useEffect(() => {
    //10-22-25 Wednesday 11:35pm edit
    setMounted(true); 
    //10-22-25 Wednesday 11:35pm edit
    router.prefetch("/upload");
    router.prefetch("/login?next=/upload");
  }, [router]);

  //10-22-25 Wednesday 11:35pm edit -
  const onClick = async () => {
    if (pending) return;
    try {
      setPending(true);
      const session = await getSession(); //Ensures next-auth client is loaded
      router.push(session?.user ? "/upload" : "/login?next=/upload");
    } catch {
      router.push("/login?next=/upload");
    } finally {
      setPending(false);
    }
  };

  //Avoid an unhydrated, non-functional button flash:
  if (!mounted) {
    return (
      <Button type="button" size={size} variant={variant} disabled className={className}>
        <span className="inline-flex items-center">
          {withIcon && <Smartphone className="w-5 h-5 mr-2" />}
          Loading…
        </span>
      </Button>
    );
  }
  //10-22-25 Wednesday 11:35pm edit 

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
