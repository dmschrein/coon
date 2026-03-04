import Anthropic from "@anthropic-ai/sdk";

// Log API key status (not the key itself!)
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY is not set!");
} else if (!process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-")) {
  console.error("❌ ANTHROPIC_API_KEY has invalid format (should start with sk-ant-)");
} else {
  console.log("✅ ANTHROPIC_API_KEY is configured");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
