import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5273,
    strictPort: true,
    host: host ?? false,
    hmr: host ? { protocol: "ws", host, port: 5274 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    rollupOptions: {
      input: {
      main: new URL("./index.html", import.meta.url).pathname,
      companion: new URL("./companion.html", import.meta.url).pathname,
    },
    },

    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari15",

    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
    restoreMocks: true,
    pool: "threads",
    maxWorkers: 2,

    isolate: false,
  },
});
