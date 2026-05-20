import { MemberRow, PlayerRaidResult, PopupState, GetMembersResponse } from "../types";
import { renderTable } from "./popupRender";
import { refreshVisibleCharts } from "./popupCharts";
import * as PopupUtils from "./popupUtils";

type SeasonMeta = {
  seasonKey: string;
  seasonText: string;
};

/**
 * Sets up sorting functionality for the table headers in the popup.
 *
 * @param {PopupState} state - The current state of the popup, including sorting information.
 * @returns {void}
 */
export function setButtonsEnabled(state: PopupState, enabled: boolean): void {
  document.querySelectorAll<HTMLButtonElement>(".tombol button").forEach(btn => {
    btn.disabled = !enabled;
    btn.classList.toggle("btn-disabled", !enabled);
  });
}

/**
 * Checks the initial cache for union raid data and toggles the buttons in the popup accordingly.
 * 
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function checkInitialCacheAndToggleButtons(state: PopupState): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url;
    if (!url) {
      setButtonsEnabled(state, false);
      return;
    }

    const key = PopupUtils.getCacheKeyFromUrl(url);
    const prefix = `ALL_UNION_RAID_DAMAGE_DATA_${key}__`;
    const unionPrefix = `UNION_${key}__`;

    chrome.storage.local.get(null, (items) => {
      const hasData = Object.keys(items).some((k) =>
        k.startsWith(prefix) && Array.isArray(items[k]) && items[k].length > 0
      );
      const hasUnion = Object.keys(items).some((k) => k.startsWith(unionPrefix));
      setButtonsEnabled(state, hasData || hasUnion);
    });
  });
}

function getAvailableSeasons(baseKey: string, items: Record<string, unknown>): SeasonMeta[] {
  const damagePrefix = `ALL_UNION_RAID_DAMAGE_DATA_${baseKey}__`;
  const unionPrefix = `UNION_${baseKey}__`;
  const seasons = new Map<string, SeasonMeta>();

  for (const key of Object.keys(items)) {
    if (!key.startsWith(damagePrefix) && !key.startsWith(unionPrefix)) {
      continue;
    }

    const seasonKey = key.startsWith(damagePrefix)
      ? key.slice(damagePrefix.length)
      : key.slice(unionPrefix.length);
    if (!seasonKey || seasonKey.includes("UNKNOWN")) {
      continue;
    }

    const unionMeta = items[`${unionPrefix}${seasonKey}`] as { seasonText?: string } | undefined;
    const label = unionMeta?.seasonText || seasonKey.replace(/^SEASON_/, "").replaceAll("_", " ");
    seasons.set(seasonKey, { seasonKey, seasonText: label });
  }

  return Array.from(seasons.values()).sort((a, b) => b.seasonText.localeCompare(a.seasonText));
}

function bindSeasonSelector(
  state: PopupState,
  availableSeasons: SeasonMeta[],
  selectedSeasonKey: string,
): void {
  const select = state.seasonSelect;
  const optionsContainer = state.seasonSelectOptions;
  const trigger = state.seasonSelectTrigger;

  select.innerHTML = "";
  optionsContainer.innerHTML = "";

  select.disabled = availableSeasons.length === 0;

  if (availableSeasons.length === 0) {
    trigger.textContent = "No seasons available";
    return;
  }

  for (const season of availableSeasons) {
    const option = document.createElement("option");
    option.value = season.seasonKey;
    option.textContent = season.seasonText;

    const customOption = document.createElement("div");
    customOption.className = "select-option";
    customOption.textContent = season.seasonText;
    customOption.dataset.value = season.seasonKey;

    if (season.seasonKey === selectedSeasonKey) {
      option.selected = true;
      trigger.textContent = season.seasonText;
      customOption.classList.add("selected");
    }

    customOption.addEventListener("click", () => {
      select.value = season.seasonKey;
      state.customSeasonSelect.classList.remove("open");
      select.dispatchEvent(new Event("change"));
    });

    select.appendChild(option);
    optionsContainer.appendChild(customOption);
  }
}

/**
 * Loads member data for the popup by sending a message to the content script and updates the popup state accordingly.
 *
 * @param {PopupState} state - The current state of the popup, including button elements and containers.
 * @returns {void}
 */
export function loadMembers(state: PopupState, requestedSeasonKey?: string): void {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const tabId = tab?.id;
    if (!tabId) { return; }

    const url = tab.url;
    if (!url) { return; }
    const allowedUrl = "https://www.blablalink.com/shiftyspad/union-raid";

    if (!url.startsWith("https://www.blablalink.com/")) {
      document.body.innerHTML = `
        <h4>Error</h4>
        <div class="empty">This extension only works on blablalink.com</div>
      `;
      return;
    }

    if (!url.startsWith(allowedUrl)) {
      document.body.innerHTML = `
        <h4>Uh</h4>
        <div class="empty">❌ This only works on ${allowedUrl} path.</div>
      `;
      return;
    }

    const baseKey = PopupUtils.getCacheKeyFromUrl(url);
    chrome.storage.local.get(null, (allItems) => {
      const seasons = getAvailableSeasons(baseKey, allItems);
      const requestMembers = (selectedSeasonKey: string): void => {
        chrome.tabs.sendMessage(
          tabId,
          selectedSeasonKey ? { type: "GET_MEMBERS", seasonKey: selectedSeasonKey } : { type: "GET_MEMBERS" },
          (res: GetMembersResponse) => {
            state.loadingOverlay.classList.add("hidden");
            if (chrome.runtime.lastError) {
              alert("Page connection lost. Refreshing the page to reconnect.");
              void chrome.tabs.reload(tabId);
              window.close();
              return;
            }
            if (res?.union) {
              state.unionName = res.union;
              const id = res.unionId || baseKey.replace("IDENTIFIER_", "");
              state.title.textContent = `${res.union} (${id})`;
            }

            state.activeSeasonKey = res?.seasonKey ?? selectedSeasonKey;
            state.activeSeasonText = res?.seasonText ?? "";

            const mergedSeasons = [...seasons];
            if (state.activeSeasonKey && state.activeSeasonText) {
              const exists = mergedSeasons.some((s) => s.seasonKey === state.activeSeasonKey);
              if (!exists) {
                mergedSeasons.unshift({
                  seasonKey: state.activeSeasonKey,
                  seasonText: state.activeSeasonText
                });
              }
            }
            const seasonList = mergedSeasons;
            bindSeasonSelector(state, seasonList, state.activeSeasonKey);

            if (!state.seasonSelect.dataset.bound) {
              state.seasonSelect.addEventListener("change", () => {
                loadMembers(state, state.seasonSelect.value);
              });

              state.seasonSelectTrigger.addEventListener("click", (e) => {
                e.stopPropagation();
                state.customSeasonSelect.classList.toggle("open");
              });

              document.addEventListener("click", (e) => {
                if (!state.customSeasonSelect.contains(e.target as Node)) {
                  state.customSeasonSelect.classList.remove("open");
                }
              });

              state.seasonSelect.dataset.bound = "1";
            }

            const isPlayerRaidResult = (r: MemberRow | PlayerRaidResult): r is PlayerRaidResult =>
              typeof (r as PlayerRaidResult).player === "string";

            const normalized = (res?.data || []).map((r: MemberRow | PlayerRaidResult) => {
              if (isPlayerRaidResult(r)) {
                return {
                  name: r.player ?? "",
                  count: String(r.total_attempt ?? 0),
                  damage: r.total_damage_text ?? String(r.total_damage ?? 0),
                  synchroLevel: Number(r.synchro ?? 0),
                };
              }

              return {
                ...r,
                synchroLevel: Number(r.synchroLevel ?? 0),
              };
            });

            state.rows = normalized;

            // Clear current list content before re-rendering
            state.list.innerHTML = "";

            if (normalized.length === 0) {
              const seasonLabel = res?.seasonText || state.activeSeasonText || "this season";
              state.list.innerHTML = `<div class="empty">No records found for ${seasonLabel}. Please scrape first.</div>`;
              PopupUtils.showToast(`No records found for ${seasonLabel}. Please scrape first.`);
            }

            // Refresh the table (always updated)
            renderTable(state);

            // Refresh any visible charts (will show empty state or clear if no rows)
            refreshVisibleCharts(state);
            return;
          }
        );
      };

      if (requestedSeasonKey) {
        requestMembers(requestedSeasonKey);
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        { type: "GET_ACTIVE_SEASON" },
        (active: { seasonKey?: string }) => {
          if (chrome.runtime.lastError) {
            alert("Page connection lost. Refreshing the page to reconnect.");
            void chrome.tabs.reload(tabId);
            window.close();
            return;
          }
          const lockedSeasonKey = active?.seasonKey ?? "";
          const selectedSeasonKey = lockedSeasonKey || "";
          if (!selectedSeasonKey) {
            bindSeasonSelector(state, [], "");
            state.loadingOverlay.classList.remove("hidden");
            state.loadingText.textContent = "Detecting season...";
            state.title.textContent = "Detecting season...";
            state.list.innerHTML = "<div class=\"empty\">Searching for active season in DOM...</div>";
            setTimeout(() => loadMembers(state, requestedSeasonKey), 600);
            return;
          }
          state.loadingOverlay.classList.remove("hidden");
          state.loadingText.textContent = "Retrieving records...";
          state.title.textContent = "Loading data...";
          state.list.innerHTML = "<div class=\"empty\">Retrieving member records...</div>";
          requestMembers(selectedSeasonKey);
        }
      );
    });
  });
}

