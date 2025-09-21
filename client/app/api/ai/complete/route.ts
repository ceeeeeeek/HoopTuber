// app/api/ai/complete/route.ts
export const runtime = "nodejs"; // use Node on Render

import { NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const model = getModel(); // defaults to GAI_MODEL or "gemini-2.5-pro"
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "AI request failed" },
      { status: 500 }
    );
  }
}
