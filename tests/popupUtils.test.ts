/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { expect, test, describe } from "bun:test";
import * as PopupUtils from "../src/popup/popupUtils";

describe("Popup Utilities", () => {
  test("parseNumber should handle K, M, B suffixes", () => {
    expect(PopupUtils.parseNumber("1.5K")).toBe(1500);
    expect(PopupUtils.parseNumber("1.5M")).toBe(1500000);
    expect(PopupUtils.parseNumber("1.5B")).toBe(1500000000);
    expect(PopupUtils.parseNumber(1000)).toBe(1000);
    expect(PopupUtils.parseNumber("1500000")).toBe(1500000);
    expect(PopupUtils.parseNumber(undefined)).toBe(0);
    expect(PopupUtils.parseNumber("invalid")).toBe(0);
  });

  test("formatNumber should convert large numbers to K, M, B", () => {
    expect(PopupUtils.formatNumber(1500)).toBe("1.5K");
    expect(PopupUtils.formatNumber(1500000)).toBe("1.5M");
    expect(PopupUtils.formatNumber(1500000000)).toBe("1.5B");
    expect(PopupUtils.formatNumber(500)).toBe("500");
  });

  test("getCacheKeyFromUrl should extract openid or use pathname", () => {
    expect(PopupUtils.getCacheKeyFromUrl("https://example.com/raid?openid=123")).toBe("IDENTIFIER_123");
    expect(PopupUtils.getCacheKeyFromUrl("https://example.com/shiftyspad/union-raid")).toBe("IDENTIFIER_/shiftyspad/union-raid");
  });

  test("getTitleColor should return correct color for dark/light theme", () => {
    document.body.classList.remove("theme-dark");
    expect(PopupUtils.getTitleColor()).toBe("#1e1f26");
    document.body.classList.add("theme-dark");
    expect(PopupUtils.getTitleColor()).toBe("#e7e9ee");
  });

  test("getTooltipTheme should return correct theme", () => {
    document.body.classList.remove("theme-dark");
    expect(PopupUtils.getTooltipTheme()).toBe("light");
    document.body.classList.add("theme-dark");
    expect(PopupUtils.getTooltipTheme()).toBe("dark");
  });

  test("getChartColors should return palette in dark mode only", () => {
    document.body.classList.remove("theme-dark");
    expect(PopupUtils.getChartColors()).toBeUndefined();
    document.body.classList.add("theme-dark");
    const colors = PopupUtils.getChartColors();
    expect(colors).toBeDefined();
    expect(colors?.length).toBe(20);
  });

  test("buildSummaryChartOptions should return valid ApexCharts options", () => {
    const rows = [
      { name: "LongPlayerName", damage: "1.5M", synchroLevel: 200, count: "3" }
    ];
    const options = PopupUtils.buildSummaryChartOptions({
      rows,
      unionName: "Test Union",
      titleText: "Test Union",
      width: 1200,
      height: 600
    }) as any;

    expect(options.chart.type).toBe("bar");
    expect(options.series[0].data[0]).toBe(1500000);
    expect(options.title.text).toContain("Test Union");
  });

  test("buildBossChartOptions should return valid ApexCharts options", () => {
    const bossData = {
      boss: "H.S.T.A.",
      players: [{ player: "P1", damage: 500000, synchro: 200 }]
    };
    const options = PopupUtils.buildBossChartOptions({
      bossData,
      width: 400,
      height: 300
    }) as any;

    expect(options.chart.type).toBe("bar");
    expect(options.series[0].data[0]).toBe(500000);
    expect(options.title.text).toContain("H.S.T.A.");
  });

  test("applyWatermark should handle canvas rendering", async () => {
    // Mock canvas context
    const mockCtx = {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
      fillText: () => {},
      measureText: () => ({ width: 100 }),
      globalAlpha: 1,
      fillStyle: "",
      font: "",
      textBaseline: "",
    };
    
    const _canvas = {
      getContext: () => mockCtx,
      toDataURL: () => "data:image/png;base64,mock",
      width: 100,
      height: 100,
    };
    
    // @ts-ignore
    const result = await PopupUtils.applyRoundedWatermark("data:image/png;base64,mock", true);
    expect(result).toBe("data:image/png;base64,mock");
  });

  test("showToast should add toast to container", () => {
    const container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
    
    PopupUtils.showToast("Test Toast", 100);
    expect(container.innerHTML).toContain("Test Toast");
    
    // Cleanup
    document.body.removeChild(container);
  });
});
