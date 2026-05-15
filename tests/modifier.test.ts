import { expect, test, describe, beforeEach } from "bun:test";
import { 
  getBossWeakness, 
  seasonTextToKey, 
  scrapeUnionName, 
  scrapeUnionId,
  scrapeTable,
  getCacheKey
} from "../src/utils/modifier";

describe("modifier.ts utilities", () => {
  
  describe("getBossWeakness", () => {
    test("should identify H.S.T.A as Water weakness", () => {
      expect(getBossWeakness("H.S.T.A")).toBe("Water weakness");
    });

    test("should identify Z.E.U.S as Iron weakness", () => {
      expect(getBossWeakness("Z.E.U.S.")).toBe("Iron weakness");
    });

    test("should return Unknown for unknown boss", () => {
      expect(getBossWeakness("Random Boss")).toBe("Unknown weakness");
    });
  });

  describe("seasonTextToKey", () => {
    test("should convert [S21] text to SEASON_S21 key", () => {
      const text = "[S21] 2024/05/15 - 2024/05/22";
      const key = seasonTextToKey(text);
      expect(key).toContain("SEASON_S21");
      expect(key).toContain("2024_05_15_TO_2024_05_22");
    });

    test("should return empty string for invalid text", () => {
      expect(seasonTextToKey("No Season Here")).toBe("");
    });
  });

  describe("DOM Scrapers", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    test("scrapeUnionName should extract text from correct span", () => {
      document.body.innerHTML = `
        <div class="font-bold">
          <span class="mr-[5px]">The Chosen Ones</span>
        </div>
      `;
      expect(scrapeUnionName()).toBe("The Chosen Ones");
    });

    test("scrapeUnionId should extract and clean UID", () => {
      document.body.innerHTML = `
        <div class="text-[color:var(--op-text-white)] text-[length:10px] mt-[2px] truncate leading-[12px]">
          UID: 12345
        </div>
      `;
      // We use the complex selector defined in modifier.ts
      expect(scrapeUnionId()).toBe("12345");
    });
  });

  describe("Integration: Full Scrape Flow", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <!-- Table for scrapeTable -->
        <table>
          <tbody>
            <tr>
              <td>1</td>
              <td>PlayerOne</td>
              <td>3</td>
              <td><span>1,500,000,000</span></td>
            </tr>
            <tr>
              <td>2</td>
              <td>PlayerTwo</td>
              <td>2</td>
              <td><span>800,000,000</span></td>
            </tr>
          </tbody>
        </table>

        <!-- Synchro Levels for merging -->
        <div class="px-[7.5px] py-[9px] cursor-pointer">
          <div class="truncate">PlayerOne</div>
          <span>Synchro Level: 200</span>
        </div>
        <div class="px-[7.5px] py-[9px] cursor-pointer">
          <div class="truncate">PlayerTwo</div>
          <span>Synchro Level: 150</span>
        </div>
      `;
    });

    test("scrapeTable should merge player data with synchro levels correctly", () => {
      const data = scrapeTable();

      expect(data).toHaveLength(2);
      
      const p1 = data.find(d => d.name === "PlayerOne");
      expect(p1?.damage).toBe("1,500,000,000");
      expect(p1?.synchroLevel).toBe(200);

      const p2 = data.find(d => d.name === "PlayerTwo");
      expect(p2?.damage).toBe("800,000,000");
      expect(p2?.synchroLevel).toBe(150);
    });

    test("should persist identifier to localStorage via getCacheKey", () => {
      // Use a realistic openid string from blablalink
      const realOpenId = "MjkwODAtMTQwOTk2MjQyNTU1NTM1NTAzNTc=";
      const newUrl = `https://www.blablalink.com/shiftyspad/union-raid?openid=${realOpenId}`;
      window.history.pushState({}, "Test Page", newUrl);
      
      const key = getCacheKey(); 
      const stored = globalThis.localStorage.getItem("__SHIFTYPAD_OPENID");
      
      expect(key).toBe(`IDENTIFIER_${realOpenId}`);
      expect(stored).toBe(realOpenId);
    });
  });
});
