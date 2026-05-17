import { initPopup } from "./popupInit";
import { installLogForwarder } from "./utils/logForwarder"; // test

installLogForwarder("Popup");

window.addEventListener("error", (event) => {
  const msg = String(event.message || "");
  const errMsg = String((event).error?.message || "");
  if ((msg + errMsg).includes("Expected number") && (msg + errMsg).includes("NaN")) {
    event.preventDefault();
  }
}, true);

window.onerror = (message) => {
  const msg = String(message || "");
  if (msg.includes("Expected number") && msg.includes("NaN")) {
    return true;
  }
  return false;
};

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason?.message || event.reason || "");
  if (msg.includes("Expected number") && msg.includes("NaN")) {
    event.preventDefault();
  }
}, true);

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const text = args.map((a) => String(a)).join(" ");
  if (text.includes("Expected number") && text.includes("NaN") && text.includes("<path>")) {
    return;
  }
  originalConsoleError(...args);
};

const POPUP_STYLE = `
@font-face {
  font-family: "Poppins";
  src: url("/assets/fonts/Poppins-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Poppins";
  src: url("/assets/fonts/Poppins-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Poppins";
  src: url("/assets/fonts/Poppins-Black.woff2") format("woff2");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}

:root {
  --bg: #f6f7fb;
  --bg-2: #eef1f7;
  --surface: #ffffff;
  --surface-2: #f3f5fb;
  --text: #0f1320;
  --muted: #6b7280;
  --accent: #5b6bff;
  --accent-2: #8b5cf6;
  --border: #e6e9f1;
  --row-border: #e9edf6;
  --row-hover: rgba(15, 19, 32, 0.04);
  --row-alt: rgba(15, 19, 32, 0.02);
  --btn-bg: #ffffff;
  --btn-text: #0f1320;
  --shadow: 0 8px 24px rgba(15, 19, 32, 0.08);
  --bg-light: #f6f7fb;
  --bg-dark: #0b0f16;
  --accent-light: #5b6bff;
  --accent-2-light: #8b5cf6;
  --accent-dark: #7c8cff;
  --accent-2-dark: #9b7cff;
  --theme-ripple-duration: 420ms;
}

body {
  font-family: "Poppins", system-ui, sans-serif;
  width: 720px;
  padding: 12px;
  background:
    radial-gradient(1200px 800px at -20% -20%, rgba(91, 107, 255, 0.12), transparent 45%),
    radial-gradient(900px 700px at 120% 0%, rgba(139, 92, 246, 0.12), transparent 45%),
    var(--bg);
  color: var(--text);
}

*,
*::before,
*::after {
  font-family: "Poppins", system-ui, sans-serif !important;
  box-sizing: border-box;
}

body.theme-dark {
  --bg: #0b0f16;
  --bg-2: #0f1420;
  --surface: #101624;
  --surface-2: #121a2b;
  --text: #eef2ff;
  --muted: #9aa3b2;
  --accent: #7c8cff;
  --accent-2: #9b7cff;
  --accent-active: #f25555;
  --border: #1d2433;
  --row-border: #1a2231;
  --row-hover: rgba(255, 255, 255, 0.06);
  --row-alt: rgba(255, 255, 255, 0.03);
  --btn-bg: #0f1726;
  --btn-text: #e9edff;
  --shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

h4 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: 0.2px;
}

.top {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 10px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, var(--bg) 0%, rgba(0, 0, 0, 0) 100%);
  padding: 8px 0 10px;
  backdrop-filter: blur(8px);
}

.top-left {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
}

.custom-select {
  position: relative;
  font-size: 13px;
  font-weight: 500;
  min-width: 280px;
  max-width: 400px;
  user-select: none;
}

.select-trigger {
  padding: 8px 16px;
  background: color-mix(in srgb, var(--surface) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 12px;
  color: var(--text);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.select-trigger::after {
  content: '▼';
  font-size: 10px;
  margin-left: 10px;
  color: var(--muted);
  transition: transform 0.2s ease;
}

.custom-select.open .select-trigger {
  border-color: var(--accent);
  box-shadow: 0 0 14px rgba(91, 107, 255, 0.25);
}

.custom-select.open .select-trigger::after {
  transform: rotate(180deg);
}

.select-options {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  min-width: 100%;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 300px;
  overflow-y: auto;
}

.custom-select.open .select-options {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.select-option {
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
  color: var(--muted);
}

.select-option:hover {
  background: var(--row-hover);
  color: var(--text);
}

.select-option.selected {
  background: linear-gradient(135deg, rgba(91, 107, 255, 0.2), rgba(139, 92, 246, 0.2));
  color: var(--accent);
  font-weight: bold;
}

button {
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background:
    linear-gradient(var(--btn-bg), var(--btn-bg)) padding-box,
    linear-gradient(135deg, rgba(91, 107, 255, 0.6), rgba(139, 92, 246, 0.6)) border-box;
  color: var(--btn-text);
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  filter: brightness(1.05);
}

button:disabled,
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.2);
  transform: none;
  box-shadow: none;
}

button.active {
  background:
    linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%) padding-box,
    linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.05)) border-box;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 10px 24px rgba(91, 107, 255, 0.35);
}

.grid {
  display: grid;
  grid-template-columns: 32px 64px 1fr 56px 90px;
  gap: 6px;
  align-items: center;
  font-size: 11.25px;
}

.tombol button {
  font-weight: 600;
}

.tombol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}

.header {
  color: var(--muted);
  font-weight: 900;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
}

.row {
  padding: 6px 0;
  border-bottom: 1px solid var(--row-border);
}

.row:hover {
  background: var(--row-hover);
}

.row:nth-child(odd) {
  background: var(--row-alt);
}

.num,
.center {
  text-align: center;
}

.nickname {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  padding: 10px;
  color: var(--muted);
  font-size: 12px;
}

.residual-note {
  padding-left: 48px;
}

#tableContainer,
#chartContainer,
#chartAvgContainer,
#chartAvgDamageContainer,
#chartTopDrawerContainer,
#chartBossContainer {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  box-shadow: var(--shadow);
}

#tableContainer,
#chartContainer,
#chartAvgContainer,
#chartAvgDamageContainer,
#chartTopDrawerContainer,
#chartBossContainer {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  box-shadow: var(--shadow);
  transition: background 260ms ease, border-color 260ms ease, box-shadow 260ms ease;
}

.summary-download {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  margin: 0;
  display: flex;
  justify-content: flex-end;
}

.summary-download button {
  font-weight: 600;
  color: #5b6bff;
}

body.theme-dark .summary-download button {
  color: #f25555;
}

.chart-download {
  margin: 10px 0 18px;
  display: flex;
  justify-content: center;
}

.chart-block {
  position: relative;
  margin-bottom: 8px;
  padding-top: 28px;
  padding-bottom: 6px;
}

.chart-download--top {
  position: absolute;
  top: 4px;
  right: 8px;
  z-index: 2;
  margin: 0;
  justify-content: flex-end;
  padding-bottom: 0;
}

.chart-download button {
  font-weight: 600;
  color: #5b6bff;
}

body.theme-dark .chart-download button {
  color: #f25555;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 10px;
  padding-right: 12px;
}

.icon-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
  flex: 0 0 auto;
}

#siteSettings::before {
  content: "⚙️ ";
}

body.theme-dark #chartAvgDummy svg line,
body.theme-dark #chartAvgDummy svg circle,
body.theme-dark #chartAvgDummy .apexcharts-radar-series path,
body.theme-dark #chartAvgDummy .apexcharts-gridline {
  stroke: #1a2231 !important;
  stroke-opacity: 0.85 !important;
}

body.theme-dark #chartAvgDummy .apexcharts-grid {
  stroke: #1a2231 !important;
}

.row-top,
.row-bottom {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.segmented-control {
  display: flex;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.04);
}

body.theme-dark .segmented-control {
  background: rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);
}

.segmented-btn {
  flex: 1;
  background: transparent !important;
  color: var(--muted) !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-weight: 600 !important;
  font-size: 11.5px !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.segmented-btn:hover {
  color: var(--text) !important;
  background: var(--row-hover) !important;
  transform: none !important;
  filter: none !important;
}

.segmented-btn.active {
  background: var(--surface) !important;
  color: var(--text) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
  border: 1px solid var(--border) !important;
}

body.theme-dark .segmented-btn.active {
  background: rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  border-color: rgba(255,255,255,0.15) !important;
  color: #fff !important;
}

.dropdown {
  position: relative;
  display: inline-flex;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 160px;
  padding: 6px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: none;
  flex-direction: column;
  gap: 6px;
  z-index: 20;
}

.dropdown.open .dropdown-menu {
  display: flex;
}

.dropdown-menu button {
  width: 100%;
  text-align: left;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  gap: 20px;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.loading-overlay.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: sr-spin 1s linear infinite;
}

.loading-text {
  font-size: 18px;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: 1px;
  text-transform: uppercase;
}

@keyframes sr-spin {
  to { transform: rotate(360deg); }
}

.toast-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10000;
  pointer-events: none;
}

.toast {
  background: var(--surface);
  color: var(--text);
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  font-size: 14px;
  font-weight: 600;
  pointer-events: auto;
  animation: toast-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  max-width: 300px;
  text-align: center;
}

@keyframes toast-in {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
`;

const POPUP_HTML = `
  <div id="toastContainer" class="toast-container"></div>
  <div id="loadingOverlay" class="loading-overlay">
    <div class="loading-spinner"></div>
    <div id="loadingText" class="loading-text">Initializing...</div>
  </div>
  <div class="top">
    <div class="top-left">
      <h4 id="unionName" style="font-weight: 900;">Initializing...</h4>
      <div class="custom-select" id="customSeasonSelect">
        <div class="select-trigger" id="seasonSelectTrigger">Loading seasons...</div>
        <div class="select-options" id="seasonSelectOptions"></div>
      </div>
      <select id="seasonSelect" style="display: none;"></select>
    </div>
    <div class="tombol">
      <div class="row-top">
        <button id="btnTable" class="active">📝Records</button>
        <button id="btnChart">⚔️ Summary</button>
        <button id="btnChartBoss">⚔️ Breakdown</button>
        <button id="btnAvgSynchro">🧠 Avg Synchro</button>
        <button id="btnAvgDamage">📈 Avg Damage</button>
        <button id="btnTopDrawer">✨ Residual</button>
      </div>

      <div class="row-bottom">
        <button id="btnLimitBreaks">Limit breaks</button>
        <button id="themeToggle">Theme: Light</button>
        <button id="siteSettings">DisabledBackground</button>
        <div class="dropdown" id="exportDropdown">
          <button id="exportJson" class="dropdown-toggle">📦 Export</button>
          <div class="dropdown-menu" id="exportMenu">
            <button id="exportCsv">Export to CSV</button>
            <button id="exportJsonBtn">Export to JSON</button>
          </div>
        </div>
        <button id="clearData">🗑️ Clear Data</button>
      </div>
    </div>
  </div>

  <div id="tableContainer">
    <div class="grid header">
      <div class="num" data-key="index">#</div>
      <div class="center" data-key="synchroLevel">Synchro</div>
      <div data-key="name">Nickname</div>
      <div class="num" data-key="count">Attempt</div>
      <div class="num" data-key="damage">Damage</div>
    </div>
    <div id="list"></div>
  </div>

  <div id="chartLimitBreaksContainer" style="display:none; padding: 0 4px; flex-direction: column; max-height: 500px;">
    <div class="segmented-control" style="margin-bottom: 12px; flex-shrink: 0;">
      <button id="btnLimitBreaksHtml" class="segmented-btn active">HTML View</button>
      <button id="btnLimitBreaksCp" class="segmented-btn">Combat power</button>
    </div>
    <input type="text" id="limitBreaksSearch" placeholder="Search by nickname..." style="margin-bottom: 12px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); outline: none; width: 100%; font-size: 13px; flex-shrink: 0;">
    <div id="limitBreaksJsonOutput" class="hide-scrollbar" style="overflow-y: auto; flex-grow: 1;"></div>
    <div id="limitBreaksCpChartOutput" style="display: none; width: 100%;"></div>
  </div>

  <div id="chartContainer" style="display:none;">
    <div class="summary-download">
      <button id="exportSummaryPng" class="icon-btn">
        <span>💾 Summary</span>
      </button>
    </div>
    <div id="chartDummy"></div>
  </div>

  <div id="chartBossContainer" style="display:none;">
    <div id="chartBossDummy"></div>
  </div>

  <div id="chartAvgContainer" style="display:none;">
    <div id="chartAvgDummy"></div>
  </div>

  <div id="chartAvgDamageContainer" style="display:none;">
    <div id="chartAvgDamageDummy"></div>
  </div>

  <div id="chartTopDrawerContainer" style="display:none;">
    <div class="segmented-control">
      <button id="btnResidualTop" class="segmented-btn active">Above Expectations</button>
      <button id="btnResidualLow" class="segmented-btn">Below Expectations</button>
    </div>
    <div class="chart-block">
      <div id="chartTopDrawerDummy"></div>
    </div>
    <div class="empty residual-note">
      <h4>Efficiency-check</h4>
      <p>This workflows identifies the most \"efficient\" player based on how far their actual damage exceeds an expected damage line derived from the data.</p>
      <h4>Why</h4>
      <p>
      Synchro is a proxy for power. Higher synchro normally means higher damage. The linear fit captures the <strong>average</strong> damage at each synchro level.
      Residuals measure <strong>who beats the average the most</strong>, which is the intended definition of efficiency. <a href="https://github.com/ScathachGrip/shiftypad-extension/tree/master/tests#efficiency-check" target="_blank" rel="noreferrer noopener">Read more</a>
      </p>
    </div>
  </div>
`;

function mountPopupShell(): void {
  const styleEl = document.createElement("style");
  styleEl.textContent = POPUP_STYLE;
  document.head.appendChild(styleEl);

  document.body.innerHTML = POPUP_HTML;
}

mountPopupShell();
initPopup();
