import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/hooks/**", "src/components/**"],
      exclude: [
        "src/lib/db/**",
        "src/components/ui/**",
        "src/**/__tests__/**",
        "src/**/__fixtures__/**",
      ],
      thresholds: {
        "src/lib/**": {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
