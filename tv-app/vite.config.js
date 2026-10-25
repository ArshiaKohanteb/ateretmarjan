import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Builds two pages into the site's /tv folder:
//   /tv/        → the TV display
//   /tv/admin/  → the manager dashboard
export default defineConfig({
  root: resolve(__dirname, "tv"),
  base: "/tv/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../tv"),
    emptyOutDir: true,
    target: "es2018",
    rollupOptions: {
      input: {
        display: resolve(__dirname, "tv/index.html"),
        admin: resolve(__dirname, "tv/admin/index.html"),
        flipped: resolve(__dirname, "tv/flipped/index.html"),
      },
    },
  },
  server: { fs: { allow: [resolve(__dirname, "..")] } },
});
