import { join } from "path";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { $ } from "bun";

/**
 * ExtensionBuilder - Orchestrates the build process for the shiftypad-extension.
 */
class ExtensionBuilder {
  private readonly root = join(import.meta.dir, "..");
  private readonly distDir = join(this.root, "dist");
  private readonly srcDir = join(this.root, "src");

  /**
   * Cleans the build directory by removing existing artifacts.
   * @returns A promise that resolves when the cleaning is complete.
   */
  private async clean(): Promise<void> {
    console.log("Cleaning dist...");
    await $`bun run clean`.cwd(this.root);
  }

  /**
   * Bundles the source code using the native Bun.build API.
   * @returns A promise that resolves when the bundling is complete.
   */
  private async bundle(): Promise<void> {
    console.log("Building with Bun.build()...");
    const glob = new Bun.Glob("**/*.{ts,tsx}");
    const entrypoints: string[] = [];
    
    for await (const file of glob.scan({ cwd: this.srcDir })) {
      entrypoints.push(join(this.srcDir, file));
    }

    const result = await Bun.build({
      entrypoints,
      root: this.srcDir,
      outdir: this.distDir,
      target: "browser",
      splitting: false,
      minify: true,
    });

    if (!result.success) {
      for (const log of result.logs) {
        console.error(log);
      }
      process.exit(1);
    }
  }

  /**
   * Generates and copies necessary assets (HTML, external libraries) to the dist directory.
   * @returns A promise that resolves when asset handling is complete.
   */
  private async handleAssets(): Promise<void> {
    const popupHtmlTemplate = `<!doctype html>
<head>
  <meta charset="UTF-8">
  <script src="apexcharts.min.js"></script>
  <script type="module" src="popup.js"></script>
</head>
<body></body>
</html>
`;

    // Copy other HTML files from src to dist
    const srcFiles = await readdir(this.srcDir);
    for (const file of srcFiles) {
      if (file.endsWith(".html") && file !== "popup.html") {
        await Bun.write(join(this.distDir, file), Bun.file(join(this.srcDir, file)));
      }
    }

    // Write the specialized popup.html
    await Bun.write(join(this.distDir, "popup.html"), popupHtmlTemplate);

    // Download external dependencies (ApexCharts)
    await $`bun ci/downloadApex.ts`.cwd(this.root);
  }

  /**
   * Updates manifest.json with the correct version and injects the build hash into version_name.
   * @returns A promise that resolves when the manifest update is complete.
   */
  private async updateManifest(): Promise<void> {
    const pkg = await Bun.file(join(this.root, "package.json")).json();
    const manifestFile = Bun.file(join(this.root, "manifest.json"));
    const manifest = await manifestFile.json();
    
    // Set strictly numerical version from package.json
    manifest.version = pkg.version;

    // Inject build hash into version_name for display purposes if available
    const cachePath = join(this.root, ".aegisVersionCache.json");
    if (existsSync(cachePath)) {
      try {
        const cache = await Bun.file(cachePath).json();
        if (cache.hash) {
          // Format: {version}-{hash}-aegis.{aegisNum} (all lowercase)
          const aegisNum = (cache.aegisVersion || "").replace(/\./g, "");
          const versionName = `${pkg.version}-${cache.hash}-aegis.${aegisNum}`;
          manifest.version_name = versionName.toLowerCase();
        }
      } catch (e) {
        manifest.version_name = pkg.version;
      }
    } else {
      manifest.version_name = pkg.version;
    }

    await Bun.write(manifestFile, JSON.stringify(manifest, null, 2));
    await Bun.write(join(this.distDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  }

  /**
   * Main execution loop for the build process.
   */
  public async run(): Promise<void> {
    try {
      await this.clean();
      await this.bundle();
      await this.handleAssets();
      await this.updateManifest();
      console.log("Build complete.");
    } catch (error) {
      console.error("Build failed:", error);
      process.exit(1);
    }
  }
}

// Execute the build
new ExtensionBuilder().run();
