import { expect, test, describe, beforeAll } from "bun:test";
import "./setup"; // Global JSDOM setup

describe("Popup Shell", () => {
  beforeAll(async () => {
    // Dynamically import popup.tsx to trigger mount logic if needed,
    // or just test the exported functions.
    await import("../src/popup");
  });

  test("should mount popup HTML into document body", () => {
    const container = document.getElementById("toastContainer");
    expect(container).not.toBeNull();
    
    const header = document.getElementById("unionName");
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain("Initializing...");
  });

  test("should have necessary chart containers", () => {
    expect(document.getElementById("chartBossDummy")).not.toBeNull();
    expect(document.getElementById("chartAvgDamageDummy")).not.toBeNull();
    expect(document.getElementById("chartTopDrawerDummy")).not.toBeNull();
  });

  test("should have action buttons", () => {
    expect(document.getElementById("clearData")).not.toBeNull();
    expect(document.getElementById("themeToggle")).not.toBeNull();
  });
});
