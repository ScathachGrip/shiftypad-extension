/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { expect, test, describe, beforeEach, spyOn } from "bun:test";
import { setupExportButton, setupClearDataButton, setupThemeToggle, setupSiteSettings, setupSummaryPngExport, setupScrapeButton } from "../src/popup/popupActions";
import { PopupState } from "../src/types";

describe("Popup Actions", () => {
  let mockState: PopupState;

  beforeEach(() => {
    mockState = {
      btnExport: document.createElement("button"),
      btnExportCsv: document.createElement("button"),
      btnExportJson: document.createElement("button"),
      exportDropdown: document.createElement("div"),
      exportMenu: document.createElement("div"),
      btnClearData: document.createElement("button"),
      btnThemeToggle: document.createElement("button"),
      btnSiteSettings: document.createElement("button"),
      btnExportSummaryPng: document.createElement("button"),
      scrapeBtn: document.createElement("button"),
      output: document.createElement("pre"),
      chartContainer: document.createElement("div"),
      chartBossContainer: document.createElement("div"),
      chartAvgContainer: document.createElement("div"),
      chartAvgDamageContainer: document.createElement("div"),
      chartTopDrawerContainer: document.createElement("div"),
      rows: [{ name: "Test", damage: "1,000,000", synchroLevel: 200, count: "3" }],
      unionName: "Test Union",
      activeSeasonKey: "S21",
    } as unknown as PopupState;
  });

  test("setupExportButton should attach click listeners", () => {
    setupExportButton(mockState);
    expect(mockState.btnExport.onclick).toBeDefined();
  });

  test("setupClearDataButton should attach click listener", () => {
    globalThis.confirm = () => true;
    const storageSpy = spyOn(globalThis.chrome.storage.local, "get");
    
    setupClearDataButton(mockState);
    mockState.btnClearData.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    
    expect(storageSpy).toHaveBeenCalled();
  });

  test("setupThemeToggle should attach click listener and toggle theme", () => {
    setupThemeToggle(mockState);
    mockState.btnThemeToggle.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(document.body.classList.contains("theme-dark")).toBe(true);
  });

  test("setupSiteSettings should attach click listener and send toggle message", () => {
    setupSiteSettings(mockState);
    mockState.btnSiteSettings.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.btnSiteSettings.textContent).toContain("DisabledBackground");
  });

  test("setupSummaryPngExport should attach click listener", () => {
    setupSummaryPngExport(mockState);
    expect(mockState.btnExportSummaryPng.onclick).toBeDefined();
  });

  test("setupScrapeButton should attach click listener", () => {
    setupScrapeButton(mockState);
    mockState.scrapeBtn?.dispatchEvent(new MouseEvent("click"));
    expect(mockState.output?.textContent).toContain("Scraping modals");
  });

  test("CSV Export should trigger download", async () => {
    // Mocking Blob and URL.createObjectURL
    globalThis.Blob = class { constructor() {} } as any;
    globalThis.URL.createObjectURL = () => "blob:mock-url";
    
    // Mock chrome.downloads
    const downloadSpy = spyOn((globalThis as any).chrome.downloads, "download");
    
    // Mock data in storage
    const storageKey = "ALL_UNION_RAID_DAMAGE_DATA_IDENTIFIER_123__S21";
    ((globalThis as any).chrome.storage.local.get) = (key: string, callback: any) => {
      callback({ [storageKey]: [{ player: "P1", synchro: 200, total_damage: 1000, rows: [] }] });
    };
    ((globalThis as any).chrome.tabs.query) = (query: any, callback: any) => callback([{ url: "https://www.blablalink.com/shiftyspad/union-raid?openid=123" }]);

    setupExportButton(mockState);
    mockState.btnExportCsv.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    
    // Give it a tick for the withData callback
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(downloadSpy).toHaveBeenCalled();
  });

  test("JSON Export should trigger download", async () => {
    const downloadSpy = spyOn((globalThis as any).chrome.downloads, "download");
    
    setupExportButton(mockState);
    mockState.btnExportJson.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(downloadSpy).toHaveBeenCalled();
  });
});
