/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { expect, test, describe, spyOn } from "bun:test";
import { VersionChecker } from "../ci/checkVersion";

describe("VersionChecker Full Logic", () => {
  test("run() method coverage", async () => {
    const checker = new VersionChecker();
    
    // Mock fetch to return valid HTML
    (globalThis as any).fetch = () => Promise.resolve({
      ok: true,
      text: () => Promise.resolve(`
        <script src="https://www.blablalink.com/assets/nikke/version/prod/assets/index-HASH123.js"></script>
        <script>__version__(){return "1.0.0"}</script>
        <!-- Last Release Time NOW. -->
      `)
    });

    // Mock process.exit to avoid killing the test runner
    const exitSpy = spyOn(process, "exit" as any).mockImplementation(() => {});
    
    // Mock filesystem methods to avoid touching real cache
    spyOn(checker as any, "saveCache").mockImplementation(() => Promise.resolve());
    spyOn(checker as any, "loadCache").mockImplementation(() => Promise.resolve({
      slot: "prod",
      hash: "OLD_HASH",
      fullUrl: "...",
      aegisVersion: "0.9.0",
      aegisReleaseTime: "OLD",
      fetchedAt: new Date().toISOString()
    }));

    // Mock console to avoid cluttering output
    spyOn(console, "log").mockImplementation(() => {});
    spyOn(console, "error").mockImplementation(() => {});

    await checker.run(false);
    await checker.run(true); // Hits saveCache
    
    // Hits comparison logic by running again
    await checker.run(false);

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
