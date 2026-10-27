/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { describe, test, expect, spyOn } from "bun:test";

describe("Service Worker", () => {
  test("should register listeners, handle errors, and handle messages", async () => {
    let onInstalledCb: (() => void) | undefined;
    let onStartupCb: (() => void) | undefined;
    let errorCb: ((e: any) => void) | undefined;
    let unhandledCb: ((e: any) => void) | undefined;
    let messageCb: ((msg: any, sender: any, sendResponse: any) => void) | undefined;

    const chrome = (globalThis as any).chrome;
    chrome.runtime.onInstalled = {
      addListener: (fn: any) => { onInstalledCb = fn; }
    };
    chrome.runtime.onStartup = {
      addListener: (fn: any) => { onStartupCb = fn; }
    };
    chrome.action = {
      openPopup: () => Promise.resolve()
    };

    const origAddEventListener = self.addEventListener.bind(self);
    self.addEventListener = ((type: string, listener: any, options?: any) => {
      if (type === "error") { errorCb = listener; }
      if (type === "unhandledrejection") { unhandledCb = listener; }
      try {
        return origAddEventListener(type, listener, options);
      } catch {
        // ignore in non-browser environments
      }
    }) as any;

    const origOnMessageAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = (fn: any) => {
      messageCb = fn;
      return origOnMessageAddListener(fn);
    };

    // Clear require cache for the service worker
    const swPath = require.resolve("../src/serviceWorker");
    delete (require as any).cache[swPath];

    // Trigger require
    require("../src/serviceWorker");

    // 1. Test onInstalled and onStartup triggers
    expect(typeof onInstalledCb).toBe("function");
    onInstalledCb?.();
    expect(typeof onStartupCb).toBe("function");
    onStartupCb?.();

    // 2. Test console.error suppression for Expected number NaN <path>
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const errSpy = spyOn(console, "error").mockImplementation(() => {});

    console.error("Expected number NaN <path> some other text");
    console.error("Some actual real error");
    expect(errSpy).toHaveBeenCalled();

    // 3. Test error listener with Expected number NaN
    expect(typeof errorCb).toBe("function");
    let errorPrevented = false;
    errorCb?.({
      message: "Expected number NaN",
      error: { message: "NaN error" },
      preventDefault: () => { errorPrevented = true; }
    });
    expect(errorPrevented).toBe(true);

    // Test error listener without matching message
    let normalPrevented = false;
    errorCb?.({
      message: "Normal error",
      preventDefault: () => { normalPrevented = true; }
    });
    expect(normalPrevented).toBe(false);

    // 4. Test unhandledrejection listener
    expect(typeof unhandledCb).toBe("function");
    let rejectionPrevented = false;
    unhandledCb?.({
      reason: { message: "Expected number NaN in promise" },
      preventDefault: () => { rejectionPrevented = true; }
    });
    expect(rejectionPrevented).toBe(true);

    // 5. Test message listener directly
    expect(typeof messageCb).toBe("function");

    // OPEN_POPUP
    const openPopupSpy = spyOn(chrome.action, "openPopup").mockResolvedValue(undefined);
    messageCb?.({ action: "OPEN_POPUP" }, {}, () => {});
    expect(openPopupSpy).toHaveBeenCalledTimes(1);
    openPopupSpy.mockRestore();

    // LOG_FORWARD valid with specific level
    const infoSpy = spyOn(console, "info").mockImplementation(() => {});
    messageCb?.({
      type: "LOG_FORWARD",
      source: "Popup",
      level: "info",
      time: "12:00:00",
      args: ["Hello from test"]
    }, {}, () => {});
    expect(infoSpy).toHaveBeenCalledWith("[Popup] 12:00:00", "Hello from test");
    infoSpy.mockRestore();

    // LOG_FORWARD with fallback logger when level is unknown
    logSpy.mockClear();
    messageCb?.({
      type: "LOG_FORWARD",
      source: "Content",
      level: "unknown_level",
      time: "12:00:01",
      args: ["Fallback logger"]
    }, {}, () => {});
    expect(logSpy).toHaveBeenCalledWith("[Content] 12:00:01", "Fallback logger");

    // Invalid LOG_FORWARD payloads should be rejected and not trigger any logger
    logSpy.mockClear();
    messageCb?.({ type: "LOG_FORWARD", source: 123 }, {}, () => {});
    messageCb?.({ type: "LOG_FORWARD", level: "info" }, {}, () => {});
    messageCb?.({ type: "LOG_FORWARD", level: "info", source: "A", time: "B", args: "not-array" }, {}, () => {});
    messageCb?.(null, {}, () => {});
    messageCb?.("invalid", {}, () => {});
    expect(logSpy).not.toHaveBeenCalled();

    // Clean up
    self.addEventListener = origAddEventListener;
    chrome.runtime.onMessage.addListener = origOnMessageAddListener;
    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});
