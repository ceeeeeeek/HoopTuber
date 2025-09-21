// lib/gemini.ts
import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

export const genAI = new GoogleGenerativeAI(apiKey);

// Central helper to get the model you want (default from env or 2.5 Pro)
export function getModel(id = process.env.GAI_MODEL ?? "gemini-2.5-pro") {
  return genAI.getGenerativeModel({ model: id });
}
