import { join } from "path";
import { existsSync, lstatSync } from "node:fs";
import { zipSync } from "fflate";

/**
 * Release script for shiftypad-extension.
 * Packages the build artifacts into a ZIP file for distribution.
 * CRITICAL: Matches the exact structure of the stable production build.
 */

const root = join(import.meta.dir, "..");
const pkg = await Bun.file(join(root, "package.json")).json();
const distPath = join(root, "dist");

if (!existsSync(distPath)) {
  console.error("❌ dist directory missing. Please run 'bun run build' first.");
  process.exit(1);
}

console.log("📦 Creating release ZIP (matching stable structure)...");

const entries: Record<string, Uint8Array> = {};

async function addFile(zipKey: string, fsPath: string): Promise<void> {
  entries[zipKey] = new Uint8Array(await Bun.file(fsPath).arrayBuffer());
}

// 1. Add manifest and public documents from root
const publicFiles = [
  "manifest.json",
  "CLOSING_REMARKS.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE"
];

for (const file of publicFiles) {
  const filePath = join(root, file);
  if (existsSync(filePath)) await addFile(file, filePath);
}

// 2. Add icons and assets folders preserving structure
for (const folder of ["icons", "assets"]) {
  const folderPath = join(root, folder);
  if (existsSync(folderPath)) {
    const folderGlob = new Bun.Glob("**/*");
    for await (const rel of folderGlob.scan({ cwd: folderPath })) {
      const fullPath = join(folderPath, rel);
      if (lstatSync(fullPath).isFile()) await addFile(`${folder}/${rel}`, fullPath);
    }
  }
}

// 3. Add EVERYTHING from dist into a "dist/" prefix in the ZIP
// Glob-relative paths map 1:1 to ZIP keys, e.g. dist/popup/popupActions.js
const distGlob = new Bun.Glob("**/*");
for await (const rel of distGlob.scan({ cwd: distPath })) {
  const fullPath = join(distPath, rel);
  if (lstatSync(fullPath).isFile()) await addFile(`dist/${rel}`, fullPath);
}

// 4. Output as original filename
const outPath = join(root, `${pkg.name}.zip`);
await Bun.write(outPath, zipSync(entries));

console.log(`✨ RELEASE CREATED: ${outPath}`);