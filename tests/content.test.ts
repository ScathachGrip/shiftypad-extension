/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { describe, test, expect } from "bun:test";

describe("Content Script Integration", () => {
  test("should inject scrape button", async () => {
    // Reset body
    document.body.innerHTML = "<div id=\"app\"></div><div id=\"root\"></div>";
    
    // Clear require cache for content.ts
    const contentPath = require.resolve("../src/content");
    delete (require as any).cache[contentPath];
    
    (global as any).__unionRaidInjected = false;
    require("../src/content");
    
    // Wait for injection logic (includes timeouts and observers)
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const btn = document.getElementById("scrape-btn");
      if (btn) { break; }
    }
    
    const btn = document.getElementById("scrape-btn");
    expect(btn).not.toBeNull();
  });

});
