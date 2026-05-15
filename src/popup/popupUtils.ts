import { ApexChartOptions, BossOptionsParams, SummaryOptionsParams } from "../types";
import { getBossWeakness } from "../utils/modifier";

/**
 * Returns title color based on current theme.
 *
 * @returns {string}
 */
export function getTitleColor(): string {
  return document.body.classList.contains("theme-dark") ? "#e7e9ee" : "#1e1f26";
}

/**
 * Returns a strict title color for better contrast in charts.
 * 
 * @returns {string}
 */
export function getStrictTitleColor(): string {
  return "#5b6bff";
}

/**
 * Determines the tooltip theme based on the current page theme.
 * 
 * @returns {"dark" | "light"}
 */
export function getTooltipTheme(): "dark" | "light" {
  return document.body.classList.contains("theme-dark") ? "dark" : "light";
}

/**
 * Provides a color palette for charts when in dark mode, or undefined for default colors in light mode.
 * 
 * @returns {string[] | undefined}
 */
export function getChartColors(): string[] | undefined {
  if (!document.body.classList.contains("theme-dark")) {return undefined;}
  return [
    "#7AA2FF", "#9B7CFF", "#4CC9F0", "#22C55E", "#F59E0B",
    "#F97316", "#EF4444", "#EC4899", "#A78BFA", "#38BDF8",
    "#34D399", "#FBBF24", "#FB7185", "#818CF8", "#60A5FA",
    "#2DD4BF", "#F472B6", "#E879F9", "#A3E635", "#FCA5A5"
  ];
}

/**
 * Returns the grid color based on the current theme.
 * 
 * @returns {string}
 */
export function getGridColor(): string {
  return document.body.classList.contains("theme-dark") ? "#222A3A" : "#e6e9f1";
}

/**
 * Returns the axis label color based on the current theme.
 * 
 * @returns {string}
 */
export function getAxisLabelColor(): string {
  return document.body.classList.contains("theme-dark") ? "#c7d0e0" : "#6b7280";
}

/**
 * Generates a cache key based on the provided URL.
 * 
 * @param {string} url - The URL to generate the cache key from.
 * @returns {string} The generated cache key.
 */
export function getCacheKeyFromUrl(url: string): string {
  const u = new URL(url);
  const openid = u.searchParams.get("openid");
  return openid ? `IDENTIFIER_${openid}` : `IDENTIFIER_${u.pathname}`;
}

/**
 * Parses a string or number into a numeric value.
 * 
 * @param {string | number | undefined} val - The value to parse.
 * @returns {number} The parsed number.
 */
export function parseNumber(val: string | number | undefined): number {
  if (typeof val === "number") {return val;}
  if (!val) {return 0;}
  const match = val.match(/([\d.]+)([KMB]?)/i);
  if (!match) {return 0;}
  const [, numStr, suffix] = match;
  let num = parseFloat(numStr);
  switch (suffix.toUpperCase()) {
    case "K": num *= 1_000; break;
    case "M": num *= 1_000_000; break;
    case "B": num *= 1_000_000_000; break;
  }
  return num;
}

/**
 * Formats a number into a string with appropriate suffixes (K, M, B).
 * 
 * @param {number} val - The number to format.
 * @returns {string} The formatted number.
 */
export function formatNumber(val: number): string {
  if (val >= 1_000_000_000) {return (val / 1_000_000_000).toFixed(1) + "B";}
  if (val >= 1_000_000) {return (val / 1_000_000).toFixed(1) + "M";}
  if (val >= 1_000) {return (val / 1_000).toFixed(1) + "K";}
  return val.toString();
}

/**
 * Retrieves the value of a CSS variable, with a fallback if not defined.
 * 
 * @param {string} name - The name of the CSS variable.
 * @param {string} fallback - The fallback value if the CSS variable is not defined.
 * @returns {string} The value of the CSS variable or the fallback.
 */
export function getCssVar(name: string, fallback: string): string {
  const val = getComputedStyle(document.body).getPropertyValue(name).trim();
  return val || fallback;
}

/**
 * Applies a rounded watermark to an image.
 *
 * @param {string} imgURI - The data URI of the image to process.
 * @param {boolean} isDark - Whether the current theme is dark, to adjust watermark color.
 * @return {Promise<string>} A promise that resolves to the data URI of the processed image.
 */
export async function applyRoundedWatermark(imgURI: string, isDark: boolean): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const radius = 30;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imgURI);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(w - radius, 0);
      ctx.quadraticCurveTo(w, 0, w, radius);
      ctx.lineTo(w, h - radius);
      ctx.quadraticCurveTo(w, h, w - radius, h);
      ctx.lineTo(radius, h);
      ctx.quadraticCurveTo(0, h, 0, h - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0, w, h);

      const watermark = "📦ScathachGrip/shiftypad-extension";
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = isDark ? "#ffffff" : "#111827";
      ctx.font = "700 20px Poppins, system-ui, sans-serif";
      ctx.textBaseline = "bottom";
      const padding = 24;
      const metrics = ctx.measureText(watermark);
      ctx.fillText(watermark, w - metrics.width - padding, h - padding);
      ctx.globalAlpha = 1;

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = imgURI;
  });
}


/**
 * Builds the options for a summary chart.
 * 
 * @param {Object} params - The parameters for the chart.
 * @param {Array} params.rows - The data rows for the chart.
 * @param {string} [params.unionName] - The name of the union.
 * @param {string} [params.titleText] - The title text for the chart.
 * @param {number} [params.width] - The width of the chart.
 * @param {number} [params.height] - The height of the chart.
 * @returns {ApexChartOptions} The options for the summary chart.
 */
export function buildSummaryChartOptions({
  rows,
  unionName,
  titleText,
  width,
  height
}: SummaryOptionsParams): ApexChartOptions {
  const labels = rows.map(r => {
    const shortName = r.name.length > 6 ? `${r.name.slice(0, 6)}...` : r.name;
    return `${shortName} (${r.synchroLevel}) [${r.count}]`;
  });
  const data = rows.map(r => parseNumber(r.damage));
  const palette = getChartColors();
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
  const resolvedUnionName = unionName || (titleText ?? "")
    .replace(/^Union:\s*/i, "")
    .trim();

  const bg = getCssVar("--surface", "#ffffff");
  const grid = getGridColor();
  const axis = getAxisLabelColor();

  const isExport = width && width > 1000;
  const titleSize = isExport ? "28px" : "16px";
  const labelSize = isExport ? "18px" : "10px";
  const yTitleSize = isExport ? "18px" : "12px";

  return {
    chart: {
      type: "bar",
      height,
      width,
      background: bg,
      foreColor: axis,
      fontFamily: "Poppins, system-ui, sans-serif",
      toolbar: { show: false },
      animations: { enabled: false }
    },
    series: [{ name: "Damage", data }],
    title: {
      text: `Summary (${resolvedUnionName || "Union"})`,
      align: "center",
      style: { fontSize: titleSize, color: axis, fontWeight: 700 }
    },
    xaxis: {
      categories: labels,
      labels: {
        rotate: -45,
        style: { fontSize: labelSize, colors: colors, fontWeight: 700 }
      }
    },
    yaxis: {
      min: 0,
      max: paddedMax,
      title: { text: "Damage", style: { fontSize: yTitleSize, color: axis } },
      labels: { 
        formatter: (val: number) => formatNumber(val), 
        style: { colors: axis, fontSize: labelSize } 
      }
    },
    plotOptions: { 
      bar: { 
        columnWidth: "80%", 
        distributed: true, 
        startingShape: "flat", 
        endingShape: "rounded",
        dataLabels: {
          position: "top"
        }
      } 
    },
    fill: { opacity: 0.9 },
    colors,
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { theme: getTooltipTheme() },
    grid: { show: true, borderColor: grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } }, padding: { left: 20, right: 20, top: 20, bottom: 20 } }
  };
}

/**
 * Builds the options for a boss damage chart.
 * 
 * @param {Object} params - The parameters for the chart.
 * @param {Object} params.bossData - The data for the boss damage chart.
 * @param {number} [params.width] - The width of the chart.
 * @param {number} [params.height] - The height of the chart.
 * @returns {ApexChartOptions} The options for the boss damage chart.
 */
export function buildBossChartOptions({ bossData, width, height }: BossOptionsParams): ApexChartOptions {
  const categories = bossData.players.map(p => `${p.player} (${p.synchro || "N/A"})`);
  const seriesData = bossData.players.map(p => p.damage);
  const palette = getChartColors();
  const colors = palette
    ? bossData.players.map((_, i) => palette[i % palette.length])
    : bossData.players.map(
      () => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`
    );

  const bg = getCssVar("--surface", "#ffffff");
  const grid = getGridColor();
  const axis = getAxisLabelColor();

  const isExport = width && width > 1000;
  const titleSize = isExport ? "28px" : "18px";
  const labelSize = isExport ? "18px" : "11px";
  const yTitleSize = isExport ? "18px" : "12px";

  return {
    chart: {
      type: "bar",
      height,
      width,
      background: bg,
      foreColor: axis,
      fontFamily: "Poppins, system-ui, sans-serif",
      toolbar: { show: false },
      animations: { enabled: false }
    },
    series: [{ name: "Damage", data: seriesData }],
    xaxis: {
      categories,
      tickAmount: categories.length,
      tickPlacement: "on",
      labels: {
        rotate: -30,
        rotateAlways: true,
        hideOverlappingLabels: false,
        style: { colors, fontWeight: 700, fontSize: labelSize }
      }
    },
    yaxis: {
      title: { text: "Damage", style: { fontSize: yTitleSize } },
      labels: { formatter: (val: number) => formatNumber(val), style: { colors: axis, fontSize: labelSize } }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
        distributed: true,
        dataLabels: {
          position: "top"
        }
      }
    },
    dataLabels: { 
      enabled: false
    },
    tooltip: { theme: getTooltipTheme() },
    grid: { show: true, borderColor: grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } }, padding: { left: 20, right: 20, top: 20, bottom: 20 } },
    colors,
    title: { 
      text: `${bossData.boss} (${getBossWeakness(bossData.boss)})`, 
      align: "center", 
      style: { fontSize: titleSize, color: axis, fontWeight: 700 } 
    },
    legend: { show: false }
  };
}
/**
 * Displays a toast notification in the popup.
 * 
 * @param {string} message - The message to display.
 * @param {number} [duration=3000] - The duration in milliseconds to display the toast.
 */
export function showToast(message: string, duration = 3000): void {
  const container = document.getElementById("toastContainer");
  if (!container) {return;}
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
