/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { expect, test, describe, beforeEach, afterEach, spyOn } from "bun:test";
import * as PopupCharts from "../src/popup/popupCharts";
import { PopupState } from "../src/types";

describe("Chart Rendering Logic", () => {
  let mockState: PopupState;

  afterEach(() => {
    document.getElementById("chartBossContainer")?.remove();
  });

  beforeEach(() => {
    mockState = {
      rows: [
        { name: "Player1", damage: "1,000,000", synchroLevel: 200, count: "3", player: "Player1", boss: "H.S.T.A." },
        { name: "Player2", damage: "2,000,000", synchroLevel: 210, count: "3", player: "Player2", boss: "Z.E.U.S." },
      ],
      chartContainer: document.createElement("div"),
      chartBossContainer: document.createElement("div"),
      chartAvgContainer: document.createElement("div"),
      chartAvgDamageContainer: document.createElement("div"),
      chartTopDrawerContainer: document.createElement("div"),
      title: document.createElement("h4"),
      apexChart: null,
      apexChartBoss: null,
      apexChartAvg: null,
      apexChartAvgDamage: null,
      apexChartTopDrawer: null,
      activeSeasonKey: "S21",
    } as unknown as PopupState;

    mockState.chartContainer.id = "chartDummy";
    mockState.chartBossContainer.id = "chartBossContainer";
    mockState.chartAvgContainer.id = "chartAvgDummy";
    mockState.chartAvgDamageContainer.id = "chartAvgDamageDummy";
    mockState.chartTopDrawerContainer.id = "chartTopDrawerDummy";

    // Must be in DOM so querySelector can find them
    document.body.appendChild(mockState.chartContainer);
    document.body.appendChild(mockState.chartBossContainer);
    document.body.appendChild(mockState.chartAvgContainer);
    document.body.appendChild(mockState.chartAvgDamageContainer);
    document.body.appendChild(mockState.chartTopDrawerContainer);
  });

  test("renderChartFromRows should create ApexCharts instance", () => {
    PopupCharts.renderChartFromRows(mockState);
    expect(mockState.apexChart).not.toBeNull();
  });

  test("renderChartBoss should call sendMessage with correct type", async () => {
    const querySpy = spyOn((globalThis as any).chrome.tabs, "query").mockImplementation((_q: any, cb: (tabs: any[]) => void) => {
      cb([{ id: 1, url: "http://example.com" }]);
    });
    const sendSpy = spyOn((globalThis as any).chrome.tabs, "sendMessage").mockImplementation((_id: number, msg: any, cb?: (res: any) => void) => {
      if (typeof cb === "function") {
        cb({ damageData: [{ player: "Player1", synchro: 200, rows: [{ boss: "H.S.T.A.", damage: 500000 }] }] });
      }
    });

    PopupCharts.renderChartBoss(mockState);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(querySpy).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalled();
    const message = sendSpy.mock.calls[0][1] as { type: string };
    expect(message.type).toBe("ALL_UNION_RAID_DAMAGE_DATA_REQUEST");
  });

  test("renderAvgSynchroChart should create ApexCharts instance", () => {
    PopupCharts.renderAvgSynchroChart(mockState);
    expect(mockState.apexChartAvg).not.toBeNull();
  });

  test("renderAvgDamageChart should create ApexCharts instance", () => {
    PopupCharts.renderAvgDamageChart(mockState);
    expect(mockState.apexChartAvgDamage).not.toBeNull();
  });

  test("renderTopDrawerChart should create ApexCharts instance", async () => {
    // Mock chrome.tabs.query with openid
    const originalQuery = chrome.tabs.query;
    (chrome.tabs.query as any) = (query: any, callback: any) => callback([{ url: "https://www.blablalink.com/shiftyspad/union-raid?openid=123", id: 123 }]);

    // Mock chrome.storage.local.get with 3-attempt data
    const storageKey = "ALL_UNION_RAID_DAMAGE_DATA_IDENTIFIER_123__S21";
    const originalGet = chrome.storage.local.get;
    (chrome.storage.local.get as any) = (key: string, callback: any) => {
      callback({
        [storageKey]: [
          { player: "P1", synchro: 200, total_attempt: 3, rows: [{ damage: 1000000 }] },
          { player: "P2", synchro: 210, total_attempt: 3, rows: [{ damage: 1100000 }] },
          { player: "P3", synchro: 220, total_attempt: 3, rows: [{ damage: 1200000 }] }
        ]
      });
    };

    PopupCharts.renderTopDrawerChart(mockState);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockState.apexChartTopDrawer).not.toBeNull();
    
    // Restore
    chrome.tabs.query = originalQuery;
    chrome.storage.local.get = originalGet;
  });

  test("refreshVisibleCharts should update existing charts", () => {
    mockState.chartContainer.style.display = "block";
    PopupCharts.refreshVisibleCharts(mockState);
    expect(mockState.apexChart).not.toBeNull();
  });

  test("downloadSummaryChartPng should trigger download link click", async () => {
    const clickSpy = spyOn(HTMLAnchorElement.prototype, "click");
    // @ts-ignore
    await PopupCharts.downloadSummaryChartPng(mockState);
    expect(clickSpy).toHaveBeenCalled();
  });

  test("downloadBossChartPng should trigger download link click", async () => {
    const clickSpy = spyOn(HTMLAnchorElement.prototype, "click");
    const bossData = { boss: "H.S.T.A.", players: [{ player: "P1", damage: 1000, synchro: 200 }] };
    // @ts-ignore
    await PopupCharts.downloadBossChartPng(mockState, bossData);
    expect(clickSpy).toHaveBeenCalled();
  });
});
