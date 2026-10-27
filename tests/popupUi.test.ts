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
      chartLimitBreaksContainer: document.createElement("div"),
      btnLimitBreaks: document.createElement("button"),
      btnResidualTop: document.createElement("button"),
      btnResidualLow: document.createElement("button"),
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

    // Simulate clicking Limit Breaks
    mockState.btnLimitBreaks.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.chartLimitBreaksContainer.style.display).toBe("flex");
    expect(mockState.chartContainer.style.display).toBe("none");
    expect(mockState.tableContainer.style.display).toBe("none");
    expect(mockState.btnLimitBreaks.classList.contains("active")).toBe(true);
    expect(document.body.style.width).toBe("720px");
    expect(document.body.style.minHeight).toBe("600px");
  });

  test("setupToggleButtons should correctly wire Limit Breaks subtabs", () => {
    const btnHtml = document.createElement("button");
    btnHtml.id = "btnLimitBreaksHtml";
    const btnCp = document.createElement("button");
    btnCp.id = "btnLimitBreaksCp";
    const btnSynchro = document.createElement("button");
    btnSynchro.id = "btnLimitBreaksSynchro";
    const btnWhale = document.createElement("button");
    btnWhale.id = "btnLimitBreaksWhale";
    const btnOverload = document.createElement("button");
    btnOverload.id = "btnLimitBreaksOverload";

    document.body.appendChild(btnHtml);
    document.body.appendChild(btnCp);
    document.body.appendChild(btnSynchro);
    document.body.appendChild(btnWhale);
    document.body.appendChild(btnOverload);

    mockState.limitBreaksJsonOutput = document.createElement("div");
    mockState.limitBreaksSearch = document.createElement("input");
    mockState.limitBreaksCpChartOutput = document.createElement("div");
    mockState.limitBreaksSynchroChartOutput = document.createElement("div");
    mockState.limitBreaksWhaleChartOutput = document.createElement("div");
    mockState.limitBreaksOverloadOutput = document.createElement("div");

    setupToggleButtons(mockState);

    // Click CP subtab
    btnCp.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(btnCp.classList.contains("active")).toBe(true);
    expect(btnHtml.classList.contains("active")).toBe(false);
    expect(mockState.limitBreaksCpChartOutput.style.display).toBe("block");
    expect(mockState.limitBreaksJsonOutput.style.display).toBe("none");

    // Click Synchro subtab
    btnSynchro.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(btnSynchro.classList.contains("active")).toBe(true);
    expect(btnCp.classList.contains("active")).toBe(false);
    expect(mockState.limitBreaksSynchroChartOutput.style.display).toBe("block");
    expect(mockState.limitBreaksCpChartOutput.style.display).toBe("none");

    // Click Whale subtab
    btnWhale.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(btnWhale.classList.contains("active")).toBe(true);
    expect(btnSynchro.classList.contains("active")).toBe(false);
    expect(mockState.limitBreaksWhaleChartOutput.style.display).toBe("block");

    // Click Overload subtab
    btnOverload.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(btnOverload.classList.contains("active")).toBe(true);
    expect(mockState.limitBreaksOverloadOutput.style.display).toBe("block");
    expect(mockState.limitBreaksOverloadOutput.innerHTML).toContain("Overload Stats");

    // Click HTML subtab
    btnHtml.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(btnHtml.classList.contains("active")).toBe(true);
    expect(mockState.limitBreaksJsonOutput.style.display).toBe("block");
    expect(mockState.limitBreaksSearch.style.display).toBe("block");

    btnHtml.remove();
    btnCp.remove();
    btnSynchro.remove();
    btnWhale.remove();
    btnOverload.remove();
  });

  test("setupToggleButtons should handle residual top/low toggles", () => {
    setupToggleButtons(mockState);

    mockState.btnResidualTop.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.btnResidualTop.classList.contains("active")).toBe(true);
    expect(mockState.btnResidualLow.classList.contains("active")).toBe(false);

    mockState.btnResidualLow.onclick?.(new MouseEvent("click") as unknown as PointerEvent);
    expect(mockState.btnResidualLow.classList.contains("active")).toBe(true);
    expect(mockState.btnResidualTop.classList.contains("active")).toBe(false);
  });

  test("setupSorting should attach click listeners to headers", () => {
    const header = document.createElement("div");
    header.className = "header";
    const col = document.createElement("div");
    col.dataset.key = "damage";
    header.appendChild(col);
    document.body.appendChild(header);

    setupSorting(mockState);
    expect(col.onclick).toBeDefined();

    document.body.removeChild(header);
  });
});
