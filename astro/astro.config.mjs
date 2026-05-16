import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://scathachgrip.github.io/shiftypad-extension",
  outDir: "dist",
  build: {
    format: "file",
  },
});
