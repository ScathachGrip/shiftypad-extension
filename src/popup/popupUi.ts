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

  state.btnChart.onclick = () => {
    state.tableContainer.style.display = "none";
    state.chartContainer.style.display = "block";
    state.chartBossContainer.style.display = "none";
    state.chartAvgContainer.style.display = "none";
    state.chartAvgDamageContainer.style.display = "none";
    state.chartTopDrawerContainer.style.display = "none";

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

    deactivateAll();
    state.btnTopDrawer.classList.add("active");
    setPopupSize("720px");

    renderTopDrawerChart(state);
  };
}

