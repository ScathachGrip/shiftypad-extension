import { ApexChartOptions, ApexChartsConstructor, BossData, PlayerRaidResult, PopupState, NikkeHero } from "../types";
import { getBossWeakness } from "../utils/modifier";
import * as PopupUtils from "./popupUtils";

declare const ApexCharts: ApexChartsConstructor;

/**
 * Renders the average damage chart in the popup based on the current state, including player names, synchro levels, and damage values.
 * @param {PopupState} state - The current state of the popup, including data rows and union name. 
 * @returns {void}
 */
export function renderAvgDamageChart(state: PopupState): void {
  if (!state.rows || state.rows.length === 0) {
    alert("No data available to render charts. Scrape first.");
    return;
  }

  const dataSorted = [...state.rows].sort((a, b) => PopupUtils.parseNumber(b.damage) - PopupUtils.parseNumber(a.damage));
  const labels = dataSorted.map(r => {
    const shortName = r.name.length > 8 ? `${r.name.slice(0, 8)}...` : r.name;
    return `${shortName} (${r.synchroLevel ?? 0})`;
  });
  const data = dataSorted.map(r => PopupUtils.parseNumber(r.damage));
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const avgLine = data.map(() => avg);

  if (state.apexChartAvgDamage) { void state.apexChartAvgDamage.destroy(); }

  const options: ApexChartOptions = {
    chart: { type: "area", height: 420, toolbar: { show: false } },
    stroke: { curve: "smooth", width: 3 },
    series: [
      { name: "Personal Damage", data },
      { name: "Union Avg Damage", data: avgLine }
    ],
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels,
      labels: { rotate: -45, style: { colors: PopupUtils.getAxisLabelColor(), fontSize: "10px" } }
    },
    yaxis: {
      labels: { formatter: (val: number) => PopupUtils.formatNumber(val), style: { colors: PopupUtils.getAxisLabelColor() } },
      title: { text: "Damage" }
    },
    colors: document.body.classList.contains("theme-dark")
      ? ["#60A5FA", "#34D399"]
      : ["#3B82F6", "#10B981"],
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.4,
        opacityFrom: 0.5,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    markers: { size: 0 },
    grid: { borderColor: PopupUtils.getGridColor() },
    legend: { position: "bottom", labels: { colors: PopupUtils.getAxisLabelColor() } },
    title: {
      text: `${state.unionName || "Union"}: Avg Damage ${PopupUtils.formatNumber(avg)}`,
      align: "center",
      style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
    },
    tooltip: { theme: PopupUtils.getTooltipTheme() }
  };

  state.apexChartAvgDamage = new ApexCharts(document.querySelector("#chartAvgDamageDummy"), options);
  void state.apexChartAvgDamage.render();
}

/**
 * Renders the top drawer chart in the popup based on the current state, including player names, synchro levels, and damage efficiency.
 * @param {PopupState} state - The current state of the popup, including data rows and union name.
 * @returns {void}
 */
export function renderTopDrawerChart(state: PopupState, order: "top" | "low" = "top"): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url;
    if (!url) {
      alert("No data available to render charts. Scrape first.");
      return;
    }

    const key = PopupUtils.getCacheKeyFromUrl(url);
    if (!state.activeSeasonKey) {
      alert("No season selected. Pick a real season first.");
      return;
    }
    const storageKey = `ALL_UNION_RAID_DAMAGE_DATA_${key}__${state.activeSeasonKey}`;

    chrome.storage.local.get(storageKey, (res) => {
      const data = res[storageKey] as PlayerRaidResult[] | undefined;
      if (!Array.isArray(data) || data.length === 0) {
        alert("No data available to render charts. Scrape first.");
        return;
      }

      const candidates = data.filter((p) => p.total_attempt === 3 && p.synchro > 0);
      if (!candidates.length) {
        alert("No valid 3-attempt data available.");
        return;
      }

      const totalDamage = (p: PlayerRaidResult): number =>
        p.total_damage ?? p.rows.reduce((sum, r) => sum + r.damage, 0);

      const fitLinear = (items: PlayerRaidResult[]): { a: number; b: number } => {
        const xs = items.map((p) => p.synchro);
        const ys = items.map((p) => totalDamage(p));
        const n = xs.length;
        const meanX = xs.reduce((s, v) => s + v, 0) / n;
        const meanY = ys.reduce((s, v) => s + v, 0) / n;
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
          const dx = xs[i] - meanX;
          num += dx * (ys[i] - meanY);
          den += dx * dx;
        }
        const a = den === 0 ? 0 : num / den;
        const b = meanY - a * meanX;
        return { a, b };
      };

      const { a, b } = fitLinear(candidates);
      const ranked = [...candidates].sort((p1, p2) => {
        const r1 = totalDamage(p1) - (a * p1.synchro + b);
        const r2 = totalDamage(p2) - (a * p2.synchro + b);
        if (r1 !== r2) {
          return order === "top" ? r2 - r1 : r1 - r2;
        }
        return order === "top" ? totalDamage(p2) - totalDamage(p1) : totalDamage(p1) - totalDamage(p2);
      });

      const slice5 = ranked.slice(0, 5);
      const labels = slice5.map((p) => `${p.player} (${p.synchro})`);
      const residuals = slice5.map((p) => totalDamage(p) - (a * p.synchro + b));
      const totals = slice5.map((p) => totalDamage(p));
      const synchros = slice5.map((p) => p.synchro);

      if (state.apexChartTopDrawer) { void state.apexChartTopDrawer.destroy(); }

      const isLow = order === "low";
      const colors = slice5.map((_, i) => {
        if (isLow) {
          const reds = ["#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b"];
          return reds[i % reds.length];
        }
        return `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`;
      });

      let options: ApexChartOptions;

      if (isLow) {
        options = {
          series: [{ name: "Residual", data: residuals }],
          chart: { type: "bar", height: 420, toolbar: { show: false } },
          colors,
          plotOptions: { bar: { distributed: true, horizontal: true } },
          dataLabels: {
            enabled: true,
            formatter: (val: number) => PopupUtils.formatNumber(val)
          },
          xaxis: {
            categories: labels,
            labels: {
              style: { colors: PopupUtils.getAxisLabelColor(), fontWeight: 600 },
              formatter: (val: string) => PopupUtils.formatNumber(Number(val))
            },
            title: { text: "Residual (Below Expected Damage)", style: { color: PopupUtils.getAxisLabelColor() } }
          },
          yaxis: {
            title: { text: "", style: { color: PopupUtils.getAxisLabelColor() } },
            labels: { style: { colors: PopupUtils.getAxisLabelColor() } }
          },
          grid: { borderColor: PopupUtils.getGridColor() },
          legend: { show: false },
          title: {
            text: `${state.unionName || "Union"}: Below Expectations`,
            align: "center",
            style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
          },
          tooltip: {
            theme: PopupUtils.getTooltipTheme(),
            custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
              const name = labels[dataPointIndex] ?? "";
              const residual = residuals[dataPointIndex] ?? 0;
              const damage = totals[dataPointIndex] ?? 0;
              const synchro = synchros[dataPointIndex] ?? 0;
              return `
                <div style="padding:8px 10px;">
                  <div style="font-weight:700; margin-bottom:6px;">${name}</div>
                  <div>Residual: ${PopupUtils.formatNumber(residual)}</div>
                  <div>Damage: ${PopupUtils.formatNumber(damage)}</div>
                  <div>Synchro: ${synchro}</div>
                </div>
              `;
            }
          }
        };
      } else {
        options = {
          chart: { type: "bar", height: 420, toolbar: { show: false } },
          series: [{ name: "Residual", data: residuals }],
          xaxis: {
            categories: labels,
            labels: {
              rotate: -20,
              rotateAlways: false,
              style: { colors: PopupUtils.getAxisLabelColor(), fontWeight: 600 }
            }
          },
          yaxis: {
            title: { text: "Residual (Above Expected Damage)", style: { color: PopupUtils.getAxisLabelColor() } },
            labels: { formatter: (val: number) => PopupUtils.formatNumber(val), style: { colors: PopupUtils.getAxisLabelColor() } }
          },
          plotOptions: { bar: { columnWidth: "55%", distributed: true } },
          dataLabels: {
            enabled: true,
            formatter: (val: number) => PopupUtils.formatNumber(val)
          },
          colors,
          grid: { borderColor: PopupUtils.getGridColor() },
          legend: { show: false },
          title: {
            text: `${state.unionName || "Union"}: Above Expectations`,
            align: "center",
            style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
          },
          tooltip: {
            theme: PopupUtils.getTooltipTheme(),
            custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
              const name = labels[dataPointIndex] ?? "";
              const residual = residuals[dataPointIndex] ?? 0;
              const damage = totals[dataPointIndex] ?? 0;
              const synchro = synchros[dataPointIndex] ?? 0;
              return `
                <div style="padding:8px 10px;">
                  <div style="font-weight:700; margin-bottom:6px;">${name}</div>
                  <div>Residual: ${PopupUtils.formatNumber(residual)}</div>
                  <div>Damage: ${PopupUtils.formatNumber(damage)}</div>
                  <div>Synchro: ${synchro}</div>
                </div>
              `;
            }
          }
        };
      }

      state.apexChartTopDrawer = new ApexCharts(document.querySelector("#chartTopDrawerDummy"), options);
      void state.apexChartTopDrawer.render();
    });
  });
}

/** 
 * Renders the average synchro level chart in the popup based on the current state, including player names, synchro levels, and damage values.
 * @param {PopupState} state - The current state of the popup, including data rows and union name. 
 * @returns {void}
 */
export function renderAvgSynchroChart(state: PopupState): void {
  if (!state.rows || state.rows.length === 0) { return; }
  const levels = state.rows.map(r => r.synchroLevel ?? 0).filter(n => Number.isFinite(n) && n > 0);
  if (!levels.length) {
    alert("No synchro data available.");
    return;
  }

  const min = Math.min(...levels);
  const max = Math.max(...levels);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    alert("No valid synchro data available.");
    return;
  }
  const step = 20;
  const start = min - ((min - 1) % step);
  const end = max + (step - 1 - ((max - 1) % step));
  const buckets: Array<{ label: string; count: number }> = [];
  for (let v = start; v <= end; v += step) {
    buckets.push({ label: `${v} - ${v + step}`, count: 0 });
  }
  if (!buckets.length) {
    alert("No valid synchro buckets available.");
    return;
  }
  for (const lv of levels) {
    const idx = Math.min(buckets.length - 1, Math.floor((lv - start) / step));
    buckets[idx].count += 1;
  }

  const nonZeroBuckets = buckets.filter(b => b.count > 0);
  if (!nonZeroBuckets.length) {
    alert("No synchro data available.");
    return;
  }

  const labels = nonZeroBuckets.map(b => b.label);
  const series = nonZeroBuckets.map(b => b.count);
  const dominant = nonZeroBuckets.reduce((best, cur) => (cur.count > best.count ? cur : best), nonZeroBuckets[0]);

  if (state.apexChartAvg) { void state.apexChartAvg.destroy(); }

  const palette = PopupUtils.getChartColors();
  const colors = palette
    ? series.map((_, i) => palette[i % palette.length])
    : undefined;

  const isDark = document.body.classList.contains("theme-dark");
  const gridColor = PopupUtils.getGridColor();
  const ringColor = isDark ? "#1a2231" : gridColor;
  const spokeColor = isDark ? "#1a2231" : gridColor;
  const options: ApexChartOptions = {
    chart: {
      type: "polarArea",
      height: 420,
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    labels,
    series,
    stroke: { colors: [ringColor], width: 0 },
    fill: { opacity: 0.9 },
    colors,
    yaxis: { show: false },
    plotOptions: {
      polarArea: {
        rings: { strokeColor: ringColor, strokeWidth: isDark ? 0.6 : 0.8 },
        spokes: { strokeColor: spokeColor, strokeWidth: isDark ? 0.6 : 0.8 }
      }
    },
    grid: { borderColor: ringColor },
    legend: { position: "bottom", labels: { colors: PopupUtils.getAxisLabelColor() } },
    title: {
      text: `${state.unionName || "Union"}: Avg Synchro ${dominant.label}`,
      align: "center",
      style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
    },
    tooltip: { theme: PopupUtils.getTooltipTheme() }
  };

  state.apexChartAvg = new ApexCharts(document.querySelector("#chartAvgDummy"), options);
  void state.apexChartAvg.render();
}

/**
 * Renders the boss damage chart in the popup based on the current state, including boss names, player contributions, and damage values.
 * @param {PopupState} state - The current state of the popup, including data rows and union name.
 * @returns {void}
 */
export function renderChartBoss(state: PopupState): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "ALL_UNION_RAID_DAMAGE_DATA_REQUEST", seasonKey: state.activeSeasonKey },
      (res) => {
        if (chrome.runtime.lastError) {
          const tabId = tabs[0]?.id;
          if (!tabId) {
            return;
          }
          alert("Page connection lost. Refreshing the page to reconnect.");
          void chrome.tabs.reload(tabId);
          window.close();
          return;
        }
        const dataArray = res?.damageData as PlayerRaidResult[] | undefined;

        if (!Array.isArray(dataArray) || dataArray.length === 0) {
          alert("No data available to render charts. Scrape first.");
          return;
        }

        const bossMap: Record<string, Record<string, { damage: number; synchro: number }>> = {};
        for (const playerData of dataArray) {
          const playerName = playerData.player;
          const playerSynchro = Number(playerData.synchro ?? 0);
          for (const row of playerData.rows) {
            if (!bossMap[row.boss]) { bossMap[row.boss] = {}; }
            const prev = bossMap[row.boss][playerName]?.damage ?? 0;
            bossMap[row.boss][playerName] = {
              damage: prev + row.damage,
              synchro: playerSynchro,
            };
          }
        }

        let bossArray = Object.entries(bossMap).map(([bossName, playerObj]) => {
          const players = Object.entries(playerObj)
            .map(([player, info]) => ({ player, damage: info.damage, synchro: info.synchro }))
            .sort((a, b) => b.damage - a.damage);
          return { boss: bossName, players };
        });

        bossArray = bossArray.slice(0, 5);

        const container = document.querySelector<HTMLDivElement>("#chartBossContainer");
        if (!container) { return; }
        container.innerHTML = "";

        for (const bossData of bossArray) {
          const chartBlock = document.createElement("div");
          chartBlock.className = "chart-block";
          container.appendChild(chartBlock);

          const dlWrap = document.createElement("div");
          dlWrap.className = "chart-download chart-download--top";
          chartBlock.appendChild(dlWrap);

          const dlBtn = document.createElement("button");
          dlBtn.className = "icon-btn";
          const safeBossLabel = bossData.boss.replace(/\s+/g, " ").trim();
          dlBtn.innerHTML = `
              <span>💾 ${safeBossLabel} PNG</span>
            `;

          dlBtn.onclick = () => downloadBossChartPng(state, bossData);
          dlWrap.appendChild(dlBtn);
          dlWrap.insertAdjacentHTML("afterend", "<br>");

          const chartDiv = document.createElement("div");
          chartDiv.id = `chart_${bossData.boss.replace(/\W/g, "_")}`;
          chartDiv.style.height = "420px";
          chartDiv.style.marginBottom = "4px";
          chartBlock.appendChild(chartDiv);

          const categories = bossData.players.map(p => `${p.player} (${p.synchro || "N/A"})`);
          const seriesData = bossData.players.map(p => p.damage);
          const darkPalette = PopupUtils.getChartColors();
          const colors = darkPalette
            ? bossData.players.map((_, i) => darkPalette[i % darkPalette.length])
            : bossData.players.map(
              () => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`
            );
          const denseLabels = categories.length > 12;
          const labelFontSize = denseLabels ? "9px" : "11px";

          const options: ApexChartOptions = {
            chart: {
              type: "bar",
              height: 420,
              width: "100%",
              toolbar: { show: false },
              animations: { enabled: true }
            },
            series: [{ name: "Damage", data: seriesData }],
            title: {
              text: `${bossData.boss} (${getBossWeakness(bossData.boss)})`,
              align: "center",
              style: { fontSize: "18px", color: PopupUtils.getStrictTitleColor() }
            },
            xaxis: {
              categories,
              labels: {
                rotate: -35,
                rotateAlways: denseLabels,
                hideOverlappingLabels: false,
                showDuplicates: true,
                trim: false,
                style: { colors, fontWeight: 600, fontSize: labelFontSize }
              }
            },
            yaxis: {
              title: { text: "Damage" },
              labels: { formatter: (val: number) => PopupUtils.formatNumber(val), style: { colors: PopupUtils.getAxisLabelColor() } }
            },
            plotOptions: { bar: { columnWidth: "75%", distributed: true } },
            colors,
            dataLabels: { enabled: false },
            tooltip: { theme: PopupUtils.getTooltipTheme() },
            grid: { show: true, borderColor: PopupUtils.getGridColor() },
            legend: { show: false }
          };

          const chart = new ApexCharts(chartDiv, options);
          void chart.render();
        }
      }
    );
  });
}

/**
 * Renders the summary chart in the popup based on the current state, including player names, synchro levels, and damage values.
 * @param {PopupState} state - The current state of the popup, including data rows and union name. 
 * @returns {void}
 */
export function renderChartFromRows(state: PopupState): void {
  if (!state.rows || state.rows.length === 0) {
    alert("No data available to render charts. Scrape first.");
    return;
  }
  const labels = state.rows.map(r => {
    const shortName = r.name.length > 6 ? `${r.name.slice(0, 6)}...` : r.name;
    return `${shortName} (${r.synchroLevel}) [${r.count}]`;
  });

  const data = state.rows.map(r => PopupUtils.parseNumber(r.damage));
  const unionName = state.unionName || (state.title.textContent ?? "")
    .replace(/^Union:\s*/i, "")
    .trim();

  if (state.apexChart) { void state.apexChart.destroy(); }

  const palette = PopupUtils.getChartColors();
  const colors = palette
    ? data.map((_, i) => palette[i % palette.length])
    : data.map(() => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return `rgb(${r},${g},${b})`;
    });

  const maxValue = Math.max(...data);
  const paddedMax = Math.ceil(maxValue * 1.1);

  const options: ApexChartOptions = {
    chart: { type: "bar", height: 500, width: "100%", toolbar: { show: false, tools: { download: false, selection: false, zoom: false, pan: false } } },
    series: [{ name: "Damage", data }],
    title: {
      text: `${unionName || "Union"} - Summary`,
      align: "center",
      style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
    },
    xaxis: {
      categories: labels,
      labels: {
        rotate: -45,
        style: { fontSize: "9px", fontWeight: 600, colors }
      }
    },
    yaxis: {
      min: 0,
      max: paddedMax,
      title: { text: "Damage" },
      labels: { formatter: (val: number) => PopupUtils.formatNumber(val), style: { colors: PopupUtils.getAxisLabelColor() } }
    },
    plotOptions: { bar: { columnWidth: "80%", distributed: true, startingShape: "flat", endingShape: "rounded" } },
    fill: { opacity: 0.9 },
    colors,
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { theme: PopupUtils.getTooltipTheme() },
    grid: { show: true, borderColor: PopupUtils.getGridColor(), xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } }, padding: { left: 0, right: 0 } }
  };

  state.apexChart = new ApexCharts(document.querySelector("#chartDummy"), options);
  void state.apexChart.render();
}

/**
 * Generates a PNG image of the summary chart in the popup and triggers a download, based on the current state including player names, synchro levels, and damage values.
 * @param {PopupState} state - The current state of the popup, including data rows and union name. 
 * @returns {Promise<void>} - A promise that resolves when the download is triggered.
 */
export async function downloadSummaryChartPng(state: PopupState): Promise<void> {
  if (!state.rows.length) {
    alert("No data to export.");
    return;
  }

  const hidden = document.createElement("div");
  hidden.style.position = "fixed";
  hidden.style.left = "-99999px";
  hidden.style.top = "-99999px";
  hidden.style.width = "1600px";
  hidden.style.height = "1000px";
  document.body.appendChild(hidden);

  const options = PopupUtils.buildSummaryChartOptions({
    rows: state.rows,
    unionName: state.unionName,
    titleText: state.title.textContent ?? "",
    width: 1600,
    height: 1000
  });

  // CRITICAL: Inject fonts into hidden container for PNG export
  const style = document.createElement("style");
  style.textContent = Array.from(document.querySelectorAll("style"))
    .map(s => s.textContent)
    .join("\n");
  hidden.appendChild(style);

  const tempChart = new ApexCharts(hidden, options);
  await tempChart.render();
  await new Promise(resolve => setTimeout(resolve, 200));

  const uri = await tempChart.dataURI();
  let imgURI = uri?.imgURI;

  await tempChart.destroy();
  hidden.remove();

  if (!imgURI) {
    alert("Failed to generate image.");
    return;
  }

  imgURI = await PopupUtils.applyRoundedWatermark(imgURI, document.body.classList.contains("theme-dark"));

  const name = (state.unionName || "union").replace(/\s+/g, "_");
  const a = document.createElement("a");
  a.href = imgURI;
  a.download = `summary_${name}.png`;
  a.click();
}

/**
 * Generates a PNG image of the boss damage chart in the popup and triggers a download, based on the current state including boss names, player contributions, and damage values.
 * @param {PopupState} state - The current state of the popup, including data rows and union name.
 * @param {BossData} bossData - The data for the specific boss chart to be downloaded, including boss name and player contributions.
 * @returns {Promise<void>} - A promise that resolves when the download is triggered.
 */
export async function downloadBossChartPng(state: PopupState, bossData: BossData): Promise<void> {
  const hidden = document.createElement("div");
  hidden.style.position = "fixed";
  hidden.style.left = "-99999px";
  hidden.style.top = "-99999px";
  hidden.style.width = "1600px";
  hidden.style.height = "1000px";
  document.body.appendChild(hidden);

  const options = PopupUtils.buildBossChartOptions({ bossData, width: 1600, height: 1000 });

  // CRITICAL: Inject fonts into hidden container for PNG export
  const style = document.createElement("style");
  style.textContent = Array.from(document.querySelectorAll("style"))
    .map(s => s.textContent)
    .join("\n");
  hidden.appendChild(style);

  const tempChart = new ApexCharts(hidden, options);
  await tempChart.render();
  await new Promise(resolve => setTimeout(resolve, 200));

  const uri = await tempChart.dataURI();
  let imgURI = uri?.imgURI;

  await tempChart.destroy();
  hidden.remove();

  if (!imgURI) {
    alert("Failed to generate image.");
    return;
  }

  imgURI = await PopupUtils.applyRoundedWatermark(imgURI, document.body.classList.contains("theme-dark"));

  const safeBoss = bossData.boss.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const a = document.createElement("a");
  a.href = imgURI;
  a.download = `boss_${safeBoss}.png`;
  a.click();
}

/**
 * Checks which chart container is currently visible in the popup and calls the appropriate rendering function to refresh the chart based on the current state, including player names, synchro levels, damage values, and union name.
 * @param {PopupState} state - The current state of the popup, including data rows, union name, and references to chart containers and ApexCharts instances.
 * @returns {void}
 */
export function refreshVisibleCharts(state: PopupState): void {
  if (state.chartContainer.style.display === "block") {
    renderChartFromRows(state);
    return;
  }
  if (state.chartBossContainer.style.display === "block") {
    renderChartBoss(state);
    return;
  }
  if (state.chartAvgContainer.style.display === "block") {
    renderAvgSynchroChart(state);
    return;
  }
  if (state.chartAvgDamageContainer.style.display === "block") {
    renderAvgDamageChart(state);
    return;
  }
  if (state.chartLimitBreaksContainer.style.display === "flex") {
    if (document.getElementById("btnLimitBreaksCp")?.classList.contains("active") && state.currentLimitBreaksData) {
      void renderLimitBreaksCpChart(state, state.currentLimitBreaksData);
    } else if (document.getElementById("btnLimitBreaksSynchro")?.classList.contains("active") && state.currentLimitBreaksData) {
      void renderLimitBreaksSynchroChart(state, state.currentLimitBreaksData);
    } else if (document.getElementById("btnLimitBreaksWhale")?.classList.contains("active") && state.currentLimitBreaksData) {
      void renderLimitBreaksWhaleChart(state, state.currentLimitBreaksData);
    }
    return;
  }
  if (state.chartTopDrawerContainer.style.display === "block") {
    const isLow = state.btnResidualLow.classList.contains("active");
    renderTopDrawerChart(state, isLow ? "low" : "top");
    return;
  }
}

/**
 * Renders a bar chart showing the total Combat Power for each player.
 */
export async function renderLimitBreaksCpChart(state: PopupState, data: PlayerRaidResult[]): Promise<void> {
  if (state.apexChartLimitBreaksCp) {
    await state.apexChartLimitBreaksCp.destroy();
    state.apexChartLimitBreaksCp = null;
  }

  const cpData: { player: string; cp: number }[] = [];

  data.forEach(playerResult => {
    let totalCp = 0;
    const uniqueHeroes = new Map<string, NikkeHero>();

    playerResult.rows.forEach(r => {
      if (r.heroes) {
        r.heroes.forEach(h => {
          uniqueHeroes.set(h.avatarUrl, h);
        });
      }
    });

    uniqueHeroes.forEach(h => {
      const cpNum = parseInt(String(h.combatPower).replace(/,/g, ""), 10) || 0;
      totalCp += cpNum;
    });

    if (totalCp > 0) {
      cpData.push({ player: playerResult.player, cp: totalCp });
    }
  });

  cpData.sort((a, b) => b.cp - a.cp);

  const labels = cpData.map(d => d.player);
  const seriesData = cpData.map(d => d.cp);

  const palette = PopupUtils.getChartColors();
  const colors = palette
    ? seriesData.map((_, i) => palette[i % palette.length])
    : seriesData.map(() => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`);

  const options: ApexChartOptions = {
    chart: { type: "bar", height: 420, width: "100%", toolbar: { show: false } },
    series: [{ name: "Combat Power", data: seriesData }],
    title: {
      text: `${state.unionName || "Union"} - Combat Power`,
      align: "center",
      style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
    },
    plotOptions: {
      bar: { horizontal: false, distributed: true, columnWidth: "70%", borderRadius: 4, dataLabels: { position: "top" } }
    },
    xaxis: {
      categories: labels,
      tickAmount: labels.length,
      tickPlacement: "on",
      labels: {
        rotate: -30,
        rotateAlways: true,
        hideOverlappingLabels: false,
        style: { colors: colors, fontSize: "11px", fontWeight: 600 }
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => PopupUtils.formatNumber(val),
        style: { colors: PopupUtils.getAxisLabelColor() }
      }
    },
    colors: colors,
    dataLabels: { enabled: false },
    tooltip: { theme: document.body.classList.contains("theme-dark") ? "dark" : "light" },
    grid: { borderColor: PopupUtils.getGridColor() },
    legend: { show: false }
  };

  state.apexChartLimitBreaksCp = new ApexCharts(state.limitBreaksCpChartOutput, options);
  await state.apexChartLimitBreaksCp.render();
}



/**
 * Renders a bar chart showing the Synchro Level for each player.
 */
export async function renderLimitBreaksSynchroChart(state: import("../types").PopupState, data: import("../types").PlayerRaidResult[]): Promise<void> {
  if (state.apexChartLimitBreaksSynchro) {
    await state.apexChartLimitBreaksSynchro.destroy();
    state.apexChartLimitBreaksSynchro = null;
  }

  const synchroData = data.map(r => ({ player: r.player, synchro: r.synchro })).sort((a, b) => b.synchro - a.synchro);

  const labels = synchroData.map(d => d.player);
  const seriesData = synchroData.map(d => d.synchro);

  const palette = PopupUtils.getChartColors();
  const colors = palette
    ? seriesData.map((_, i) => palette[i % palette.length])
    : seriesData.map(() => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`);

  const options: import("../types").ApexChartOptions = {
    chart: { type: "bar", height: 420, width: "100%", toolbar: { show: false } },
    series: [{ name: "Synchro Level", data: seriesData }],
    title: {
      text: `${state.unionName || "Union"} - Synchro Level`,
      align: "center",
      style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
    },
    plotOptions: {
      bar: { horizontal: false, distributed: true, columnWidth: "70%", borderRadius: 4, dataLabels: { position: "top" } }
    },
    xaxis: {
      categories: labels,
      tickAmount: labels.length,
      tickPlacement: "on",
      labels: {
        rotate: -30,
        rotateAlways: true,
        hideOverlappingLabels: false,
        style: { colors: colors, fontSize: "11px", fontWeight: 600 }
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => PopupUtils.formatNumber(val),
        style: { colors: PopupUtils.getAxisLabelColor() }
      }
    },
    colors: colors,
    dataLabels: { enabled: false },
    tooltip: { theme: document.body.classList.contains("theme-dark") ? "dark" : "light" },
    grid: { borderColor: PopupUtils.getGridColor() },
    legend: { show: false }
  };

  state.apexChartLimitBreaksSynchro = new ApexCharts(state.limitBreaksSynchroChartOutput, options);
  await state.apexChartLimitBreaksSynchro.render();
}

/**
 * Renders a bar chart showing the Whale Score for each player.
 */
export async function renderLimitBreaksWhaleChart(state: import("../types").PopupState, data: import("../types").PlayerRaidResult[]): Promise<void> {
  if (state.apexChartLimitBreaksWhale) {
    await state.apexChartLimitBreaksWhale.destroy();
    state.apexChartLimitBreaksWhale = null;
  }

  const whaleData = data.map(playerResult => {
    let totalWhaleScore = 0;
    const uniqueHeroes = new Map<string, import("../types").NikkeHero>();

    playerResult.rows.forEach(r => {
      if (r.heroes) {
        r.heroes.forEach(h => {
          uniqueHeroes.set(h.avatarUrl, h);
        });
      }
    });

    uniqueHeroes.forEach(h => {
      let score = 0;
      if (h.finalTier === "MAX") {
        score = 10;
      } else if (h.finalTier.startsWith("Core")) {
        const coreNum = parseInt(h.finalTier.replace(/[^0-9]/g, ""), 10);
        score = 3 + (isNaN(coreNum) ? 0 : coreNum);
      } else if (h.finalTier.startsWith("LB")) {
        const lbNum = parseInt(h.finalTier.replace(/[^0-9]/g, ""), 10);
        score = isNaN(lbNum) ? 0 : lbNum;
      } else {
        score = h.limitBreak || 0;
      }
      totalWhaleScore += score;
    });

    return { player: playerResult.player, score: totalWhaleScore, synchro: playerResult.synchro };
  }).sort((a, b) => b.score - a.score);

  const labels = whaleData.map(d => d.player);
  const seriesData = whaleData.map(d => d.score);
  const synchroData = whaleData.map(d => d.synchro);

  const palette = PopupUtils.getChartColors();
  const colors = palette
    ? seriesData.map((_, i) => palette[i % palette.length])
    : seriesData.map(() => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`);

  const options: import("../types").ApexChartOptions = {
    chart: { type: "bar", height: Math.max(420, labels.length * 36), width: "100%", toolbar: { show: false } },
    series: [{ name: "Limit break", data: seriesData }],
    title: {
      text: `${state.unionName || "Union"} - Whale Score`,
      align: "center",
      style: { fontSize: "16px", color: PopupUtils.getStrictTitleColor() }
    },
    plotOptions: {
      bar: { horizontal: true, distributed: true, barHeight: "70%", borderRadius: 4, dataLabels: { position: "top" } }
    },
    xaxis: {
      categories: labels,
      labels: {
        formatter: (val: number) => PopupUtils.formatNumber(val),
        style: { colors: colors, fontSize: "11px", fontWeight: 600 }
      }
    },
    yaxis: {
      labels: {
        style: { colors: colors, fontSize: "11px", fontWeight: 600 }
      }
    },
    colors: colors,
    dataLabels: {
      enabled: true,
      formatter: (val: number) => String(val),
      style: { fontSize: "11px", colors: [PopupUtils.getStrictTitleColor()] },
      offsetX: 8
    },
    tooltip: {
      theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
      y: {
        formatter: (val: number, opts: { dataPointIndex: number }) => {
          return `${val} (Synchro: ${synchroData[opts.dataPointIndex]})`;
        }
      }
    },
    grid: { borderColor: PopupUtils.getGridColor() },
    legend: { show: false }
  };

  state.apexChartLimitBreaksWhale = new ApexCharts(state.limitBreaksWhaleChartOutput, options);
  await state.apexChartLimitBreaksWhale.render();
}
