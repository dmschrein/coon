import OpenAI from "openai";

let _openai: OpenAI | null = null;

/**
 * Lazily creates the OpenAI client on first use.
 * Prevents the app from crashing at import time when OPENAI_API_KEY is missing —
 * only image generation routes will fail, not the entire app.
 */
export function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local to enable image generation."
      );
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}
