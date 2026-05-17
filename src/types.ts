type MemberRow = {
  name: string;
  count: string;
  damage: string;
  synchroLevel?: number;
};

type SynchroRow = {
  name: string;
  synchroLevel: number;
};

type RaidDamageRow = {
  boss: string;
  difficulty: string;
  level: number;
  damage: number;
};

type PlayerRaidResult = {
  player: string;
  synchro: number;
  total_attempt: number;
  total_damage: number;
  total_damage_text: string;
  rows: RaidDamageRow[];
};

interface BossRow {
  boss: string;
  damage: number;
  difficulty: string;
  level: number;
}

interface PlayerData {
  player: string;
  rows: BossRow[];
}

type BossData = {
  boss: string;
  players: { player: string; damage: number; synchro: number }[];
};

type ApexChartOptions = Record<string, unknown>;

type ApexChartDataUri = {
  imgURI?: string;
  blobURI?: string;
};

type ApexChartInstance = {
  render: () => Promise<void> | void;
  destroy: () => Promise<void> | void;
  updateOptions?: (options: ApexChartOptions, redraw?: boolean, animate?: boolean) => void;
  updateSeries?: (series: unknown, animate?: boolean) => void;
  dataURI: () => Promise<ApexChartDataUri>;
};

type ApexChartsConstructor = new (el: Element | null, options: ApexChartOptions) => ApexChartInstance;

type SummaryOptionsParams = {
  rows: MemberRow[];
  unionName: string;
  titleText: string;
  width: number;
  height: number;
};

type BossOptionsParams = {
  bossData: BossData;
  width: number;
  height: number;
};

type PopupState = {
  list: HTMLElement;
  title: HTMLElement;
  tableContainer: HTMLElement;
  chartContainer: HTMLElement;
  chartBossContainer: HTMLElement;
  chartAvgContainer: HTMLElement;
  chartAvgDamageContainer: HTMLElement;
  chartTopDrawerContainer: HTMLElement;
  btnTable: HTMLElement;
  btnChart: HTMLElement;
  btnChartBoss: HTMLElement;
  btnAvgSynchro: HTMLElement;
  btnAvgDamage: HTMLElement;
  btnTopDrawer: HTMLElement;
  btnResidualTop: HTMLElement;
  btnResidualLow: HTMLElement;
  scrapeBtn: HTMLButtonElement | null;
  output: HTMLElement | null;
  btnSiteSettings: HTMLElement;
  btnExport: HTMLElement;
  btnExportCsv: HTMLButtonElement;
  btnExportJson: HTMLButtonElement;
  exportDropdown: HTMLElement;
  exportMenu: HTMLElement;
  btnClearData: HTMLElement;
  btnThemeToggle: HTMLElement;
  btnExportSummaryPng: HTMLElement;
  seasonSelect: HTMLSelectElement;
  customSeasonSelect: HTMLElement;
  seasonSelectTrigger: HTMLElement;
  seasonSelectOptions: HTMLElement;
  rows: MemberRow[];
  sortKey: keyof MemberRow | "index";
  sortDir: "asc" | "desc";
  apexChart: ApexChartInstance | null;
  apexChartBoss: ApexChartInstance | null;
  apexChartAvg: ApexChartInstance | null;
  apexChartAvgDamage: ApexChartInstance | null;
  apexChartTopDrawer: ApexChartInstance | null;
  unionName: string;
  activeSeasonKey: string;
  activeSeasonText: string;
  loadingOverlay: HTMLElement;
  loadingText: HTMLElement;
};

type ChromeMessage =
  | { type: "GET_MEMBERS"; seasonKey?: string }
  | { type: "GET_ACTIVE_SEASON" }
  | { type: "ALL_UNION_RAID_DAMAGE_DATA_REQUEST"; seasonKey?: string }
  | { type: "TOGGLE_BG"; value: boolean }
  | { type: "CLEAR_CACHE" };

type GetMembersResponse = {
  data?: MemberRow[] | PlayerRaidResult[];
  union?: string;
  unionId?: string;
  seasonKey?: string;
  seasonText?: string;
};

type CacheEntry = {
  data: MemberRow[] | PlayerRaidResult[];
  union: string;
  timestamp: number;
};

export type {
  MemberRow,
  SynchroRow,
  RaidDamageRow,
  PlayerRaidResult,
  BossRow,
  PlayerData,
  BossData,
  ApexChartOptions,
  ApexChartInstance,
  ApexChartsConstructor,
  SummaryOptionsParams,
  BossOptionsParams,
  PopupState,
  ChromeMessage,
  GetMembersResponse,
  CacheEntry,
};
