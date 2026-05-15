import { PopupState } from "../types";
import * as PopupUtils from "./popupUtils";

/**
 * Renders the table in the popup based on the current state, including sorting and data rows.
 * @param {PopupState} state - The current state of the popup, including sorting information and data rows. 
 * @returns {void}
 */
export function renderTable(state: PopupState): void {
  const sorted = [...state.rows].sort((a, b) => {
    const getVal = (r: typeof state.rows[number]) => state.sortKey === "index" ? 0 : PopupUtils.parseNumber(r[state.sortKey]);
    return state.sortDir === "asc" ? getVal(a) - getVal(b) : getVal(b) - getVal(a);
  });

  state.list.innerHTML = sorted.map((r, i) => `
      <div class="grid row">
        <div class="num">${i + 1}</div>
        <div class="center">${r.synchroLevel}</div>
        <div class="nickname">${r.name}</div>
        <div class="num">${r.count}</div>
        <div class="num">${r.damage}</div>
      </div>`).join("");
}

