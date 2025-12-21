//12-11-25 Thursday 11pm - Visibility Warning modal whenever user tries to change the Visibility of a run from 'Private' to 'Public' in the 'My Runs' gallery on the my-runs page

"use client";

import React from "react";

export default function VisibilityWarningModal({
  open,
  onCancel,
  onConfirm
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl mb-3">
            !
          </div>

          <h2 className="text-lg font-semibold">Make this run public?</h2>
          <p className="text-gray-600 mt-2 text-sm">
            If made public, this run will also be presented on the{" "}
            <strong>Join a Run</strong> page.
            <br />
            Are you sure you want to make this run public?
          </p>

          <div className="mt-5 flex gap-3">
            <button
              className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
              onClick={onConfirm}
            >
              Yes, make public
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
