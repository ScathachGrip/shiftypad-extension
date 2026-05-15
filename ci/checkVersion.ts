import { join } from "path";
import { existsSync } from "node:fs";

const isMobile = true;

interface VersionMetadata {
  slot: string;
  hash: string;
  fullUrl: string;
  aegisVersion: string;
  aegisReleaseTime: string;
}

interface VersionCache extends VersionMetadata {
  fetchedAt: string;
}

/**
 * VersionChecker - Encapsulates detection and comparison logic for frontend deployments.
 */
class VersionChecker {
  private readonly pageUrl = "https://www.blablalink.com";
  private readonly cachePath = join(import.meta.dir, "..", ".aegisVersionCache.json");

  /** 
   * Captures the Vite build metadata from the main entry script.
   * - 'slot': The deployment slot (e.g., 'default', 'v2', etc.).
   * - 'hash': The Vite content-hash (e.g., 'DKDhsevV'). This changes on every rebuild
   *   where the source code is modified, making it the most reliable "version" indicator.
   */
  /** @internal */
  public readonly entryScriptRe =
    /src="https:\/\/www\.blablalink\.com\/assets\/nikke\/version\/([^/]+)\/assets\/index-([A-Za-z0-9_-]+)\.js"/;

  /** @internal */
  public readonly releaseTimeRe = /Last Release Time (.*?)\./;
  /** @internal */
  public readonly aegisVersionRe = /__version__.*?return\s*"([^"]+)"/;

  /**
   * Fetches the raw HTML content of the target page.
   * @returns The raw HTML content of the page.
   * @throws If the HTTP request fails.
   */
  private async fetchHtml(): Promise<string> {
    const userAgent = isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    const res = await fetch(this.pageUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${this.pageUrl}`);
    }

    return res.text();
  }

  /**
   * Extracts build and SDK metadata using regular expressions.
   * @param html - The raw HTML content to parse.
   * @returns The extracted metadata or null if the entry script is not found.
   */
  private extractMetadata(html: string): VersionMetadata | null {
    const entryMatch = this.entryScriptRe.exec(html);
    const releaseMatch = this.releaseTimeRe.exec(html);
    const aegisMatch = this.aegisVersionRe.exec(html);

    if (!entryMatch) return null;

    const [fullMatch, slot, hash] = entryMatch;
    const srcMatch = /src="([^"]+)"/.exec(fullMatch);

    return {
      slot,
      hash,
      fullUrl: srcMatch?.[1] ?? "",
      aegisVersion: aegisMatch?.[1] ?? "unknown",
      aegisReleaseTime: releaseMatch?.[1] ?? "unknown"
    };
  }

  /**
   * Loads the previously saved baseline from the local filesystem.
   * @returns The cached version data or null if not found.
   */
  private async loadCache(): Promise<VersionCache | null> {
    if (!existsSync(this.cachePath)) return null;
    try {
      return await Bun.file(this.cachePath).json() as VersionCache;
    } catch {
      return null;
    }
  }

  /**
   * Persists the current build metadata as the new baseline.
   * @param metadata - The metadata to store in the cache.
   */
  private async saveCache(metadata: VersionMetadata): Promise<void> {
    const cache: VersionCache = {
      ...metadata,
      fetchedAt: new Date().toISOString(),
    };
    await Bun.write(this.cachePath, JSON.stringify(cache, null, 2));
  }

  /**
   * Compares the current live metadata against the cached baseline.
   * @param current - The live metadata just fetched.
   * @param cache - The baseline metadata from the cache.
   * @returns An object containing boolean flags for each type of change.
   */
  private compare(current: VersionMetadata, cache: VersionCache) {
    const hashChanged = cache.hash !== current.hash;
    const slotChanged = cache.slot !== current.slot;
    const aegisChanged = cache.aegisVersion !== current.aegisVersion;
    const timeChanged = cache.aegisReleaseTime !== current.aegisReleaseTime;

    return {
      anyChanged: hashChanged || slotChanged || aegisChanged || timeChanged,
      hashChanged,
      slotChanged,
      aegisChanged,
      timeChanged
    };
  }

  /**
   * Orchestrates the version checking process.
   * @param shouldSave - Whether to save the current build as the new baseline.
   */
  public async run(shouldSave: boolean): Promise<void> {
    console.log(`Fetching ${this.pageUrl} ...`);

    const html = await this.fetchHtml();
    const current = this.extractMetadata(html);

    if (!current) {
      console.error("ERROR: Could not find entry script URL in page HTML.");
      console.error("       The DOM structure may have changed.");
      process.exit(1);
    }

    console.log(`\nBuild detected:`);
    console.log(`  Slot : ${current.slot}`);
    console.log(`  Hash : ${current.hash}`);
    console.log(`  URL  : ${current.fullUrl}`);
    console.log(`  Aegis: ${current.aegisVersion}`);
    console.log(`  Time : ${current.aegisReleaseTime}`);

    const cache = await this.loadCache();

    if (!cache) {
      console.log("\nNo baseline cache found. Run with --save to store the current hash as baseline.");
    } else {
      const diff = this.compare(current, cache);

      if (!diff.anyChanged) {
        console.log(`\nNo change detected (hash: ${current.hash})`);
        console.log(`Last saved baseline: ${cache.fetchedAt}`);
      } else {
        console.log(`\nFRONTEND CHANGED`);
        if (diff.slotChanged) console.log(`  Slot : ${cache.slot} -> ${current.slot}`);
        if (diff.hashChanged) console.log(`  Hash : ${cache.hash} -> ${current.hash}`);
        if (diff.aegisChanged) console.log(`  Aegis: ${cache.aegisVersion} -> ${current.aegisVersion}`);
        if (diff.timeChanged) console.log(`  Time : ${cache.aegisReleaseTime} -> ${current.aegisReleaseTime}`);

        console.log(`  Prev : ${cache.fullUrl}`);
        console.log(`  Now  : ${current.fullUrl}`);
        console.log(`  At   : ${cache.fetchedAt}`);
      }
    }

    if (shouldSave) {
      await this.saveCache(current);
      console.log(`\nSaved baseline -> ${this.cachePath}`);
    }
  }
}

export { VersionChecker, type VersionMetadata, type VersionCache };

if (import.meta.main) {
  const shouldSave = process.argv.includes("--save");
  new VersionChecker().run(shouldSave).catch(console.error);
}
