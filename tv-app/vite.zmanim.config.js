import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Builds the public zmanim page into the site's /zmanim folder (ateretmarjan.org/zmanim).
export default defineConfig({
  root: resolve(__dirname, "zmanim-page"),
  base: "/zmanim/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../zmanim"),
    emptyOutDir: true,
    target: "es2018",
  },
  server: { fs: { allow: [resolve(__dirname, "..")] } },
});
