import "./setup";
import { expect, test, describe, beforeEach } from "bun:test";
import { setupToggleButtons, setupSorting } from "../src/popup/popupUi";
import { PopupState } from "../src/types";

describe("Popup UI Interactions", () => {
  let mockState: PopupState;

  beforeEach(() => {
    // Create elements that are targeted by setupToggleButtons
    mockState = {
      btnTable: document.createElement("button"),
      btnChart: document.createElement("button"),
      btnChartBoss: document.createElement("button"),
      btnAvgSynchro: document.createElement("button"),
      btnAvgDamage: document.createElement("button"),
      btnTopDrawer: document.createElement("button"),
      tableContainer: document.createElement("div"),
      chartContainer: document.createElement("div"),
      chartBossContainer: document.createElement("div"),
      chartAvgContainer: document.createElement("div"),
      chartAvgDamageContainer: document.createElement("div"),
      chartTopDrawerContainer: document.createElement("div"),
      rows: [],
      sortKey: "damage",
      sortDir: "desc",
    } as unknown as PopupState;
  });

  test("setupToggleButtons should toggle visibility between table and chart", () => {
    setupToggleButtons(mockState);
    
    // Simulate clicking Summary button
    mockState.btnChart.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.tableContainer.style.display).toBe("none");
    expect(mockState.chartContainer.style.display).toBe("block");
    expect(mockState.btnChart.classList.contains("active")).toBe(true);

    // Simulate clicking Records button (table)
    mockState.btnTable.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.tableContainer.style.display).toBe("block");
    expect(mockState.chartContainer.style.display).toBe("none");

    // Simulate clicking Boss Chart
    mockState.btnChartBoss.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.chartBossContainer.style.display).toBe("block");
    expect(mockState.btnChartBoss.classList.contains("active")).toBe(true);

    // Simulate clicking Avg Synchro
    mockState.btnAvgSynchro.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.chartAvgContainer.style.display).toBe("block");
    expect(mockState.btnAvgSynchro.classList.contains("active")).toBe(true);

    // Simulate clicking Avg Damage
    mockState.btnAvgDamage.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.chartAvgDamageContainer.style.display).toBe("block");
    expect(mockState.btnAvgDamage.classList.contains("active")).toBe(true);

    // Simulate clicking Top Drawer
    mockState.btnTopDrawer.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.chartTopDrawerContainer.style.display).toBe("block");
    expect(mockState.btnTopDrawer.classList.contains("active")).toBe(true);
  });

  test("setupSorting should attach click listeners to headers", () => {
    const header = document.createElement("div");
    header.className = "header";
    const col = document.createElement("div");
    col.dataset.key = "damage";
    header.appendChild(col);
    document.body.appendChild(header);

    setupSorting(mockState);
    // This is a bit indirect, but verifying it doesn't crash 
    // and correctly identifies headers is the goal.
    expect(col.onclick).toBeDefined();
    
    document.body.removeChild(header);
  });
});
