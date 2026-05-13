import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/CSC-710-AI-Calendar/",
  resolve: {
    alias: [
      // Map Deno-style specifiers used by the Edge Function source to the
      // npm-installed equivalents so Vitest can integration-test
      // `supabase/functions/ai-assistant/loop.ts`. Anthropic SDK is only
      // imported as `import type` from the Edge Function code so esbuild
      // erases it — no runtime alias needed there.
      { find: /^npm:zod@.*/, replacement: "zod" },
      { find: /^npm:@anthropic-ai\/sdk@.*/, replacement: "@anthropic-ai/sdk" },
      { find: /^jsr:@supabase\/supabase-js@.*/, replacement: "@supabase/supabase-js" },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "tests/e2e/**"]
  }
});
