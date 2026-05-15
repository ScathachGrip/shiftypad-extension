/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { describe, test, expect } from "bun:test";

describe("Service Worker", () => {
  test("should register listeners when required", () => {
    // Clear require cache for the service worker to ensure it re-registers listeners
    const swPath = require.resolve("../src/serviceWorker");
    delete (require as any).cache[swPath];
    
    // Reset listeners
    (globalThis as any).__mockListeners.length = 0;
    
    // Trigger require
    require("../src/serviceWorker");
    
    const listeners = (globalThis as any).__mockListeners;
    expect(listeners.length).toBeGreaterThan(0);
    
    // Trigger some message for coverage
    const chrome = (globalThis as any).chrome;
    chrome.runtime.sendMessage({ type: "SOME_SW_MESSAGE" });
  });
});
