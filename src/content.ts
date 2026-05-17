import { CacheEntry, ChromeMessage, GetMembersResponse, MemberRow, PlayerRaidResult } from "./types";
import {
  isUnionRaidPage,
  scrapeUnionName,
  scrapeUnionId,
  scrapeUnionAvatar as _scrapeUnionAvatar,
  scrapeUnionRaidAllModals,
  getCacheKey,
  getSeasonedCacheKey,
  getCurrentSeasonText,
  seasonTextToKey,
} from "./utils/modifier";
import { installLogForwarder } from "./utils/logForwarder";

installLogForwarder("Content");


/**
 * Class that handles Union Raid scraping, caching, and UI injection.
 */
class UnionRaidScraper {
  private cached: MemberRow[] | null = null;
  private isScrapingInProgress = false;
  private isStopRequested = false;
  private hardClicked = false;
  private lastClickedText = "";
  private readonly STYLE_ID = "disable-bg-images";
  private scrapeBtnEl: HTMLButtonElement | null = null;
  private scrapeIconEl: HTMLImageElement | null = null;
  private scrapeBlockerEl: HTMLDivElement | null = null;
  private selectedSeasonText = "";
  private selectedSeasonKey = "";
  private manualSeasonLocked = false;
  private seasonObserver: MutationObserver | null = null;

  private getSeasonSelectionStorageKey(): string {
    return `SEASON_SELECTION_${getCacheKey()}`;
  }

  private hydrateSelectedSeason(): void {
    const key = this.getSeasonSelectionStorageKey();
    chrome.storage.local.get(key, (res) => {
      const raw = res[key];
      if (typeof raw === "string") {
        if (/\[S\d+\]/i.test(raw)) {
          this.setSelectedSeason(raw, seasonTextToKey(raw), true, false);
        }
        return;
      }
      if (raw && typeof raw === "object") {
        const record = raw as { text?: string; key?: string };
        const val = String(record.text ?? "");
        const seasonKey = String(record.key ?? seasonTextToKey(val));
        if (/\[S\d+\]/i.test(val) && seasonKey) {
          // Locked status is NOT hydrated from storage to ensure we default to live DOM on reload
          this.setSelectedSeason(val, seasonKey, false, false);
        }
      }
    });
  }

  private setSelectedSeason(seasonText: string, seasonKey: string, locked: boolean, persist: boolean): void {
    this.selectedSeasonText = seasonText;
    this.selectedSeasonKey = seasonKey;
    this.manualSeasonLocked = locked;
    if (!persist) { return; }
    void chrome.storage.local.set({
      [this.getSeasonSelectionStorageKey()]: {
        text: seasonText,
        key: seasonKey,
        timestamp: Date.now()
      }
    });
  }

  private startDefaultSeasonListener(): void {
    const applyFromDom = (): void => {
      const seasonText = getCurrentSeasonText();
      const seasonKey = seasonTextToKey(seasonText);
      if (!seasonKey) { return; }
      if (this.manualSeasonLocked) { return; }
      this.setSelectedSeason(seasonText, seasonKey, false, true);
    };

    applyFromDom();
    // Run frequently for the first 5 seconds to catch lazy-loaded elements
    for (let i = 1; i <= 20; i++) {
      setTimeout(applyFromDom, i * 250);
    }

    if (this.seasonObserver) {
      this.seasonObserver.disconnect();
    }
    this.seasonObserver = new MutationObserver(() => applyFromDom());
    this.seasonObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Handle SPA navigation
    window.addEventListener("popstate", () => applyFromDom());
    window.addEventListener("hashchange", () => applyFromDom());
  }

  constructor() {
    if (window.__unionRaidInjected) { return; }
    window.__unionRaidInjected = true;

    this.initEventListeners();
    this.injectButtons();
    this.autoApplyBgSetting();
    this.hydrateSelectedSeason();
    this.startDefaultSeasonListener();
  }


  /**
   * Initialize DOM click listeners and Chrome runtime message listeners.
   * @private
   * @returns {void} Sets up event handlers.
   */
  private initEventListeners(): void {
    document.addEventListener("click", (e: MouseEvent) => this.handleDayClick(e));
    document.addEventListener("click", (e: MouseEvent) => this.trackHardClick(e), true);
    document.addEventListener("click", (e: MouseEvent) => this.trackSeasonClick(e), true);

    chrome.runtime.onMessage.addListener(
      (msg: ChromeMessage, _, sendResponse?: (res: GetMembersResponse | { ok: boolean; removed?: string[] }) => void) =>
        this.handleMessage(msg, sendResponse)
    );

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      const requestedSeasonKey = typeof msg?.seasonKey === "string" ? msg.seasonKey : undefined;
      const activeSeasonKey = requestedSeasonKey || this.selectedSeasonKey || seasonTextToKey(this.selectedSeasonText);
      if (!activeSeasonKey) {
        sendResponse({
          damageData: [],
          union: "",
          seasonKey: "",
          seasonText: ""
        });
        return true;
      }
      const activeCacheSuffix = `${getCacheKey()}__${activeSeasonKey}`;
      const cacheKey = `ALL_UNION_RAID_DAMAGE_DATA_${activeCacheSuffix}`;
      const cacheKey2 = `UNION_${activeCacheSuffix}`;

      if (msg.type === "ALL_UNION_RAID_DAMAGE_DATA_REQUEST") {
        chrome.storage.local.get([cacheKey, cacheKey2], (res) => {
          console.log("[Content] 🔹 Data from storage:", res);
          console.log("[Content] 🔹 Damage Data:", res[cacheKey]);
          sendResponse({
            damageData: res[cacheKey] || [],
            union: res[cacheKey2]?.union ?? "",
            seasonKey: activeSeasonKey,
            seasonText: res[cacheKey2]?.seasonText ?? this.selectedSeasonText ?? getCurrentSeasonText(),
          });
        });

        return true;
      }
    });
  }

  /**
   * Reset cached member data if a day element is clicked.
   * @param {MouseEvent} e - Click event
   * @private
   * @returns {void} Clears cached data to prevent stale scraping.
   */
  private handleDayClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target) { return; }

    const dayBg = target.closest("div[class*=\"days-bg.png\"]");
    if (dayBg) { this.cached = null; }
  }

  /**
   * Handles incoming runtime messages and routes by type.
   *
   * @private
   * @param {ChromeMessage} msg
   * @param {(res: GetMembersResponse) => void} [sendResponse]
   * @returns {boolean | void}
   */
  private handleMessage(
    msg: ChromeMessage,
    sendResponse?: (res: GetMembersResponse | { ok: boolean; removed?: string[] }) => void
  ): boolean | void {
    if ((msg as { type?: string }).type === "LOG_FORWARD") {
      return;
    }
    if (!msg || typeof (msg as { type?: unknown }).type !== "string") {
      return;
    }
    console.log("[Content] Message received:", msg);

    switch (msg.type) { // ✅ now TS knows type exists
      case "GET_ACTIVE_SEASON":
        if (!sendResponse) { return; }
        void (async () => {
          if (!this.manualSeasonLocked) {
            for (let i = 0; i < 10; i++) {
              const seasonTextFromDom = getCurrentSeasonText();
              const seasonKeyFromDom = seasonTextToKey(seasonTextFromDom);
              if (seasonKeyFromDom) {
                this.setSelectedSeason(seasonTextFromDom, seasonKeyFromDom, false, true);
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
          sendResponse({
            seasonKey: this.selectedSeasonKey || "",
            seasonText: this.selectedSeasonText || "",
            union: scrapeUnionName(),
            data: []
          });
        })();
        return true;

      case "GET_MEMBERS":
        if (!sendResponse) { return; }

        if (!isUnionRaidPage()) {
          console.warn("[Content] Not a union raid page, aborting GET_MEMBERS");
          sendResponse({ data: [], union: "" });
          return;
        }

        console.log("[Content] Processing GET_MEMBERS");
        void this.scrapeMembers(sendResponse, msg.seasonKey);
        return true; // async response

      case "TOGGLE_BG":
        console.log("[Content] Processing TOGGLE_BG:", msg.value);
        this.toggleBackground(msg.value);
        return;

      case "CLEAR_CACHE":
        console.log("[Content] Processing CLEAR_CACHE");
        this.clearCaches(sendResponse);
        return true;

      default:
        return;
    }
  }

  /**
   * Tracks click events and detects "HARD Day 2" selection.
   *
   * @private
   * @param {MouseEvent} e
   * @returns {void}
   */
  private trackHardClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target) { return; }
    if (target.closest("#scrape-btn")) { return; }
    const raw = target.textContent?.replace(/\s+/g, " ").trim() ?? "";
    // console.log(`[LastClick] ${raw ? `"${raw}"` : "(no text)"}`);
    this.lastClickedText = raw;
    const tab = target.closest("div.cursor-pointer");
    if (!tab) { return; }
    const text = tab.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const upper = text.toUpperCase();
    const hasHard = upper.includes("HARD");
    const hasDay2 = upper.includes("DAY 2") || upper.includes("DAY2");
    if (hasHard && hasDay2) {
      this.hardClicked = true;
      this.lastClickedText = "HARD Day 2";
      // console.log("HARD clicked");

      const audio = new Audio(chrome.runtime.getURL("assets/dor.mp3"));
      audio.volume = 1;
      audio.play().catch(() => { });
    }
    // console.log(`[LastClickState] ${this.isHardSelected() ? "TRUE" : "FALSE"}`);
  }

  /**
   * Checks whether "HARD Day 2" is currently selected.
   *
   * @private
   * @returns {boolean}
   */
  private isHardSelected(): boolean {
    const normalized = this.lastClickedText.replace(/\s+/g, " ").trim().toUpperCase();
    return normalized === "HARD DAY 2";
  }

  /**
   * Clears cached data from localStorage and chrome.storage.local.
   *
   * @private
   * @param {(res: { ok: boolean; removed?: string[] }) => void} [sendResponse]
   * @returns {void}
   */
  private clearCaches(sendResponse?: (res: { ok: boolean; removed?: string[] }) => void): void {
    const prefixes = ["ALL_UNION_RAID_DAMAGE_DATA_", "UNION_"];

    // localStorage (page context)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && prefixes.some(p => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    }

    // chrome.storage.local
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(k =>
        prefixes.some(p => k.startsWith(p))
      );

      if (keysToRemove.length === 0) {
        console.log("[Content] No chrome cache keys found to remove");
        sendResponse?.({ ok: true, removed: [] });
        return;
      }

      chrome.storage.local.remove(keysToRemove, () => {
        console.log("[Content] ✅ Cleared chrome cache keys:", keysToRemove);
        sendResponse?.({ ok: true, removed: keysToRemove });
      });
    });
  }

  /**
   * Retrieves union raid member data from cache and responds.
   *
   * @private
   * @param {(res: GetMembersResponse) => void} sendResponse
   * @returns {Promise<void>}
   */
  private async scrapeMembers(sendResponse: (res: GetMembersResponse) => void, requestedSeasonKey?: string): Promise<void> {
    console.log("[UnionRaid] scrapeMembers called");

    const domSeasonKey = seasonTextToKey(getCurrentSeasonText());
    const fallbackSeasonKey = this.selectedSeasonKey || seasonTextToKey(this.selectedSeasonText);
    const targetSeasonKey = requestedSeasonKey ?? domSeasonKey ?? fallbackSeasonKey;
    const seasonedKey = getSeasonedCacheKey(targetSeasonKey);

    console.log("[UnionRaid] scrapeMembers details:", {
      requested: requestedSeasonKey,
      dom: domSeasonKey,
      fallback: fallbackSeasonKey,
      final: targetSeasonKey,
      cacheSuffix: seasonedKey
    });

    if (!targetSeasonKey || !seasonedKey) {
      sendResponse({
        data: [],
        union: scrapeUnionName(),
        seasonKey: "",
        seasonText: ""
      });
      return;
    }
    const damageKey = `ALL_UNION_RAID_DAMAGE_DATA_${seasonedKey}`;
    const unionKey = `UNION_${seasonedKey}`;

    chrome.storage.local.get([damageKey, unionKey], (res) => {
      const cached =
        (res[damageKey] as PlayerRaidResult[] | undefined) ??
        (res[unionKey] as CacheEntry | PlayerRaidResult[] | undefined);
      const activeUnionRes = res[unionKey] as { union?: string; seasonText?: string } | undefined;

      const cachedIsArray = Array.isArray(cached);
      const cachedData = cachedIsArray ? (cached as PlayerRaidResult[] | MemberRow[]) : (cached as CacheEntry)?.data ?? [];
      const cachedUnion = !cachedIsArray ? (cached as CacheEntry)?.union : activeUnionRes?.union;

      if (cached) {
        console.log("[UnionRaid] ✅ Using cached members", { season: targetSeasonKey });
      } else {
        console.log("[UnionRaid] No cache found, returning empty data");
      }

      // Use cached data if present, but always fallback to live union name in DOM
      sendResponse({
        data: cachedData,
        union: cachedUnion ?? scrapeUnionName(),
        unionId: scrapeUnionId(),
        seasonKey: targetSeasonKey,
        seasonText: activeUnionRes?.seasonText ?? this.selectedSeasonText ?? getCurrentSeasonText(),
      });
    });
  }

  private trackSeasonClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target) { return; }
    const normalize = (val: string): string => val.replace(/\s+/g, " ").trim();
    const matchSeason = (val: string): string => {
      const m = val.match(/\[S\d+\]\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\d{1,2}:\d{2}/i);
      return m?.[0]?.trim() ?? "";
    };

    let seasonText = matchSeason(normalize(target.textContent ?? ""));
    if (!seasonText) {
      const anchor = target.closest("a");
      if (anchor) {
        const parent = anchor.parentElement;
        const siblingSpan = Array.from(parent?.children ?? []).find(
          (el) => el.tagName === "SPAN"
        ) as HTMLSpanElement | undefined;
        seasonText = matchSeason(normalize(siblingSpan?.textContent ?? ""));
      }
    }
    if (!seasonText) {
      const row = target.closest("div.flex.items-center.cursor-pointer");
      const directSeasonSpan = Array.from(row?.children ?? []).find(
        (el) => el.tagName === "SPAN" && /\[S\d+\]/i.test(el.textContent ?? "")
      ) as HTMLSpanElement | undefined;
      seasonText = matchSeason(normalize(directSeasonSpan?.textContent ?? ""));
    }
    if (!seasonText) { return; }
    const seasonKey = seasonTextToKey(seasonText);
    if (!seasonKey) { return; }
    this.setSelectedSeason(seasonText, seasonKey, true, true);
    console.log("[Content] Season clicked:", seasonText);
  }

  private async resolveSeasonTextForCurrentOpenid(): Promise<string> {
    // Source of truth for default load: season currently shown on website.
    const fromDom = getCurrentSeasonText();
    const fromDomKey = seasonTextToKey(fromDom);
    if (/\[S\d+\]/i.test(fromDom) && fromDomKey) {
      this.selectedSeasonText = fromDom;
      this.selectedSeasonKey = fromDomKey;
      void chrome.storage.local.set({
        [this.getSeasonSelectionStorageKey()]: {
          text: fromDom,
          key: fromDomKey,
          timestamp: Date.now()
        }
      });
      return fromDom;
    }

    // No storage fallback for default season resolution.
    // If DOM is not ready/invalid, caller should retry or show empty state.
    return "";
  }


  /**
   * Start scraping all union raid modals.
   * @public
   * @returns {void} Clears console, resets stop flag, and initiates scraping utility.
   */
  public async startScraping(): Promise<void> {
    if (!isUnionRaidPage()) {
      alert("This only works on your /shiftyspad/union-raid/ path.");
      return;
    }

    if (!this.isHardSelected()) {
      alert("Please click the HARD tab for Day 2 first, then try again.");
      return;
    }

    const proceed = confirm(
      "Please make sure you have clicked the 'DAY 2 (Hard-mode)' table buttons twice.\n" +
      "Only after doing this, press OK to proceed or Cancel to abort."
    );

    if (!proceed) {
      console.log("[Scraping] Canceled by user.");
      return; // stop execution if user cancels
    }

    console.clear();
    this.isStopRequested = false;
    this.isScrapingInProgress = true;
    this.setScrapeButtonState("busy");
    this.showScrapeBlocker();
    
    let liveSeasonText = getCurrentSeasonText();
    let liveSeasonKey = seasonTextToKey(liveSeasonText);
    
    // Last resort: if still empty and not locked, try to wait a tiny bit
    if (!liveSeasonKey && !this.manualSeasonLocked) {
      console.log("[Scraping] Season missing, waiting for DOM...");
      await new Promise(r => setTimeout(r, 1000));
      liveSeasonText = getCurrentSeasonText();
      liveSeasonKey = seasonTextToKey(liveSeasonText);
    }

    // Preference: 
    // 1. Manually clicked/locked season
    // 2. DOM season
    // 3. Fallback to hydrated/selected season
    const targetSeasonKey = this.manualSeasonLocked ? this.selectedSeasonKey : (liveSeasonKey || this.selectedSeasonKey);
    const targetSeasonText = this.manualSeasonLocked ? this.selectedSeasonText : (liveSeasonText || this.selectedSeasonText);

    if (!targetSeasonKey) {
      console.error("[Scraping] Could not detect season key. Aborting.");
      alert("Error: Could not detect the current Union Raid season from the page.\n\nPlease try clicking the season name on the page first, or refresh the page.");
      this.isScrapingInProgress = false;
      this.setScrapeButtonState("idle");
      this.hideScrapeBlocker();
      return;
    }

    console.log("🟢 SCRAPE START", { 
      targetKey: targetSeasonKey, 
      targetText: targetSeasonText, 
      liveKey: liveSeasonKey,
      locked: this.manualSeasonLocked 
    });

    try {
      await scrapeUnionRaidAllModals(false, this.isStopRequested, targetSeasonKey, targetSeasonText);
    } finally {
      this.isScrapingInProgress = false;
      this.setScrapeButtonState("idle");
      this.hideScrapeBlocker();
    }
  }

  /**
   * Request scraping to stop.
   * @public
   * @returns {void} Sets stop flag and logs stop request.
   */
  public stopScraping(): void {
    this.isStopRequested = true;
    console.warn("🛑 STOP REQUESTED");
  }

  /**
   * Inject SCRAPE and STOP buttons into the page.
   * @private
   * @returns {void} Adds buttons to the DOM for manual control.
   */
  private injectButtons(): void {
    if (!document.body) {
      setTimeout(() => this.injectButtons(), 50);
      return;
    }

    if (document.getElementById("scrape-btn")) { return; }

    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 999999;
      display: flex;
    `;

    const scrapeBtn = document.createElement("button");
    scrapeBtn.id = "scrape-btn";
    const iconUrl = chrome.runtime.getURL("icons/icon128.png");
    scrapeBtn.style.cssText = `
      width: 64px;
      height: 64px;
      padding: 0;
      background: transparent;
      border: none;
      cursor: pointer;
    `;
    const iconImg = document.createElement("img");
    iconImg.src = iconUrl;
    iconImg.alt = "SCRAPE";
    iconImg.width = 64;
    iconImg.height = 64;
    iconImg.style.borderRadius = "20%";
    iconImg.style.background = "#fff";
    iconImg.style.padding = "6px";
    iconImg.style.boxShadow = "0 8px 18px rgba(0,0,0,0.25)";
    iconImg.classList.add("sr-idle");
    scrapeBtn.appendChild(iconImg);
    scrapeBtn.onclick = () => this.startScraping();

    this.scrapeBtnEl = scrapeBtn;
    this.scrapeIconEl = iconImg;
    this.injectScrapeButtonStyle();

    wrap.append(scrapeBtn);
    document.body.appendChild(wrap);

    console.log("✅ BUTTONS INJECTED");
  }

  /**
   * Injects CSS styles for the scrape button animations.
   *
   * @private
   * @returns {void}
   */
  private injectScrapeButtonStyle(): void {
    if (document.getElementById("scrape-btn-style")) { return; }
    const style = document.createElement("style");
    style.id = "scrape-btn-style";
    style.textContent = `
      @keyframes sr-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes sr-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      #scrape-btn .sr-idle { animation: sr-bounce 1.4s ease-in-out infinite; }
      #scrape-btn .sr-busy { animation: sr-spin 0.9s linear infinite; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * Sets the scrape button animation state.
   *
   * @private
   * @param {"idle" | "busy"} state
   * @returns {void}
   */
  private setScrapeButtonState(state: "idle" | "busy"): void {
    if (!this.scrapeIconEl) { return; }
    this.scrapeIconEl.classList.toggle("sr-idle", state === "idle");
    this.scrapeIconEl.classList.toggle("sr-busy", state === "busy");
  }

  /**
   * Shows the scrape blocker overlay.
   *
   * @private
   * @returns {void}
   */

  private showScrapeBlocker(): void {
    if (this.scrapeBlockerEl) { return; }
    const blocker = document.createElement("div");
    blocker.id = "scrape-blocker";
    blocker.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999998;
      background: transparent;
      cursor: not-allowed;
    `;
    this.scrapeBlockerEl = blocker;
    document.body.appendChild(blocker);
  }

  /**
   * Hides the scrape blocker overlay.
   *
   * @private
   * @returns {void}
   */
  private hideScrapeBlocker(): void {
    if (!this.scrapeBlockerEl) { return; }
    this.scrapeBlockerEl.remove();
    this.scrapeBlockerEl = null;
  }

  /**
   * Enable or disable all background images on the page.
   * @param {boolean} disable - True to disable backgrounds, false to enable
   * @private
   * @returns {void} Injects or removes style element that blocks background images.
   */
  private toggleBackground(disable: boolean): void {
    if (disable) {
      if (!document.getElementById(this.STYLE_ID)) {
        const style = document.createElement("style");
        style.id = this.STYLE_ID;
        style.textContent = "* { background-image: none !important; }";
        document.documentElement.appendChild(style);
        console.log("[Content] Background images disabled");
      }
    } else {
      const style = document.getElementById(this.STYLE_ID);
      style?.remove();
      console.log("[Content] Background images enabled");
    }
  }

  /**
   * Automatically apply background image setting on page load.
   * @private
   * @returns {void} Checks Chrome storage and disables backgrounds if previously enabled.
   */
  private autoApplyBgSetting(): void {
    chrome.storage.local.get("disableBgImages", (res: { disableBgImages?: boolean }) => {
      if (res.disableBgImages) { this.toggleBackground(true); }
    });
  }

}

// Instantiate the scraper
new UnionRaidScraper();


