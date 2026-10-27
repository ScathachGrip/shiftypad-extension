import { join } from "path";
import { existsSync } from "node:fs";

interface VersionCache {
  hash: string;
  aegisVersion: string;
}

/**
 * Calculates the next version by bumping the patch number.
 * Rolls over patch (0-99) into minor when exceeding 99.
 */
export function calculateNextVersion(currentVersion: string): string {
  const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(-.+)?$/);
  if (!match) {
    throw new Error(`[chore:release] Could not parse version: "${currentVersion}"`);
  }

  const [, majorStr = "0", minorStr = "0", patchStr = "0", suffix = ""] = match;
  const major = parseInt(majorStr, 10);
  let minor = parseInt(minorStr, 10);
  let patch = parseInt(patchStr, 10);

  patch += 1;
  if (patch > 99) {
    minor += 1;
    patch = 0;
  }

  return `${major}.${minor}.${patch}${suffix}`;
}

/**
 * Computes the version_name formatted as `<version>-<hash>-aegis.<version_digits>`.
 */
export function calculateVersionName(
  newVersion: string,
  aegisCache?: VersionCache | null,
  previousVersionName?: string
): string {
  if (aegisCache?.hash && aegisCache?.aegisVersion) {
    const cleanAegis = aegisCache.aegisVersion.replace(/\./g, "");
    return `${newVersion}-${aegisCache.hash.toLowerCase()}-aegis.${cleanAegis}`;
  }

  if (previousVersionName) {
    const match = previousVersionName.match(/^[0-9.]+(.+)$/);
    if (match?.[1]) {
      return `${newVersion}${match[1]}`;
    }
  }

  return newVersion;
}

export async function bumpRelease(options?: { customVersion?: string }): Promise<{
  oldVersion: string;
  newVersion: string;
  newVersionName?: string;
}> {
  const root = join(import.meta.dir, "..");
  const pkgPath = join(root, "package.json");
  const manifestPath = join(root, "manifest.json");
  const cachePath = join(root, ".aegisVersionCache.json");

  // 1. Read package.json
  const pkgRaw = await Bun.file(pkgPath).text();
  const pkg = JSON.parse(pkgRaw) as { version: string };
  const oldVersion = pkg.version;
  const newVersion = options?.customVersion ?? calculateNextVersion(oldVersion);

  // Update package.json
  const pkgUpdated = pkgRaw.replace(
    /"version":\s*"[^"]+"/,
    `"version": "${newVersion}"`
  );
  await Bun.write(pkgPath, pkgUpdated);

  // 2. Read and update manifest.json
  let newVersionName: string | undefined;

  if (existsSync(manifestPath)) {
    const manifestRaw = await Bun.file(manifestPath).text();
    const manifest = JSON.parse(manifestRaw) as { version?: string; version_name?: string };

    let aegisCache: VersionCache | null = null;
    if (existsSync(cachePath)) {
      try {
        aegisCache = (await Bun.file(cachePath).json()) as VersionCache;
      } catch {
        aegisCache = null;
      }
    }

    if (manifest.version_name) {
      newVersionName = calculateVersionName(newVersion, aegisCache, manifest.version_name);
    }

    let manifestUpdated = manifestRaw.replace(
      /"version":\s*"[^"]+"/,
      `"version": "${newVersion}"`
    );

    if (newVersionName) {
      manifestUpdated = manifestUpdated.replace(
        /"version_name":\s*"[^"]+"/,
        `"version_name": "${newVersionName}"`
      );
    }

    await Bun.write(manifestPath, manifestUpdated);
  }

  return { oldVersion, newVersion, newVersionName };
}

if (import.meta.main) {
  const customVersion = process.argv[2]?.startsWith("-") ? undefined : process.argv[2];
  const { oldVersion, newVersion, newVersionName } = await bumpRelease({ customVersion });

  console.log(`[chore:release] Bumped version: ${oldVersion} -> ${newVersion}`);
  if (newVersionName) {
    console.log(`[chore:release] Updated manifest.version_name: ${newVersionName}`);
  }
  console.log(`ci/chore(release): bump manifest to ${newVersion}`);
}