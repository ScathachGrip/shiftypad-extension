import { join } from "path";
import { readdir } from "node:fs/promises";
import { $ } from "bun";

/**
 * Build Script for shiftypad-extension.
 * Uses Bun.build() (native) for production-ready bundling.
 */

const root = join(import.meta.dir, "..");
const updatedVersion = (await Bun.file(join(root, "package.json")).json()).version;

// 1. Clean dist
console.log("🧹 Cleaning dist...");
await $`bun run clean`.cwd(root);

// 2. Build with Bun.build() — native, no esbuild dependency
console.log("🚀 Building with Bun.build()...");

const srcDir = join(root, "src");
const glob = new Bun.Glob("**/*.{ts,tsx}");
const entrypoints: string[] = [];
for await (const file of glob.scan({ cwd: srcDir })) {
  entrypoints.push(join(srcDir, file));
}

const result = await Bun.build({
  entrypoints,
  root: srcDir,
  outdir: join(root, "dist"),
  target: "browser",
  splitting: false,
  minify: true,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// 3. Asset Handling
const popupHtmlTemplate = `<!doctype html>
<head>
  <meta charset="UTF-8">
  <script src="apexcharts.min.js"></script>
  <script type="module" src="popup.js"></script>
</head>
<body></body>
</html>
`;

// Copy other HTML files
const srcFiles = await readdir(join(root, "src"));
for (const file of srcFiles) {
  if (file.endsWith(".html") && file !== "popup.html") {
    await Bun.write(join(root, "dist", file), Bun.file(join(root, "src", file)));
  }
}

// Write popup.html
await Bun.write(join(root, "dist", "popup.html"), popupHtmlTemplate);

// 4. Download Apex
await $`bun ci/downloadApex.ts`.cwd(root);

// 5. Update manifest version
const manifestFile = Bun.file(join(root, "manifest.json"));
const manifest = await manifestFile.json();
manifest.version = updatedVersion;

await Bun.write(manifestFile, JSON.stringify(manifest, null, 2));
await Bun.write(join(root, "dist", "manifest.json"), JSON.stringify(manifest, null, 2));

console.log("✨ Build complete! (Restored to production-ready output)");
