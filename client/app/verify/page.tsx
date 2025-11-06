"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  const search = useSearchParams();
  const status = search.get("status") || "success";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="bg-white shadow-lg rounded-xl p-10 text-center max-w-md">
        {status === "success" ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Email Verified!</h1>
            <p className="text-gray-600 mb-6">
              Your account has been successfully verified. You can now log in and start using HoopTuber.
            </p>
            <Link
              href="/login"
              className="inline-block bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600"
            >
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-red-600">Invalid Link</h1>
            <p className="text-gray-600 mb-6">
              This verification link is invalid or has already been used.
            </p>
            <Link
              href="/login"
              className="inline-block bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
