import { PopupState } from "../types";
import { renderTable } from "./popupRender";
import { renderAvgDamageChart, renderAvgSynchroChart, renderChartBoss, renderChartFromRows, renderTopDrawerChart } from "./popupCharts";

/**
 * Sets up sorting functionality for the table headers in the popup.
 * 
 * @param {PopupState} state - The current state of the popup, including sorting information.
 * @returns {void}
 */
export function setupSorting(state: PopupState): void {
  document.querySelectorAll<HTMLElement>(".header > div").forEach(h => {
    h.onclick = () => {
      const key = h.dataset.key as keyof typeof state.rows[number] | undefined;
      if (!key) {return;}
      state.sortDir = state.sortKey === key ? (state.sortDir === "asc" ? "desc" : "asc") : "desc";
      state.sortKey = key;
      document.querySelectorAll(".header > div").forEach(x => x.classList.remove("sort-asc", "sort-desc"));
      h.classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
      renderTable(state);
    };
  });
}


/**
 * Sets up toggle buttons for different views in the popup.
 * 
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupToggleButtons(state: PopupState): void {
  const deactivateAll = () => {
    state.btnChart.classList.remove("active");
    state.btnTable.classList.remove("active");
    state.btnChartBoss.classList.remove("active");
    state.btnAvgSynchro.classList.remove("active");
    state.btnAvgDamage.classList.remove("active");
    state.btnTopDrawer.classList.remove("active");
    state.btnLimitBreaks.classList.remove("active");
  };

  const setPopupSize = (width: string, minHeight: string | null = null): void => {
    document.body.style.width = width;
    if (minHeight) {
      document.body.style.minHeight = minHeight;
      document.body.style.height = "auto";
    } else {
      document.body.style.minHeight = "";
      document.body.style.height = "";
    }
  };

  state.btnLimitBreaks.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "none";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "none";
    state.chartLimitBreaksContainer.style.display = "flex";

    deactivateAll();
    state.btnLimitBreaks.classList.add("active");
    setPopupSize("720px", "600px");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) {return;}
      
      const { getCacheKeyFromUrl } = require("./popupUtils");
      const baseKey = getCacheKeyFromUrl(url);
      const cacheKey = `ALL_UNION_RAID_DAMAGE_DATA_${baseKey}__${state.activeSeasonKey}`;
      
      chrome.storage.local.get(cacheKey, (res) => {
        const data = res[cacheKey] as import("../types").PlayerRaidResult[];
        if (!data || !Array.isArray(data)) {
          state.limitBreaksJsonOutput.textContent = "No data found or please re-scrape.";
          return;
        }

        let htmlContent = "";

        data.forEach(playerResult => {
          const allHeroes: import("../types").NikkeHero[] = [];
          playerResult.rows.forEach(r => {
            if (r.heroes) {
              allHeroes.push(...r.heroes);
            }
          });
           
          // Unique heroes
          const uniqueHeroes = Array.from(new Map(allHeroes.map(h => [h.avatarUrl, h])).values());
           
          if (uniqueHeroes.length === 0) {
            return;
          }

          htmlContent += `
            <div class="limit-break-player" data-player="${playerResult.player.toLowerCase()}" style="margin-bottom: 12px; background: var(--surface-2); padding: 10px; border-radius: 12px; border: 1px solid var(--border);">
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 6px;">
                👤 ${playerResult.player}
              </h4>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${uniqueHeroes.map(h => `
                  <div style="width: 48px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <img src="${h.avatarUrl}" width="48" height="48" style="border-radius: 8px; border: 1px solid var(--border); object-fit: cover;" title="${h.avatarName || "Unknown"}">
                    <span style="font-size: 10px; font-weight: 700; color: ${Number(h.coreLevel) > 0 ? "#ffb400" : "var(--text)"}; text-align: center; white-space: nowrap; background: rgba(0,0,0,0.4); padding: 2px 4px; border-radius: 4px;">
                      ${h.finalTier}
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        });
        
        if (!htmlContent) {
          state.limitBreaksJsonOutput.innerHTML = "<div style='padding: 10px; color: var(--text);'>No hero data found for this season.</div>";
        } else {
          state.limitBreaksJsonOutput.innerHTML = htmlContent;
        }

        state.limitBreaksRawJsonOutput.textContent = JSON.stringify(data, null, 2);

        state.limitBreaksSearch.oninput = (e) => {
          const filter = (e.target as HTMLInputElement).value.toLowerCase();
          const players = state.limitBreaksJsonOutput.querySelectorAll(".limit-break-player");
          players.forEach((p) => {
            const name = (p as HTMLElement).dataset.player || "";
            if (name.includes(filter)) {
              (p as HTMLElement).style.display = "block";
            } else {
              (p as HTMLElement).style.display = "none";
            }
          });
        };
      });
    });
  };

  const btnLimitBreaksHtml = document.getElementById("btnLimitBreaksHtml");
  const btnLimitBreaksJson = document.getElementById("btnLimitBreaksJson");
  
  if (btnLimitBreaksHtml && btnLimitBreaksJson) {
    btnLimitBreaksHtml.onclick = () => {
      btnLimitBreaksHtml.classList.add("active");
      btnLimitBreaksJson.classList.remove("active");
      state.limitBreaksJsonOutput.style.display = "block";
      state.limitBreaksSearch.style.display = "block";
      const rawOutput = document.getElementById("limitBreaksRawJsonOutput");
      if (rawOutput) {rawOutput.style.display = "none";}
    };

    btnLimitBreaksJson.onclick = () => {
      btnLimitBreaksJson.classList.add("active");
      btnLimitBreaksHtml.classList.remove("active");
      state.limitBreaksJsonOutput.style.display = "none";
      state.limitBreaksSearch.style.display = "none";
      const rawOutput = document.getElementById("limitBreaksRawJsonOutput");
      if (rawOutput) {rawOutput.style.display = "block";}
    };
  }

  state.btnChart.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "block";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "none";
    state.chartLimitBreaksContainer.style.display = "none";

    deactivateAll();
    state.btnChart.classList.add("active");
    setPopupSize("720px");

    renderChartFromRows(state);
  };

  state.btnTable.onclick = () => {
    state.tableContainer.style.display = "block";
    state.chartContainer.style.display = "none";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "none";
    state.chartLimitBreaksContainer.style.display = "none";

    deactivateAll();
    state.btnTable.classList.add("active");
    setPopupSize("720px");
  };

  state.btnChartBoss.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "none";
    state.chartBossContainer.style.display = "block";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "none";
    state.chartLimitBreaksContainer.style.display = "none";

    deactivateAll();
    state.btnChartBoss.classList.add("active");
    setPopupSize("720px");

    renderChartBoss(state);
  };

  state.btnAvgSynchro.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "none";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "block";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "none";
    state.chartLimitBreaksContainer.style.display = "none";

    deactivateAll();
    state.btnAvgSynchro.classList.add("active");
    setPopupSize("720px", "600px");

    renderAvgSynchroChart(state);
  };

  state.btnAvgDamage.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "none";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "block";
    state.chartTopDrawerContainer.style.display = "none";
    state.chartLimitBreaksContainer.style.display = "none";

    deactivateAll();
    state.btnAvgDamage.classList.add("active");
    setPopupSize("720px");

    renderAvgDamageChart(state);
  };

  state.btnTopDrawer.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "none";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "block";
    state.chartLimitBreaksContainer.style.display = "none";

    deactivateAll();
    state.btnTopDrawer.classList.add("active");
    state.btnResidualTop.classList.add("active");
    state.btnResidualLow.classList.remove("active");
    setPopupSize("720px");

    renderTopDrawerChart(state, "top");
  };

  state.btnResidualTop.onclick = () => {
    state.btnResidualTop.classList.add("active");
    state.btnResidualLow.classList.remove("active");
    renderTopDrawerChart(state, "top");
  };

  state.btnResidualLow.onclick = () => {
    state.btnResidualLow.classList.add("active");
    state.btnResidualTop.classList.remove("active");
    renderTopDrawerChart(state, "low");
  };
}

