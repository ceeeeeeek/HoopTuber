"use client";

import React, { useState } from "react";

export default function InviteLinkModal({ open, onClose, url }) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
        
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Share invite link
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">
            Invite link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 border rounded px-2 py-1 text-xs bg-gray-50"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {copied && (
          <p className="text-[11px] text-green-600">
            Link copied to clipboard
          </p>
        )}
      </div>
    </div>
  );
}
