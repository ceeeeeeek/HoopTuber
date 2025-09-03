// app/api/check-env/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getModel } from "@/lib/gemini"; // ensures gemini client is wired up

export async function GET() {
  try {
    // ---- Gemini / Google AI env checks ----
    const geminiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      "";

    const hasGeminiKey = geminiKey.length > 0;
    const keyPrefix = hasGeminiKey ? `${geminiKey.slice(0, 6)}...` : null;

    // Your helper defaults to "gemini-2.5-pro" if GAI_MODEL not set
    const modelId = process.env.GAI_MODEL ?? "gemini-2.5-pro";

    // Synchronous sanity check that we can instantiate a model
    let canInstantiateModel = false;
    try {
      getModel(modelId);
      canInstantiateModel = true;
    } catch {
      canInstantiateModel = false;
    }

    // ---- Generic env info (no Vercel fields) ----
    const nodeEnv = process.env.NODE_ENV || "unknown";
    const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);

    return NextResponse.json({
      gemini: {
        hasKey: hasGeminiKey,
        keyPrefix,
        modelId,
        canInstantiateModel,
      },
      env: {
        nodeEnv,
        isRender,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Environment check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
