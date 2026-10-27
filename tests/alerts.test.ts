/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { showCustomAlert, showCustomConfirm } from "../src/utils/alerts";

describe("Alerts Utility", () => {
  beforeEach(() => {
    (globalThis as any).resetTestEnvironment?.();
  });

  test("showCustomAlert should render alert modal and resolve on OK click", async () => {
    const alertPromise = showCustomAlert("Test alert message\nLine 2", "assets/icon.png");

    const overlay = document.querySelector("div[style*='position: fixed']") as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(document.body.textContent).toContain("Test alert message");

    // Check image element was created
    const img = overlay.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();

    // Test button hover states
    const btn = overlay.querySelector("button") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.onmouseover?.(new MouseEvent("mouseover"));
    expect(btn.style.transform).toBe("scale(1.04)");
    btn.onmouseout?.(new MouseEvent("mouseout"));
    expect(btn.style.transform).toBe("scale(1)");

    // Click OK to resolve
    btn.click();
    await alertPromise;

    expect(document.querySelector("div[style*='position: fixed']")).toBeNull();
  });

  test("showCustomAlert should reuse existing font style element", async () => {
    const alertPromise1 = showCustomAlert("First alert");
    const overlay1 = document.querySelector("div[style*='position: fixed']") as HTMLElement;
    const btn1 = overlay1.querySelector("button") as HTMLButtonElement;
    btn1.click();
    await alertPromise1;

    // Second call should reuse font style
    const alertPromise2 = showCustomAlert("Second alert without image");
    const overlay2 = document.querySelector("div[style*='position: fixed']") as HTMLElement;
    const btn2 = overlay2.querySelector("button") as HTMLButtonElement;
    btn2.click();
    await alertPromise2;

    expect(document.getElementById("poppins-font-style")).not.toBeNull();
  });

  test("showCustomConfirm should resolve true on OK click", async () => {
    const confirmPromise = showCustomConfirm("Are you sure?");

    const overlay = document.querySelector("div[style*='position: fixed']") as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain("Are you sure?");

    const buttons = overlay.querySelectorAll("button");
    expect(buttons.length).toBe(2);

    const cancelBtn = buttons[0];
    const okBtn = buttons[1];

    // Test hover on cancel button
    cancelBtn.onmouseover?.(new MouseEvent("mouseover"));
    expect(cancelBtn.style.transform).toBe("scale(1.04)");
    cancelBtn.onmouseout?.(new MouseEvent("mouseout"));
    expect(cancelBtn.style.transform).toBe("scale(1)");

    // Test hover on ok button
    okBtn.onmouseover?.(new MouseEvent("mouseover"));
    expect(okBtn.style.transform).toBe("scale(1.04)");
    okBtn.onmouseout?.(new MouseEvent("mouseout"));
    expect(okBtn.style.transform).toBe("scale(1)");

    // Click OK
    okBtn.click();
    const result = await confirmPromise;
    expect(result).toBe(true);
    expect(document.querySelector("div[style*='position: fixed']")).toBeNull();
  });

  test("showCustomConfirm should resolve false on Cancel click", async () => {
    const confirmPromise = showCustomConfirm("Cancel me please");

    const overlay = document.querySelector("div[style*='position: fixed']") as HTMLElement;
    const buttons = overlay.querySelectorAll("button");
    const cancelBtn = buttons[0];

    // Click Cancel
    cancelBtn.click();
    const result = await confirmPromise;
    expect(result).toBe(false);
  });
});
