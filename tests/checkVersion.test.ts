import { expect, test, describe } from "bun:test";
import { VersionChecker } from "../ci/checkVersion";

describe("VersionChecker", () => {
  test("Regex dynamic capture", () => {
    const checker = new VersionChecker();
    const samples = [
      { s: "prod-v1", h: "ABC_123", v: "1.43.57", t: "Fri Apr 24 2026 14:29:57 GMT+0800" },
      { s: "default", h: "DKDhsevV", v: "2.0.1", t: "Sat Jan 01 2027 12:00:00 GMT+0900" }
    ];

    for (const d of samples) {
      const html = `
        <script src="https://www.blablalink.com/assets/nikke/version/${d.s}/assets/index-${d.h}.js"></script>
        <script>__version__(){return "${d.v}"}</script>
        <!-- Last Release Time ${d.t}. -->
      `;

      const sM = html.match(checker.entryScriptRe);
      expect(sM?.[1]).toBe(d.s);
      expect(sM?.[2]).toBe(d.h);

      const vM = html.match(checker.aegisVersionRe);
      expect(vM?.[1]).toBe(d.v);

      const tM = html.match(checker.releaseTimeRe);
      expect(tM?.[1]).toBe(d.t);
    }
  });

  test("Negative matches", () => {
    const checker = new VersionChecker();
    const html = "<html><body>Empty</body></html>";
    expect(html.match(checker.entryScriptRe)).toBeNull();
    expect(html.match(checker.aegisVersionRe)).toBeNull();
    expect(html.match(checker.releaseTimeRe)).toBeNull();
  });
});
