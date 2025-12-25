"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "../../lib/firebase"; // Adjust path to your firebase config
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the special code from the link
  const mode = searchParams.get("mode");
  const actionCode = searchParams.get("oobCode");

  useEffect(() => {
    // If no code, just redirect home
    if (!actionCode) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    // Handle Email Verification
    if (mode === "verifyEmail") {
      applyActionCode(auth, actionCode)
        .then(() => {
          setStatus("success");
          setMessage("Email verified successfully! You can now log in.");
          // Optional: Auto-redirect after 3 seconds
          setTimeout(() => router.push("/login"), 3000);
        })
        .catch((error) => {
          console.error(error);
          setStatus("error");
          // Handle specific error codes
          if (error.code === 'auth/invalid-action-code') {
            setMessage("This link has expired or has already been used.");
          } else {
            setMessage("Verification failed. Please try again.");
          }
        });
    } else if (mode === "resetPassword") {
      // If you use this same logic for password resets later
      router.push(`/reset-password?oobCode=${actionCode}`);
    } else {
      setStatus("error");
      setMessage("Unknown action.");
    }
  }, [actionCode, mode, router]);

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-center flex flex-col items-center gap-2">
          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin text-orange-500" />}
          {status === "success" && <CheckCircle className="h-10 w-10 text-green-500" />}
          {status === "error" && <XCircle className="h-10 w-10 text-red-500" />}
          
          <span>
            {status === "loading" && "Verifying..."}
            {status === "success" && "Success!"}
            {status === "error" && "Error"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-gray-600">{message}</p>
        
        {status !== "loading" && (
          <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
            <Link href="/login">Back to Login</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      {/* Suspense is required when using useSearchParams in Next.js App Router */}
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}