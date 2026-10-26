import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.env.TZ = "Europe/London";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    css: false,
    env: { TZ: "Europe/London" },
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "") } },
});
