"use client";

import React, { useState } from "react";

export default function CreateRunModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative border border-orange-300">
        
        {/* Hoop Icon */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white rounded-full h-12 w-12 flex items-center justify-center shadow-md">
          🏀
        </div>

        <h2 className="text-lg font-semibold text-gray-900 text-center mt-6">
          Name your run
        </h2>

        <input
          type="text"
          placeholder="Ex: Wednesday Basketball Group"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-4 w-full border rounded-md p-2 text-sm"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md border hover:bg-gray-100 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm"
            onClick={() => {
              if (name.trim().length > 0) {
                onCreate(name.trim());
                setName("");
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}