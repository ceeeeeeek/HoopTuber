"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle, XCircle, Loader2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image"

// "https://hooptuber-fastapi-web-service-docker.onrender.com"
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-devtest.onrender.com"
console.log("API_BASE = ", API_BASE)

type Status = "loading" | "success" | "error" | "no-email";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");

    if (!emailParam) {
      setStatus("no-email");
      return;
    }

    setEmail(emailParam);

    fetch(`${API_BASE}/unsubscribe?email=${emailParam}`)
      .then(res => res.text())
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, []);

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "error":
        return <XCircle className="w-16 h-16 text-red-500" />;
      case "no-email":
        return <Mail className="w-16 h-16 text-gray-400" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case "loading":
        return "Processing...";
      case "success":
        return "Successfully Unsubscribed";
      case "error":
        return "Something Went Wrong";
      case "no-email":
        return "No Email Provided";
    }
  };

  const getMessage = () => {
    switch (status) {
      case "loading":
        return "Please wait while we process your unsubscribe request.";
      case "success":
        return `${email} has been successfully unsubscribed from our mailing list. You will no longer receive emails from us.`;
      case "error":
        return "We encountered an error while processing your request. Please try again later or contact support.";
      case "no-email":
        return "No email address was provided in the unsubscribe link. Please check the link and try again.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="flex items-center justify-center">
              <Image
              src="/hooptubericon2.png"
              alt="HoopTuber Logo"
              width={60}
              height={20}
              className="object-contain"
              priority
              />
                
              
            </div>
            <span className="text-2xl font-bold text-gray-900">HoopTuber</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Unsubscribe</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              {getIcon()}
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {getTitle()}
              </h2>
              <p className="text-gray-600 text-sm">
                {getMessage()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                asChild
              >
                <Link href="/">
                  Return to Home
                </Link>
              </Button>

              {status === "error" && (
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/contact">
                    Contact Support
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
