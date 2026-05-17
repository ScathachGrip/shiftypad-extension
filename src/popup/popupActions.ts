import { PlayerRaidResult, PopupState, RaidDamageRow } from "../types";
import { downloadSummaryChartPng, refreshVisibleCharts } from "./popupCharts";
import { scrapeAllUnionRaidForPopup } from "./popupScrape";
import { checkInitialCacheAndToggleButtons, loadMembers } from "./popupData";
import * as PopupUtils from "./popupUtils";

/**
 * Sets up the scrape button in the popup to trigger scraping of union raid information from the page and update the popup state accordingly.
 *
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupScrapeButton(state: PopupState): void {
  state.scrapeBtn?.addEventListener("click", () => {
    void (async () => {
      const output = state.output;
      if (!output) {return;}
      output.textContent = "⏳ Scraping modals...\n";

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        if (!tabId) {return;}

        chrome.scripting.executeScript(
          { target: { tabId }, func: scrapeAllUnionRaidForPopup },
          (res) => {
            const data: string[] = res?.[0]?.result ?? [];
            if (!data.length) {
              output.textContent += "\n⚠️ No data scraped.";
              return;
            }
            data.forEach((modalText, i) => {
              output.textContent += `💾 Modal ${i + 1} data:\n${modalText}\n\n----------------\n\n`;
              console.log(`💾 Modal ${i + 1} data:`, modalText);
            });
            setTimeout(() => {
              checkInitialCacheAndToggleButtons(state);
              loadMembers(state);
              refreshVisibleCharts(state);
            }, 300);
          }
        );
      });
    })();
  });
}

/**
 * Sets up the site settings button in the popup to toggle background images on the page and update the popup state accordingly.
 * 
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupSiteSettings(state: PopupState): void {
  chrome.storage.local.get("disableBgImages", (res) => {
    const bgDisabled = !!res.disableBgImages;
    state.btnSiteSettings.textContent = bgDisabled ? "DisabledBackground: ON" : "DisabledBackground: OFF";
  });

  state.btnSiteSettings.onclick = () => {
    chrome.storage.local.get("disableBgImages", (res) => {
      const bgDisabled = !res.disableBgImages;
      void chrome.storage.local.set({ disableBgImages: bgDisabled });
      state.btnSiteSettings.textContent = bgDisabled ? "DisabledBackground: ON" : "DisabledBackground: OFF";

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {return;}
        void chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BG", value: bgDisabled });
      });
    });
  };
}

/**
 * Sets up the export button in the popup to handle exporting of raid data in various formats and update the popup state accordingly.
 *
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupExportButton(state: PopupState): void {
  const closeMenu = (): void => {
    state.exportDropdown.classList.remove("open");
  };

  state.btnExport.onclick = (e) => {
    e.stopPropagation();
    state.exportDropdown.classList.toggle("open");
  };

  state.exportMenu.onclick = (e) => {
    e.stopPropagation();
  };

  document.addEventListener("click", () => closeMenu());

  const withData = (cb: (data: PlayerRaidResult[]) => void): void => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) {
        alert("No active tab found.");
        return;
      }

      const key = PopupUtils.getCacheKeyFromUrl(url);
      if (!state.activeSeasonKey) {
        alert("No season selected. Pick a real season first.");
        return;
      }
      const storageKey = `ALL_UNION_RAID_DAMAGE_DATA_${key}__${state.activeSeasonKey}`;

      chrome.storage.local.get(storageKey, (res) => {
        const data = res[storageKey];
        if (!data || !data.length) {
          alert("No data to export. Please scrape first.");
          return;
        }
        cb(data);
      });
    });
  };

  const toNumber = (val: unknown): number => {
    if (typeof val === "number") {return val;}
    if (val === null || val === undefined) {return 0;}
    const match = String(val).match(/([\d.]+)([KMB]?)/i);
    if (!match) {return 0;}
    const [, numStr, suffix] = match;
    let num = parseFloat(numStr);
    switch (suffix.toUpperCase()) {
      case "K": num *= 1_000; break;
      case "M": num *= 1_000_000; break;
      case "B": num *= 1_000_000_000; break;
    }
    return num;
  };

  const exportCsv = (data: PlayerRaidResult[]): void => {
    const header = [
      "Nickname",
      "Synchro",
      "Boss 1",
      "Damage",
      "Boss 2",
      "Damage",
      "Boss 3",
      "Damage",
      "Total Damage"
    ];

    const rows = data.map((player) => {
      const bossRows = Array.isArray(player.rows) ? player.rows : [];
      const slots = [0, 1, 2].map((i) => ({
        name: bossRows[i]?.boss ?? "",
        damage: bossRows[i]?.damage ?? 0,
      }));

      const total = player.total_damage ?? bossRows.reduce(
        (sum: number, r: RaidDamageRow) => sum + (r?.damage ?? 0),
        0
      );
      return {
        name: player.player ?? "",
        synchro: player.synchro ?? 0,
        slots,
        total
      };
    }).sort((a, b) => toNumber(b.total) - toNumber(a.total));

    const csvEscape = (val: string | number): string => {
      const s = String(val ?? "");
      if (s.includes("\"") || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/\"/g, "\"\"")}"`;
      }
      return s;
    };

    const lines = [header.join(",")];
    const formatDamage = (val: number): string => PopupUtils.formatNumber(toNumber(val));

    rows.forEach((r) => {
      const line = [
        r.name,
        r.synchro,
        r.slots[0].name,
        formatDamage(r.slots[0].damage),
        r.slots[1].name,
        formatDamage(r.slots[1].damage),
        r.slots[2].name,
        formatDamage(r.slots[2].damage),
        formatDamage(r.total)
      ].map(csvEscape).join(",");
      lines.push(line);
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(blob);
    void chrome.downloads.download({ url: csvUrl, filename: "union_raid_damage.csv", saveAs: true });
  };

  const exportJson = (data: PlayerRaidResult[]): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    void chrome.downloads.download({ url, filename: "union_raid_damage.json", saveAs: true });
  };

  state.btnExportCsv.onclick = () => {
    closeMenu();
    withData(exportCsv);
  };

  state.btnExportJson.onclick = () => {
    closeMenu();
    withData(exportJson);
  };
}

/**
 * Sets up sorting functionality for the table headers in the popup, allowing users to sort the displayed data by different columns and update the popup state accordingly.
 * 
 * @param {PopupState} state - The current state of the popup, including sorting information and data rows.
 * @returns {void}
 */
export function setupClearDataButton(state: PopupState): void {
  state.btnClearData.onclick = () => {
    if (!confirm("Are you sure you want to clear all cached data? This cannot be undone.")) {return;}
    const prefixes = ["ALL_UNION_RAID_DAMAGE_DATA_", "UNION_"];

    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(k =>
        prefixes.some(p => k.startsWith(p))
      );

      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          console.log("[Popup] ? Cleared chrome cache keys:", keysToRemove);
        });
      } else {
        console.log("[Popup] ?? No chrome cache keys found to remove");
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          alert("No active tab found to clear page cache.");
          return;
        }

        chrome.tabs.sendMessage(tabId, { type: "CLEAR_CACHE" }, (res) => {
          if (chrome.runtime.lastError) {
            console.warn("[Popup] CLEAR_CACHE failed:", chrome.runtime.lastError.message);
            alert("Failed to clear page cache. Please open the Union Raid page and try again.");
            return;
          }

          console.log("[Popup] ? Page cache cleared:", res);
          alert("Cache cleared successfully.");
        });
      });
    });
  };
}

/**
 * Sets up the theme toggle button in the popup to toggle between light and dark themes and update the popup state accordingly.
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupThemeToggle(state: PopupState): void {
  chrome.storage.local.get("uiTheme", (res) => {
    const theme = res.uiTheme === "dark" ? "dark" : "light";
    document.body.classList.toggle("theme-dark", theme === "dark");
    state.btnThemeToggle.textContent = `Theme: ${theme === "dark" ? "Dark" : "Light"}`;
  });

  state.btnThemeToggle.onclick = () => {
    const scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
    const isDark = document.body.classList.toggle("theme-dark");
    const theme = isDark ? "dark" : "light";
    void chrome.storage.local.set({ uiTheme: theme });
    state.btnThemeToggle.textContent = `Theme: ${isDark ? "Dark" : "Light"}`;
    void refreshVisibleCharts(state);
    
    // Restore scroll position after chart destruction/creation layout shift
    setTimeout(() => {
      document.documentElement.scrollTop = scrollPos;
      document.body.scrollTop = scrollPos;
    }, 10);
  };
}

/**
 * Sets up the summary PNG export button in the popup to handle exporting of the summary chart as a PNG image and update the popup state accordingly.
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupSummaryPngExport(state: PopupState): void {
  state.btnExportSummaryPng.onclick = () => {
    void downloadSummaryChartPng(state);
  };
}
