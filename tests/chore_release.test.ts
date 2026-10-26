import { expect, test, describe } from "bun:test";
import { calculateNextVersion, calculateVersionName } from "../ci/chore_release";

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
});
