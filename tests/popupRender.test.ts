import "./setup";
import { expect, test, describe } from "bun:test";
import { renderTable } from "../src/popup/popupRender";
import { PopupState } from "../src/types";

describe("Popup Render", () => {
  test("renderTable should populate list innerHTML", () => {
    const mockState = {
      rows: [{ name: "Player1", damage: "1,000,000", synchroLevel: 200, count: "3" }],
      sortKey: "damage",
      sortDir: "desc",
      list: document.createElement("div")
    } as unknown as PopupState;
    
    renderTable(mockState);
    expect(mockState.list.innerHTML).toContain("Player1");
  });
});
