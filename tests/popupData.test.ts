/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { expect, test, describe, beforeEach, spyOn } from "bun:test";
import { loadMembers, setButtonsEnabled } from "../src/popup/popupData";
import { PopupState } from "../src/types";


describe("Popup Data Logic", () => {
  let mockState: PopupState;

  beforeEach(() => {
    // Build full DOM structure needed by loadMembers
    const seasonSelect = document.createElement("select");
    seasonSelect.id = "seasonSelect";

    const seasonSelectOptions = document.createElement("div");
    seasonSelectOptions.className = "select-options";

    const seasonSelectTrigger = document.createElement("div");
    seasonSelectTrigger.className = "select-trigger";

    const customSeasonSelect = document.createElement("div");
    customSeasonSelect.className = "custom-select";
    customSeasonSelect.appendChild(seasonSelectTrigger);
    customSeasonSelect.appendChild(seasonSelectOptions);

    const loadingOverlay = document.createElement("div");
    loadingOverlay.classList.add("hidden");
    const loadingText = document.createElement("span");
    const title = document.createElement("h4");
    title.id = "unionName";
    const list = document.createElement("div");
    const tableBody = document.createElement("tbody");

    // Buttons used by setButtonsEnabled — must live under .tombol
    const tombol = document.createElement("div");
    tombol.className = "tombol";
    const btnExport = document.createElement("button");
    const btnExportSummaryPng = document.createElement("button");
    const btnClearData = document.createElement("button");
    const btnThemeToggle = document.createElement("button");
    const btnSiteSettings = document.createElement("button");
    tombol.append(btnExport, btnExportSummaryPng, btnClearData, btnThemeToggle, btnSiteSettings);
    document.body.appendChild(tombol);

    mockState = {
      output: document.createElement("div"),
      tableBody,
      btnExport,
      btnExportSummaryPng,
      btnClearData,
      btnThemeToggle,
      btnSiteSettings,
      activeSeasonKey: "SEASON_S21",
      seasonSelect,
      seasonSelectOptions,
      seasonSelectTrigger,
      customSeasonSelect,
      loadingOverlay,
      loadingText,
      title,
      list,
      chartContainer: document.createElement("div"),
      chartBossContainer: document.createElement("div"),
      chartAvgContainer: document.createElement("div"),
      chartAvgDamageContainer: document.createElement("div"),
      chartTopDrawerContainer: document.createElement("div"),
      rows: [],
    } as unknown as PopupState;
    document.body.appendChild(mockState.list);
  });

  test("loadMembers should load data via sendMessage", async () => {
    const storageSpy = spyOn((globalThis as any).chrome.storage.local, "get").mockImplementation((_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({}));
    const querySpy = spyOn((globalThis as any).chrome.tabs, "query").mockImplementation((_q: unknown, cb: (tabs: {id: number; url: string}[]) => void) => cb([{ id: 1, url: "https://www.blablalink.com/shiftyspad/union-raid" }]));
    const sendSpy = spyOn((globalThis as any).chrome.tabs, "sendMessage").mockImplementation((_id: unknown, msg: unknown, cb: (r: unknown) => void) => {
      const m = msg as { type: string };
      if (m.type === "GET_ACTIVE_SEASON") {
        cb({ seasonKey: "S21" });
      } else {
        cb({ union: "Test Union", unionId: "12345", seasonKey: "S21", seasonText: "S21", data: [{ player: "Tester", total_damage: 1000 }] });
      }
    });

    loadMembers(mockState, "S21");
    // No need for long timeout if mocks are synchronous
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockState.rows.length).toBeGreaterThan(0);
    expect(mockState.unionName).toBe("Test Union");

    storageSpy.mockRestore();
    querySpy.mockRestore();
    sendSpy.mockRestore();
  });

  test("loadMembers should handle invalid URL", async () => {
    const querySpy = spyOn((globalThis as any).chrome.tabs, "query").mockImplementation((_q: unknown, cb: (tabs: {id: number; url: string}[]) => void) => {
      cb([{ id: 1, url: "http://google.com" }]);
    });

    loadMembers(mockState);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(document.body.innerHTML).toContain("This extension only works on blablalink.com");
    querySpy.mockRestore();
  });

  test("loadMembers should handle wrong path", async () => {
    const querySpy = spyOn((globalThis as any).chrome.tabs, "query").mockImplementation((_q: unknown, cb: (tabs: {id: number; url: string}[]) => void) => {
      cb([{ id: 1, url: "https://www.blablalink.com/other" }]);
    });

    loadMembers(mockState);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(document.body.innerHTML).toContain("This only works on https://www.blablalink.com/shiftyspad/union-raid path");
    querySpy.mockRestore();
  });

  test("loadMembers should handle content script not ready", async () => {
    const alertSpy = spyOn(globalThis, "alert" as any).mockImplementation(() => {});
    const qSpy = spyOn((globalThis as any).chrome.tabs, "query").mockImplementation((_q: unknown, cb: (tabs: {id: number; url: string}[]) => void) => cb([{ id: 1, url: "https://www.blablalink.com/shiftyspad/union-raid" }]));
    const sSpy = spyOn((globalThis as any).chrome.storage.local, "get").mockImplementation((_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({}));
    const rSpy = spyOn((globalThis as any).chrome.tabs, "reload").mockImplementation(() => {});

    (globalThis as any).chrome.runtime.lastError = { message: "error" };
    const sendSpy = spyOn((globalThis as any).chrome.tabs, "sendMessage").mockImplementation((_id: unknown, msg: unknown, cb: (r: unknown) => void) => {
      const m = msg as { type: string };
      if (m.type === "GET_ACTIVE_SEASON") { cb({ seasonKey: "S21" }); }
      else { cb(null); }
    });

    loadMembers(mockState, "S21");
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(alertSpy).toHaveBeenCalled();
    
    (globalThis as any).chrome.runtime.lastError = undefined;
    alertSpy.mockRestore();
    qSpy.mockRestore();
    sSpy.mockRestore();
    rSpy.mockRestore();
    sendSpy.mockRestore();
  });

  test("loadMembers should show empty state when no records found", async () => {
    spyOn((globalThis as any).chrome.tabs, "query").mockImplementation((_q: unknown, cb: (tabs: {id: number; url: string}[]) => void) => cb([{ id: 1, url: "https://www.blablalink.com/shiftyspad/union-raid" }]));
    spyOn((globalThis as any).chrome.storage.local, "get").mockImplementation((_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({}));
    spyOn((globalThis as any).chrome.tabs, "sendMessage").mockImplementation((_id: unknown, msg: unknown, cb: (r: unknown) => void) => {
      const m = msg as { type: string };
      if (m.type === "GET_ACTIVE_SEASON") { cb({ seasonKey: "S21" }); }
      else { cb({ union: "Test", data: [], seasonKey: "S21", seasonText: "S21" }); }
    });

    loadMembers(mockState, "S21");
    await new Promise(resolve => setTimeout(resolve, 500));
    
    expect(mockState.list.innerHTML).toContain("No records found");
  });

  test("setButtonsEnabled should toggle classes on buttons", () => {
    setButtonsEnabled(mockState, false);
    // setButtonsEnabled queries .tombol button from DOM
    const buttons = document.querySelectorAll<HTMLButtonElement>(".tombol button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => {
      expect(btn.classList.contains("btn-disabled")).toBe(true);
    });

    setButtonsEnabled(mockState, true);
    buttons.forEach(btn => {
      expect(btn.classList.contains("btn-disabled")).toBe(false);
    });
  });
});
