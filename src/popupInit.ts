import { ApexChartInstance, MemberRow } from "./types";
import { setupSorting, setupToggleButtons } from "./popup/popupUi";
import {
  setupScrapeButton,
  setupSiteSettings,
  setupExportButton,
  setupClearDataButton,
  setupThemeToggle,
  setupSummaryPngExport
} from "./popup/popupActions";
import { checkInitialCacheAndToggleButtons, loadMembers } from "./popup/popupData";

/**
 * Popup manager for Union Raid extension.
 * Handles table rendering, chart rendering, sorting, scraping, caching, and UI interactions.
 */
class UnionRaidPopup {
  public list: HTMLElement;
  public title: HTMLElement;
  public tableContainer: HTMLElement;
  public chartContainer: HTMLElement;
  public chartBossContainer: HTMLElement;
  public chartAvgContainer: HTMLElement;
  public chartAvgDamageContainer: HTMLElement;
  public chartTopDrawerContainer: HTMLElement;
  public btnTable: HTMLElement;
  public btnChart: HTMLElement;
  public btnChartBoss: HTMLElement;
  public btnAvgSynchro: HTMLElement;
  public btnAvgDamage: HTMLElement;
  public btnTopDrawer: HTMLElement;
  public btnResidualTop: HTMLElement;
  public btnResidualLow: HTMLElement;
  public btnLimitBreaks: HTMLElement;
  public chartLimitBreaksContainer: HTMLElement;
  public limitBreaksJsonOutput: HTMLElement;
  public limitBreaksRawJsonOutput: HTMLElement;
  public limitBreaksSearch: HTMLInputElement;
  public scrapeBtn: HTMLButtonElement | null;
  public output: HTMLElement | null;
  public btnSiteSettings: HTMLElement;
  public btnExport: HTMLElement;
  public btnExportCsv: HTMLButtonElement;
  public btnExportJson: HTMLButtonElement;
  public exportDropdown: HTMLElement;
  public exportMenu: HTMLElement;
  public btnClearData: HTMLElement;
  public btnThemeToggle: HTMLElement;
  public btnExportSummaryPng: HTMLElement;
  public seasonSelect: HTMLSelectElement;
  public customSeasonSelect!: HTMLElement;
  public seasonSelectTrigger!: HTMLElement;
  public seasonSelectOptions!: HTMLElement;

  public rows: MemberRow[] = [];
  public sortKey: keyof MemberRow | "index" = "damage";
  public sortDir: "asc" | "desc" = "desc";
  public apexChart: ApexChartInstance | null = null;
  public apexChartBoss: ApexChartInstance | null = null;
  public apexChartAvg: ApexChartInstance | null = null;
  public apexChartAvgDamage: ApexChartInstance | null = null;
  public apexChartTopDrawer: ApexChartInstance | null = null;
  public unionName: string = "";
  public activeSeasonKey: string = "";
  public activeSeasonText: string = "";
  public loadingOverlay!: HTMLElement;
  public loadingText!: HTMLElement;

  constructor() {
    const getEl = (id: string): HTMLElement => {
      const el = document.getElementById(id);
      if (!el) {throw new Error(`Element with id "${id}" not found`);}
      return el;
    };

    this.list = getEl("list");
    this.title = getEl("unionName");
    this.tableContainer = getEl("tableContainer");
    this.chartContainer = getEl("chartContainer");
    this.chartBossContainer = getEl("chartBossContainer");
    this.chartAvgContainer = getEl("chartAvgContainer");
    this.chartAvgDamageContainer = getEl("chartAvgDamageContainer");
    this.chartTopDrawerContainer = getEl("chartTopDrawerContainer");
    this.btnTable = getEl("btnTable");
    this.btnChart = getEl("btnChart");
    this.btnChartBoss = getEl("btnChartBoss");
    this.btnAvgSynchro = getEl("btnAvgSynchro");
    this.btnAvgDamage = getEl("btnAvgDamage");
    this.btnTopDrawer = getEl("btnTopDrawer");
    this.btnResidualTop = getEl("btnResidualTop");
    this.btnResidualLow = getEl("btnResidualLow");
    this.btnLimitBreaks = getEl("btnLimitBreaks");
    this.chartLimitBreaksContainer = getEl("chartLimitBreaksContainer");
    this.limitBreaksJsonOutput = getEl("limitBreaksJsonOutput");
    this.limitBreaksRawJsonOutput = getEl("limitBreaksRawJsonOutput");
    this.limitBreaksSearch = getEl("limitBreaksSearch") as HTMLInputElement;
    this.scrapeBtn = document.getElementById("scrapeBtn") as HTMLButtonElement | null;
    this.output = document.getElementById("output");
    this.btnSiteSettings = getEl("siteSettings");
    this.btnExport = getEl("exportJson");
    this.btnExportCsv = getEl("exportCsv") as HTMLButtonElement;
    this.btnExportJson = getEl("exportJsonBtn") as HTMLButtonElement;
    this.exportDropdown = getEl("exportDropdown");
    this.exportMenu = getEl("exportMenu");
    this.btnClearData = getEl("clearData");
    this.btnThemeToggle = getEl("themeToggle");
    this.btnExportSummaryPng = getEl("exportSummaryPng");
    this.seasonSelect = getEl("seasonSelect") as HTMLSelectElement;
    this.customSeasonSelect = getEl("customSeasonSelect");
    this.seasonSelectTrigger = getEl("seasonSelectTrigger");
    this.seasonSelectOptions = getEl("seasonSelectOptions");
    this.loadingOverlay = getEl("loadingOverlay");
    this.loadingText = getEl("loadingText");

    this.init();
  }

  private init(): void {
    setupSorting(this);
    setupToggleButtons(this);
    setupScrapeButton(this);
    setupSiteSettings(this);
    setupExportButton(this);
    setupClearDataButton(this);
    setupThemeToggle(this);
    setupSummaryPngExport(this);
    checkInitialCacheAndToggleButtons(this);
    loadMembers(this);
  }
}

export function initPopup(): void {
  new UnionRaidPopup();
}

