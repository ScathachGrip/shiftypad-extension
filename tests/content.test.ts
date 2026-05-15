/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { describe, test, expect } from "bun:test";

describe("Content Script Integration", () => {
  test("should inject scrape button", async () => {
    document.body.innerHTML = "<div id=\"app\"></div>";
    
    // Clear require cache to ensure script re-runs
    const contentPath = require.resolve("../src/content");
    delete (require as any).cache[contentPath];
    
    (window as any).__unionRaidInjected = false;
    require("../src/content");
    
    // Wait a bit for injection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const btn = document.getElementById("scrape-btn");
    expect(btn).not.toBeNull();
  });
});
