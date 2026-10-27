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
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(querySpy).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalled();
    const calls = sendSpy.mock.calls;
    // Find the call that is NOT GET_ACTIVE_SEASON if multiple calls happen
    const raidCall = calls.find(c => (c[1] as any).type === "ALL_UNION_RAID_DAMAGE_DATA_REQUEST");
    expect(raidCall).toBeDefined();
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

  test("refreshVisibleCharts should update existing charts across containers", () => {
    // 1. chartContainer
    mockState.chartContainer.style.display = "block";
    PopupCharts.refreshVisibleCharts(mockState);
    expect(mockState.apexChart).not.toBeNull();
    mockState.chartContainer.style.display = "none";

    // 2. chartBossContainer
    mockState.chartBossContainer.style.display = "block";
    PopupCharts.refreshVisibleCharts(mockState);
    mockState.chartBossContainer.style.display = "none";

    // 3. chartAvgContainer
    mockState.chartAvgContainer.style.display = "block";
    PopupCharts.refreshVisibleCharts(mockState);
    expect(mockState.apexChartAvg).not.toBeNull();
    mockState.chartAvgContainer.style.display = "none";

    // 4. chartAvgDamageContainer
    mockState.chartAvgDamageContainer.style.display = "block";
    PopupCharts.refreshVisibleCharts(mockState);
    expect(mockState.apexChartAvgDamage).not.toBeNull();
    mockState.chartAvgDamageContainer.style.display = "none";

    // 5. chartTopDrawerContainer
    mockState.chartTopDrawerContainer.style.display = "block";
    PopupCharts.refreshVisibleCharts(mockState);
    mockState.chartTopDrawerContainer.style.display = "none";
  });

  test("renderLimitBreaksCpChart should render CP chart", async () => {
    const mockData: any = [
      {
        player: "Player 1",
        synchro: 250,
        rows: [
          {
            heroes: [
              { avatarUrl: "https://example.com/h1.png", combatPower: "100,000", finalTier: "MAX" },
              { avatarUrl: "https://example.com/h2.png", combatPower: "50,000", finalTier: "Core 2" }
            ]
          }
        ]
      }
    ];

    await PopupCharts.renderLimitBreaksCpChart(mockState, mockData);
    expect(mockState.apexChartLimitBreaksCp).not.toBeNull();
  });

  test("renderLimitBreaksSynchroChart should render Synchro chart", async () => {
    const mockData: any = [
      { player: "Player 1", synchro: 250 },
      { player: "Player 2", synchro: 220 }
    ];

    await PopupCharts.renderLimitBreaksSynchroChart(mockState, mockData);
    expect(mockState.apexChartLimitBreaksSynchro).not.toBeNull();
  });

  test("renderLimitBreaksWhaleChart should render Whale chart", async () => {
    const mockData: any = [
      {
        player: "Player 1",
        synchro: 250,
        rows: [
          {
            heroes: [
              { avatarUrl: "https://example.com/h1.png", finalTier: "MAX" },
              { avatarUrl: "https://example.com/h2.png", finalTier: "Core 4" },
              { avatarUrl: "https://example.com/h3.png", finalTier: "LB 3" },
              { avatarUrl: "https://example.com/h4.png", finalTier: "None", limitBreak: 1 }
            ]
          }
        ]
      }
    ];

    await PopupCharts.renderLimitBreaksWhaleChart(mockState, mockData);
    expect(mockState.apexChartLimitBreaksWhale).not.toBeNull();
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
