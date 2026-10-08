import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Used only by `npm run eval`. The normal `npm test` never runs these files
// (see vitest.config.ts), because they call the real model and cost money.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "node", include: ["src/**/*.eval.ts"] },
});
