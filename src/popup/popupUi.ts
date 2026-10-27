import { PopupState, PlayerRaidResult, NikkeHero } from "../types";
import { renderTable } from "./popupRender";
import { getCacheKeyFromUrl } from "./popupUtils";
import {
  renderAvgDamageChart,
  renderAvgSynchroChart,
  renderChartBoss,
  renderChartFromRows,
  renderTopDrawerChart,
  renderLimitBreaksCpChart,
  renderLimitBreaksSynchroChart,
  renderLimitBreaksWhaleChart
} from "./popupCharts";

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
      if (!key) { return; }
      state.sortDir = state.sortKey === key ? (state.sortDir === "asc" ? "desc" : "asc") : "desc";
      state.sortKey = key;
      document.querySelectorAll(".header > div").forEach(x => x.classList.remove("sort-asc", "sort-desc"));
      h.classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
      renderTable(state);
    };
  });
}

/**
 * Adjusts popup body dimensions dynamically.
 */
function setPopupSize(width: string, minHeight: string | null = null): void {
  document.body.style.width = width;
  if (minHeight) {
    document.body.style.minHeight = minHeight;
    document.body.style.height = "auto";
  } else {
    document.body.style.minHeight = "";
    document.body.style.height = "";
  }
}

/**
 * Deactivates all top-level view buttons.
 */
function deactivateAllTabs(state: PopupState): void {
  state.btnChart.classList.remove("active");
  state.btnTable.classList.remove("active");
  state.btnChartBoss.classList.remove("active");
  state.btnAvgSynchro.classList.remove("active");
  state.btnAvgDamage.classList.remove("active");
  state.btnTopDrawer.classList.remove("active");
  if (state.btnLimitBreaks) {
    state.btnLimitBreaks.classList.remove("active");
  }
}

/**
 * Switches the active visible container and highlights the active button.
 */
function switchView(
  state: PopupState,
  activeContainer: HTMLElement | null,
  activeButton: HTMLElement,
  width = "720px",
  minHeight: string | null = null
): void {
  state.tableContainer.style.display = "none";
  state.chartContainer.style.display = "none";
  state.chartBossContainer.style.display = "none";
  state.chartAvgContainer.style.display = "none";
  state.chartAvgDamageContainer.style.display = "none";
  state.chartTopDrawerContainer.style.display = "none";
  if (state.chartLimitBreaksContainer) {
    state.chartLimitBreaksContainer.style.display = "none";
  }

  if (activeContainer) {
    activeContainer.style.display = activeContainer === state.chartLimitBreaksContainer ? "flex" : "block";
  }

  deactivateAllTabs(state);
  activeButton.classList.add("active");
  setPopupSize(width, minHeight);
}

/**
 * Generates HTML markup for player hero limit-break cards.
 */
function buildLimitBreaksHtml(data: PlayerRaidResult[]): string {
  let html = "";

  data.forEach(playerResult => {
    const allHeroes: NikkeHero[] = [];
    playerResult.rows.forEach(r => {
      if (r.heroes) {
        allHeroes.push(...r.heroes);
      }
    });

    const uniqueHeroes = Array.from(new Map(allHeroes.map(h => [h.avatarUrl, h])).values());
    if (uniqueHeroes.length === 0) {
      return;
    }

    html += `
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

  return html;
}

/**
 * Attaches filter input listener to the Limit Breaks player search bar.
 */
function setupLimitBreaksSearch(state: PopupState): void {
  if (!state.limitBreaksSearch || !state.limitBreaksJsonOutput) { return; }

  state.limitBreaksSearch.oninput = (e) => {
    const filter = (e.target as HTMLInputElement).value.toLowerCase();
    const players = state.limitBreaksJsonOutput.querySelectorAll(".limit-break-player");
    players.forEach((p) => {
      const name = (p as HTMLElement).dataset.player || "";
      (p as HTMLElement).style.display = name.includes(filter) ? "block" : "none";
    });
  };
}

/**
 * Loads and renders Limit Breaks data from local storage.
 */
function loadAndRenderLimitBreaks(state: PopupState): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url;
    if (!url) { return; }

    const baseKey = getCacheKeyFromUrl(url);
    const cacheKey = `ALL_UNION_RAID_DAMAGE_DATA_${baseKey}__${state.activeSeasonKey}`;

    chrome.storage.local.get(cacheKey, (res) => {
      const data = res[cacheKey] as PlayerRaidResult[];
      if (!data || !Array.isArray(data)) {
        if (state.limitBreaksJsonOutput) {
          state.limitBreaksJsonOutput.textContent = "No data found or please re-scrape.";
        }
        return;
      }

      const htmlContent = buildLimitBreaksHtml(data);
      if (state.limitBreaksJsonOutput) {
        state.limitBreaksJsonOutput.innerHTML = htmlContent || "<div style='padding: 10px; color: var(--text);'>No hero data found for this season.</div>";
      }
      state.currentLimitBreaksData = data;

      if (document.getElementById("btnLimitBreaksCp")?.classList.contains("active")) {
        setTimeout(() => {
          void renderLimitBreaksCpChart(state, data);
        }, 10);
      }

      setupLimitBreaksSearch(state);
    });
  });
}

/**
 * Configures sub-tab toggles inside the Limit Breaks view.
 */
function setupLimitBreaksSubtabs(state: PopupState): void {
  const btnHtml = document.getElementById("btnLimitBreaksHtml");
  const btnCp = document.getElementById("btnLimitBreaksCp");
  const btnSynchro = document.getElementById("btnLimitBreaksSynchro");
  const btnWhale = document.getElementById("btnLimitBreaksWhale");
  const btnOverload = document.getElementById("btnLimitBreaksOverload");

  if (!btnHtml || !btnCp || !btnSynchro || !btnWhale || !btnOverload) { return; }

  const subButtons = [btnHtml, btnCp, btnSynchro, btnWhale, btnOverload];

  const activateSubtab = (activeBtn: HTMLElement) => {
    subButtons.forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");

    if (state.limitBreaksJsonOutput) { state.limitBreaksJsonOutput.style.display = "none"; }
    if (state.limitBreaksSearch) { state.limitBreaksSearch.style.display = "none"; }
    if (state.limitBreaksCpChartOutput) { state.limitBreaksCpChartOutput.style.display = "none"; }
    if (state.limitBreaksSynchroChartOutput) { state.limitBreaksSynchroChartOutput.style.display = "none"; }
    if (state.limitBreaksWhaleChartOutput) { state.limitBreaksWhaleChartOutput.style.display = "none"; }
    if (state.limitBreaksOverloadOutput) { state.limitBreaksOverloadOutput.style.display = "none"; }
  };

  btnHtml.onclick = () => {
    activateSubtab(btnHtml);
    if (state.limitBreaksJsonOutput) { state.limitBreaksJsonOutput.style.display = "block"; }
    if (state.limitBreaksSearch) { state.limitBreaksSearch.style.display = "block"; }
  };

  btnCp.onclick = () => {
    activateSubtab(btnCp);
    if (state.limitBreaksCpChartOutput) {
      state.limitBreaksCpChartOutput.style.display = "block";
      if (state.currentLimitBreaksData) {
        const data = state.currentLimitBreaksData;
        setTimeout(() => { void renderLimitBreaksCpChart(state, data); }, 10);
      }
    }
  };

  btnSynchro.onclick = () => {
    activateSubtab(btnSynchro);
    if (state.limitBreaksSynchroChartOutput) {
      state.limitBreaksSynchroChartOutput.style.display = "block";
      if (state.currentLimitBreaksData) {
        const data = state.currentLimitBreaksData;
        setTimeout(() => { void renderLimitBreaksSynchroChart(state, data); }, 10);
      }
    }
  };

  btnWhale.onclick = () => {
    activateSubtab(btnWhale);
    if (state.limitBreaksWhaleChartOutput) {
      state.limitBreaksWhaleChartOutput.style.display = "block";
      if (state.currentLimitBreaksData) {
        const data = state.currentLimitBreaksData;
        setTimeout(() => { void renderLimitBreaksWhaleChart(state, data); }, 10);
      }
    }
  };

  btnOverload.onclick = () => {
    activateSubtab(btnOverload);
    if (state.limitBreaksOverloadOutput) {
      state.limitBreaksOverloadOutput.style.display = "block";
      state.limitBreaksOverloadOutput.innerHTML = `
        <div class="empty residual-note">
          <h4>Overload Stats</h4>
          <p>Overload stats are currently not available due to per-player privacy settings.</p>
        </div>
      `;
    }
  };
}

/**
 * Configures Residual sub-toggle buttons (Top vs Low).
 */
function setupResidualToggles(state: PopupState): void {
  if (state.btnResidualTop) {
    state.btnResidualTop.onclick = () => {
      state.btnResidualTop.classList.add("active");
      if (state.btnResidualLow) {
        state.btnResidualLow.classList.remove("active");
      }
      renderTopDrawerChart(state, "top");
    };
  }

  if (state.btnResidualLow) {
    state.btnResidualLow.onclick = () => {
      state.btnResidualLow.classList.add("active");
      if (state.btnResidualTop) {
        state.btnResidualTop.classList.remove("active");
      }
      renderTopDrawerChart(state, "low");
    };
  }
}

/**
 * Sets up toggle buttons for different views in the popup.
 * 
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function setupToggleButtons(state: PopupState): void {
  if (state.btnLimitBreaks) {
    state.btnLimitBreaks.onclick = () => {
      switchView(state, state.chartLimitBreaksContainer, state.btnLimitBreaks, "720px", "600px");
      loadAndRenderLimitBreaks(state);
    };
  }

  setupLimitBreaksSubtabs(state);

  state.btnChart.onclick = () => {
    switchView(state, state.chartContainer, state.btnChart);
    renderChartFromRows(state);
  };

  state.btnTable.onclick = () => {
    switchView(state, state.tableContainer, state.btnTable);
  };

  state.btnChartBoss.onclick = () => {
    switchView(state, state.chartBossContainer, state.btnChartBoss);
    renderChartBoss(state);
  };

  state.btnAvgSynchro.onclick = () => {
    switchView(state, state.chartAvgContainer, state.btnAvgSynchro, "720px", "600px");
    renderAvgSynchroChart(state);
  };

  state.btnAvgDamage.onclick = () => {
    switchView(state, state.chartAvgDamageContainer, state.btnAvgDamage);
    renderAvgDamageChart(state);
  };

  state.btnTopDrawer.onclick = () => {
    switchView(state, state.chartTopDrawerContainer, state.btnTopDrawer);
    if (state.btnResidualTop) {
      state.btnResidualTop.classList.add("active");
    }
    if (state.btnResidualLow) {
      state.btnResidualLow.classList.remove("active");
    }
    renderTopDrawerChart(state, "top");
  };

  setupResidualToggles(state);
}
