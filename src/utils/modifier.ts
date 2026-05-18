import { MemberRow, SynchroRow, RaidDamageRow, PlayerRaidResult } from "../types";

/**
 * Get the elemental weakness of a given boss based on its name.
 *
 * @param {string} bossName - The name of the boss to check.
 * @returns {string} The elemental weakness of the boss. Returns "Unknown weakness" if no match is found or if the input is empty.
 */
function getBossWeakness(bossName: string): string {
  if (!bossName) {return "Unknown weakness";}

  const name = bossName.toUpperCase();

  if (/H\.S\.T\.A\.?/.test(name)) {return "Water weakness";}
  if (/A\.N\.M\.I\.?/.test(name)) {return "Fire weakness";}
  if (/D\.M\.T\.R\.?/.test(name)) {return "Wind weakness";}
  if (/P\.S\.I\.D\.?/.test(name)) {return "Electric weakness";}
  if (/Z\.E\.U\.S\.?/.test(name)) {return "Iron weakness";}

  return "Unknown weakness";
}

/**
 * Check if the current page is a Union Raid page.
 *
 * @returns {boolean} `true` if the current page URL matches a Union Raid page, otherwise `false`.
 */
function isUnionRaidPage(): boolean {
  return /union-raid/i.test(location.pathname);
}


/**
 * Wait for a DOM element matching the given selector to appear within a timeout.
 *
 * @template T - Type of the element expected (must extend `Element`).
 * @param {string} selector - The CSS selector of the element to wait for.
 * @param {number} [timeout=5000] - Maximum time to wait in milliseconds before giving up.
 * @returns {Promise<T | null>} A promise that resolves to the element if found, or `null` if the timeout is reached.
 */
function waitForElement<T extends Element>(
  selector: string,
  timeout: number = 5000
): Promise<T | null> {
  return new Promise(resolve => {
    const found = document.querySelector<T>(selector);
    if (found) {return resolve(found);}

    const obs = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Attempt to open the Union Raid member dropdown by clicking its trigger element.
 *
 * @returns {Promise<boolean>} Resolves to `true` if the dropdown was successfully found and clicked, otherwise `false`.
 */
async function openMemberDropdown(): Promise<boolean> {
  const trigger = await waitForElement<HTMLDivElement>(
    "div.cursor-pointer span.mr-\\[8px\\]"
  );

  if (!trigger) {
    console.warn("[UnionRaid] Dropdown trigger not found (SPA)");
    return false;
  }

  trigger.click();
  return true;
}

/**
 * Scrape the Union Raid members table from the page and extract relevant data.
 *
 * @returns {MemberRow[]} Array of `MemberRow` objects containing scraped member data.
 */
function scrapeTable(): MemberRow[] {
  const rows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>("table tbody tr")
  );

  const synchroMap = new Map<string, number>();
  for (const s of scrapeSynchroLevels()) {
    synchroMap.set(s.name.toLowerCase(), s.synchroLevel);
  }

  const result = rows
    .map(row => {
      const cols = row.querySelectorAll<HTMLTableCellElement>("td");
      const name = cols[1]?.textContent?.trim() ?? "";

      return {
        name,
        count: cols[2]?.textContent?.trim() ?? "",
        damage: cols[3]?.querySelector("span")?.textContent?.trim() ?? "",
        synchroLevel: synchroMap.get(name.toLowerCase())
      };
    })
    .filter(r => r.name);
  console.log("[UnionRaid] FINAL DATA:", result);

  return result;
}


/**
 * Scrape the name of the Union from the page.
 *
 * @returns {string} The name of the Union, or an empty string if not found.
 */
function scrapeUnionName(): string {
  const span = document.querySelector<HTMLSpanElement>(
    "div.font-bold span.mr-\\[5px\\]"
  );
  return span?.textContent?.trim() ?? "";
}

/**
 * Scrape the ID of the Union from the page.
 *
 * @returns {string} The ID of the Union, or an empty string if not found.
 */
function scrapeUnionId(): string {
  const div = document.querySelector<HTMLDivElement>(
    "div.text-\\[color\\:var\\(--op-text-white\\)\\].text-\\[length\\:10px\\].mt-\\[2px\\].truncate.leading-\\[12px\\]"
  );
  const text = div?.textContent?.trim() ?? "";
  return text.replace(/^UID:\s*/i, "");
}

/**
 * Scrape the avatar URL of the Union from the page.
 *
 * @returns {string} The src URL of the Union avatar, or an empty string if not found.
 */
function scrapeUnionAvatar(): string {
  const container = document.querySelector<HTMLDivElement>(
    "div.w-\\[66px\\].mr-\\[2px\\].flex-shrink-0"
  );
  const img = container?.querySelector<HTMLImageElement>("img");
  return img?.src ?? "";
}

function getCurrentSeasonText(): string {
  const directSelectors = [
    "div.flex.items-center.cursor-pointer > span",
    "div.text-\\[color\\:var\\(--color-3\\)\\] span",
    "div.leading-\\[10px\\] span",
  ];

  const results: string[] = [];

  for (const selector of directSelectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const node of nodes) {
      const text = node.textContent?.trim() ?? "";
      if (/\[S\d+\]/i.test(text)) {
        return text;
      }
    }
  }

  const allSpans = Array.from(document.querySelectorAll<HTMLSpanElement>("span"));
  for (const span of allSpans) {
    const text = span.textContent?.trim() ?? "";
    if (/\[S\d+\]/i.test(text)) {
      if (span.offsetWidth > 0 || span.offsetHeight > 0) {
        return text;
      }
      results.push(text);
    }
  }

  if (results.length > 0) {
    return results[0];
  }

  // Ultimate fallback: search every single element for a leaf node with the pattern
  const allElements = Array.from(document.querySelectorAll<HTMLElement>("*"));
  for (const el of allElements) {
    if (el.children.length > 0) {continue;} // Only leaf nodes
    const text = el.textContent?.trim() ?? "";
    if (/\[S\d+\]/i.test(text)) {
      return text;
    }
  }

  const bodyText = document.body?.textContent ?? "";
  // More lenient match: [Sxx] followed by anything that looks like a date range
  const rangeMatch = bodyText.match(/\[S\d+\][^<]*\d{4}[^<]*-[^<]*\d{4}/i);
  if (rangeMatch) {
    return rangeMatch[0].trim();
  }

  // Absolute last resort: just the first [Sxx] found
  const simpleMatch = bodyText.match(/\[S\d+\]/i);
  return simpleMatch?.[0]?.trim() ?? "";
}

function seasonTextToKey(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {return "";}
  if (!/\[S\d+\]/i.test(normalized)) {return "";}

  const compact = normalized
    .replace(/\//g, "_")
    .replace(/:/g, "_")
    .replace(/\s*-\s*/g, "_TO_")
    .replace(/[^\w\[\]]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const seasonMatch = normalized.match(/\[(S\d+)\]/i);
  const season = (seasonMatch?.[1] ?? "").toUpperCase();
  if (!season) {return "";}
  return `SEASON_${season}_${compact.toUpperCase()}`;
}

function getCurrentSeasonKey(): string {
  return seasonTextToKey(getCurrentSeasonText());
}

/**
 * Scrape the Synchro Levels of members from the Union Raid page.
 *
 * @returns {SynchroRow[]} Array of `SynchroRow` objects containing the member name and its synchro level.
 */
function scrapeSynchroLevels(): SynchroRow[] {
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(
      "div.px-\\[7\\.5px\\].py-\\[9px\\].cursor-pointer"
    )
  );

  return rows
    .map(row => {
      const name =
        row.querySelector<HTMLElement>("div.truncate")
          ?.textContent?.trim() ?? "";

      const text =
        Array.from(row.querySelectorAll("span"))
          .find(s => s.textContent?.includes("Synchro Level"))
          ?.textContent ?? "";

      // ambil angka pake regex CAPTURE
      const match = text.match(/Synchro Level:\s*(\d+)/);
      const level = match ? Number(match[1]) : null;

      if (!name || level === null) {return null;}

      return {
        name,
        synchroLevel: level
      };
    })
    .filter(Boolean) as SynchroRow[];
}

/**
 * Scrape all Union Raid modals by clicking each player’s button and extracting data.
 *
 * @param {boolean} scrapingInProgress - Indicates whether a scrape is already running.
 * @param {boolean} stopRequested - Flag to allow stopping the scrape mid-process.
 * @param {string} [passedSeasonKey] - Optional season key to use for saving data.
 * @param {string} [passedSeasonText] - Optional season text to use for saving data.
 * @returns {Promise<void>} Resolves when all modals have been processed or the scrape is stopped.
 */
async function scrapeUnionRaidAllModals(
  scrapingInProgress: boolean,
  stopRequested: boolean,
  passedSeasonKey?: string,
  passedSeasonText?: string
): Promise<void> {
  if (scrapingInProgress) {
    console.warn("⏳ Already running");
    return;
  }

  scrapingInProgress = true;

  const spinner = document.createElement("div");
  spinner.id = "shiftypad-scrape-spinner";
  spinner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
  `;
  spinner.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <style>
        @keyframes shiftypad-spin { 100% { transform: rotate(360deg); } }
        .shiftypad-spin-anim { 
          animation: shiftypad-spin 1s linear infinite; 
          transform-origin: center;
        }
      </style>
      <g class="shiftypad-spin-anim">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </g>
    </svg>
    <span id="shiftypad-scrape-text">Scraping in progress... 0%</span>
  `;
  document.body.appendChild(spinner);

  try {
    const buttons = Array.from(
      document.querySelectorAll<HTMLSpanElement>(
        "table tbody tr td span[data-cname='svg-icon']"
      )
    );

    console.log(`🔍 Buttons found: ${buttons.length}`);

    const finalResult: PlayerRaidResult[] = [];

    for (let i = 0; i < buttons.length; i++) {
      if (stopRequested) {break;}

      const progress = Math.round((i / buttons.length) * 100);
      const textEl = document.getElementById("shiftypad-scrape-text");
      if (textEl) {
        textEl.textContent = `Scraping in progress... ${progress}%`;
      }

      const expectedPlayerName = buttons[i].closest("tr")?.querySelectorAll("td")[1]?.textContent?.trim() || "";

      console.log(`💥 Click ${i + 1}/${buttons.length} (Expected: ${expectedPlayerName})`);
      buttons[i].click();

      const modal = await waitForModalAppear();
      if (!modal) {
        console.warn("⚠️ Modal not found");
        continue;
      }

      let playerName = modal.querySelector<HTMLElement>("div.font-bold")?.textContent?.trim() ?? "UNKNOWN";
      let waitAttempts = 0;
    
      // Wait for Vue to patch the modal for the new player (Text updates)
      while (waitAttempts < 25 && expectedPlayerName && playerName !== expectedPlayerName) {
        await sleepMs(20); // Super fast check
        playerName = modal.querySelector<HTMLElement>("div.font-bold")?.textContent?.trim() ?? "UNKNOWN";
        waitAttempts++;
      }

      console.log(`👤 Player: ${playerName}. Extracting data...`);

      const rows = extractRowsFromModal(modal);
      console.log("📦 Extracted rows:", rows);

      // SYNCHRO (LOG + APPLY)
      const firstCard = modal.querySelector<HTMLElement>(".av .relative");

      let debugLvText: string | undefined;
      let synchro = 0;

      if (firstCard) {
        const lvEl = Array.from(firstCard.querySelectorAll("div"))
          .find(el => /^LV\.\d+/.test(el.textContent?.trim() ?? ""));

        debugLvText = lvEl?.textContent?.trim();

        if (debugLvText) {
          synchro = parseInt(debugLvText.replace(/\D+/g, ""), 10) || 0;
        }
      }

      console.log("LV FOUND:", debugLvText, "=>", synchro);

      const total_attempt = rows.length;
      const total_damage = rows.reduce((sum, r) => sum + (r.damage || 0), 0);

      function formatToB(num: number): string {
        return (num / 1_000_000_000).toFixed(3).replace(/\.?0+$/, "") + "B";
      }

      finalResult.push({
        player: playerName,
        synchro,
        total_attempt,
        total_damage,
        total_damage_text: formatToB(total_damage),
        rows,
      });

      const closed = await closeModal(modal);

      if (closed) {
        console.log(`✅ Modal ${i + 1} closed. Waiting 500ms...`);
        await sleepMs(500);
      } else {
        console.warn(`⚠️ Modal ${i + 1} failed to close cleanly. Proceeding anyway.`);
      }
    }

    console.log("✅ SCRAPE DONE");
    console.log("📊 FINAL JSON RESULT:");
    console.table(finalResult);

    if (isUnionRaidPage()) {
      const seasonText = passedSeasonText || getCurrentSeasonText();
      const seasonKey = passedSeasonKey || seasonTextToKey(seasonText);

      const seasonedKey = getSeasonedCacheKey(seasonKey);
      if (!seasonedKey) {
        console.error("[Content] Failed to resolve seasoned key, cannot save data.");
        alert("Error: Could not detect season. Data was not saved.");
        return;
      }
      const cacheKey = `ALL_UNION_RAID_DAMAGE_DATA_${seasonedKey}`;
      const unionKey = `UNION_${seasonedKey}`;
      const union = scrapeUnionName();
      console.log("INILAH modifier", cacheKey);

      localStorage.setItem(
        cacheKey,
        JSON.stringify(finalResult, null, 2)
      );

      chrome.storage.local.set(
        {
          [cacheKey]: finalResult,
          [unionKey]: { union, seasonKey, seasonText, timestamp: Date.now() }
        },
        () => {
          console.log(`[Content] 💾 SAVED ${cacheKey}:`, finalResult.length);
        }
      );

      console.log("💾 JSON SAVED TO STORAGE");
      alert("Scrape complete! Data saved to storage.");
    }
  } finally {
    spinner.remove();
    scrapingInProgress = false;
  }
}

/**
 * Extract raid damage rows from a player modal element.
 *
 * @param {HTMLElement} modal - The modal element containing raid rows.
 * @returns {RaidDamageRow[]} Array of `RaidDamageRow` objects extracted from the modal.
 */
function extractRowsFromModal(modal: HTMLElement): RaidDamageRow[] {
  const rows: RaidDamageRow[] = [];

  const rowBlocks = Array.from(
    modal.querySelectorAll<HTMLElement>(
      "div.w-full.bg-\\[\\#f4f4f4\\].h-\\[150px\\]"
    )
  );

  console.log(`🔎 Row blocks found: ${rowBlocks.length}`);

  for (let i = 0; i < rowBlocks.length; i++) {
    const block = rowBlocks[i];

    try {
      const boss =
        block.querySelector<HTMLElement>(
          "div.font-\\[DINNextLTProBold\\]"
        )?.textContent?.trim() ?? "";

      const difficulty =
        block.querySelector<HTMLElement>(
          "div.bg-\\[\\#fc6a37\\]"
        )?.textContent?.trim() ?? "";

      const rightPanel = block.querySelectorAll("div.flex.flex-col.items-end")[0];

      const levelText =
        rightPanel?.children[1]?.textContent ?? "";

      const level = parseInt(levelText.replace(/\D+/g, ""), 10) || 0;

      const damageText =
        block.querySelectorAll<HTMLElement>(
          "div.font-bold"
        )[1]?.textContent ?? "";

      const damage = Number(damageText.replace(/,/g, ""));

      const heroes: import("../types").NikkeHero[] = [];
      const heroContainers = block.querySelectorAll("div.relative.mr-\\[5px\\].w-\\[52px\\]");
      
      heroContainers.forEach((hero, index) => {
        const avatarImg = hero.querySelector("img[alt^='Avatar']");
        const avatarName = avatarImg ? avatarImg.getAttribute("alt") || `Hero ${index + 1}` : `Hero ${index + 1}`;
        const avatarUrl = avatarImg ? avatarImg.getAttribute("src") || "Unknown URL" : "Unknown URL";

        const starContainer = hero.querySelector("div[data-cname='index']");
        if (!starContainer) { return; }

        const goldStars = starContainer.querySelectorAll("img[src*='star-gold']");
        const starCount = goldStars.length;

        let coreText = "0";
        const evolveP = starContainer.querySelector("p");
        if (evolveP) {
          coreText = evolveP.textContent?.trim() || "0";
        }

        let finalTier = `LB ${starCount}`;
        if (coreText === "MAX") {
          finalTier = "MAX";
        } else if (coreText !== "0") {
          finalTier = `Core ${coreText}`;
        }

        const cpContainer = hero.querySelector(".text-\\[var\\(--text-3\\)\\].text-\\[9px\\]");
        const cp = cpContainer ? cpContainer.textContent?.trim() || "Unknown CP" : "Unknown CP";

        const levelContainer = hero.querySelector(".bg-gradient-to-b > div");
        const synchroLevelText = levelContainer ? levelContainer.textContent?.trim() || "LV.0" : "LV.0";
        const synchroLevel = parseInt(synchroLevelText.replace(/[^0-9]/g, ""), 10) || 0;

        heroes.push({
          avatarName,
          avatarUrl,
          synchroLevel,
          limitBreak: starCount,
          coreLevel: coreText,
          finalTier,
          combatPower: cp
        });
      });

      const row: RaidDamageRow = {
        boss,
        difficulty,
        level,
        damage,
        heroes,
      };

      console.log(`[ROW ${i + 1}]`, row);
      rows.push(row);
    } catch (err) {
      console.warn(`⚠️ Failed parse row ${i + 1}`, err);
    }
  }

  return rows;
}

/**
 * Wait for a Union Raid modal to appear in the DOM.
 *
 * @returns {Promise<HTMLElement | null>} A promise that resolves to the modal element if found, or `null` if the timeout is reached.
 */
function waitForModalAppear(): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const start = Date.now();

    const timer = setInterval(() => {
      const modal = document.querySelector<HTMLElement>(
        "div.absolute.bottom-0.w-full"
      );

      if (modal) {
        clearInterval(timer);
        resolve(modal);
      }

      if (Date.now() - start > 3000) {
        clearInterval(timer);
        resolve(null);
      }
    }, 50);
  });
}

/**
 * Closes the player modal by finding the active overlay and clicking it.
 */
async function closeModal(modal: HTMLElement): Promise<boolean> {
  console.log("Attempting to close modal via simple DOM relation clicks...");

  // 1. If the backdrop is a sibling (very common in Tailwind/Vue headless setups)
  let prev = modal.previousElementSibling as HTMLElement;
  while (prev) {
    prev.click();
    prev = prev.previousElementSibling as HTMLElement;
  }

  let next = modal.nextElementSibling as HTMLElement;
  while (next) {
    next.click();
    next = next.nextElementSibling as HTMLElement;
  }

  // 2. If the backdrop is the parent wrapper
  modal.parentElement?.click();

  // 3. Fallback to known framework overlay classes
  const overlays = document.querySelectorAll(".van-overlay, .el-overlay, [class*=\"overlay\"], [class*=\"backdrop\"]");
  overlays.forEach(overlay => {
    const el = overlay as HTMLElement;
    if (window.getComputedStyle(el).display !== "none") {
      el.click();
    }
  });

  // Wait for transition
  let closed = false;
  for (let j = 0; j < 20; j++) {
    if (!document.body.contains(modal) || modal.offsetWidth === 0 || window.getComputedStyle(modal).display === "none") {
      closed = true;
      break;
    }
    await sleepMs(50);
  }
  
  return closed;
}

/**
 * Pause execution for a specified number of milliseconds.
 * 
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Returns a unique cache key for the current union-raid page.
 * 
 * @returns {string} A string representing the cache key from the URL's openid parameter or pathname.
 */
function getCacheKey(): string {
  const url = new URL(window.location.href);
  const openid = url.searchParams.get("openid");
  if (openid) {
    try {
      localStorage.setItem("__SHIFTYPAD_OPENID", openid);
    } catch {
      // ignore storage write failures
    }
    return `IDENTIFIER_${openid}`;
  }

  try {
    const savedOpenid = localStorage.getItem("__SHIFTYPAD_OPENID");
    if (savedOpenid) {
      return `IDENTIFIER_${savedOpenid}`;
    }
  } catch {
    // ignore storage read failures
  }

  return `IDENTIFIER_${url.pathname}`;
}

function getSeasonedCacheKey(seasonKey?: string): string {
  const resolvedSeasonKey = seasonKey ?? getCurrentSeasonKey();
  if (!resolvedSeasonKey) {return "";}
  return `${getCacheKey()}__${resolvedSeasonKey}`;
}


export {
  getCacheKey,
  getSeasonedCacheKey,
  getCurrentSeasonKey,
  getCurrentSeasonText,
  seasonTextToKey,
  getBossWeakness,
  isUnionRaidPage,
  openMemberDropdown,
  scrapeTable,
  scrapeUnionName,
  scrapeUnionId,
  scrapeUnionAvatar,
  scrapeSynchroLevels,
  scrapeUnionRaidAllModals,
  extractRowsFromModal,
  waitForModalAppear,
  closeModal,
  sleepMs
};


