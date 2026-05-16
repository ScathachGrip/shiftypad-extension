import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://shiftypad.scathach.id",
  base: "/",
  outDir: "dist",
  build: {
    format: "file",
  },
});
