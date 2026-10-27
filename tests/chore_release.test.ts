import { expect, test, describe } from "bun:test";
import { calculateNextVersion, calculateVersionName, bumpRelease } from "../ci/chore_release";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("chore_release", () => {
  describe("calculateNextVersion", () => {
    test("increments patch version normally", () => {
      expect(calculateNextVersion("0.1.9")).toBe("0.1.10");
      expect(calculateNextVersion("1.2.3")).toBe("1.2.4");
      expect(calculateNextVersion("0.0.18")).toBe("0.0.19");
    });

    test("rolls over patch > 99 to next minor version", () => {
      expect(calculateNextVersion("0.0.99")).toBe("0.1.0");
      expect(calculateNextVersion("0.1.99")).toBe("0.2.0");
    });

    test("preserves semver suffix if present", () => {
      expect(calculateNextVersion("0.1.9-alpha.1")).toBe("0.1.10-alpha.1");
      expect(calculateNextVersion("0.0.99-rc.2")).toBe("0.1.0-rc.2");
    });

    test("throws on invalid semver string", () => {
      expect(() => calculateNextVersion("invalid-version")).toThrow(
        /Could not parse version/
      );
    });
  });

  describe("calculateVersionName", () => {
    test("formats with live aegis cache", () => {
      const cache = {
        hash: "aR_eg_5w",
        aegisVersion: "1.43.60"
      };
      expect(calculateVersionName("0.1.10", cache)).toBe(
        "0.1.10-ar_eg_5w-aegis.14360"
      );
    });

    test("preserves existing suffix if aegis cache is absent", () => {
      const prev = "0.1.9-dkdhsevv-aegis.14357";
      expect(calculateVersionName("0.1.10", null, prev)).toBe(
        "0.1.10-dkdhsevv-aegis.14357"
      );
    });

    test("falls back to version when no suffix or cache exists", () => {
      expect(calculateVersionName("0.1.10", null, undefined)).toBe("0.1.10");
    });
  });

  describe("bumpRelease", () => {
    test("updates package.json, manifest.json, and astro/package.json to the same version", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "shiftypad-test-"));
      try {
        const pkgContent = JSON.stringify({ name: "test-pkg", version: "0.1.13" }, null, 2);
        const manifestContent = JSON.stringify(
          { name: "test-manifest", version: "0.1.13", version_name: "0.1.13" },
          null,
          2
        );
        const astroDir = join(tempDir, "astro");
        mkdirSync(astroDir, { recursive: true });
        const astroPkgContent = JSON.stringify({ name: "astro-pkg", version: "0.1.13" }, null, 2);

        await Bun.write(join(tempDir, "package.json"), pkgContent);
        await Bun.write(join(tempDir, "manifest.json"), manifestContent);
        await Bun.write(join(astroDir, "package.json"), astroPkgContent);

        const result = await bumpRelease({ rootDir: tempDir });

        expect(result.oldVersion).toBe("0.1.13");
        expect(result.newVersion).toBe("0.1.14");
        expect(result.astroVersion).toBe("0.1.14");

        const updatedPkg = JSON.parse(await Bun.file(join(tempDir, "package.json")).text()) as {
          version: string;
        };
        const updatedManifest = JSON.parse(
          await Bun.file(join(tempDir, "manifest.json")).text()
        ) as { version: string };
        const updatedAstroPkg = JSON.parse(
          await Bun.file(join(astroDir, "package.json")).text()
        ) as { version: string };

        expect(updatedPkg.version).toBe("0.1.14");
        expect(updatedManifest.version).toBe("0.1.14");
        expect(updatedAstroPkg.version).toBe("0.1.14");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});

