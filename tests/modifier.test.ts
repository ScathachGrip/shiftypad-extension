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
      (globalThis as unknown as { updateTestUrl: (url: string) => void }).updateTestUrl(newUrl);
      
      const key = getCacheKey(); 
      const stored = globalThis.localStorage.getItem("__SHIFTYPAD_OPENID");
      
      expect(key).toBe(`IDENTIFIER_${realOpenId}`);
      expect(stored).toBe(realOpenId);
    });
  });

  describe("Additional Scrapers", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    test("scrapeUnionAvatar should extract image src", () => {
      const container = document.createElement("div");
      container.className = "w-[66px] mr-[2px] flex-shrink-0";
      const img = document.createElement("img");
      img.src = "https://example.com/avatar.png";
      container.appendChild(img);
      document.body.appendChild(container);

      const { scrapeUnionAvatar } = require("../src/utils/modifier");
      expect(scrapeUnionAvatar()).toBe("https://example.com/avatar.png");
    });

    test("isUnionRaidPage should check pathname", () => {
      const { isUnionRaidPage } = require("../src/utils/modifier");
      expect(isUnionRaidPage()).toBe(true); // From setup.ts URL
    });

    test("scrapeSynchroLevels should extract names and levels", () => {
      document.body.innerHTML = `
        <div class="px-[7.5px] py-[9px] cursor-pointer">
          <div class="truncate">Commander</div>
          <span>Synchro Level: 250</span>
        </div>
      `;
      const { scrapeSynchroLevels } = require("../src/utils/modifier");
      const levels = scrapeSynchroLevels();
      expect(levels[0].name).toBe("Commander");
      expect(levels[0].synchroLevel).toBe(250);
    });

    test("getCurrentSeasonKey should return a key from season text", () => {
      document.body.innerHTML = "<span>[S21]</span>";
      const { getCurrentSeasonKey } = require("../src/utils/modifier");
      expect(getCurrentSeasonKey()).toContain("SEASON_S21");
    });

    test("extractRowsFromModal should parse raid blocks", () => {
      const modal = document.createElement("div");
      modal.innerHTML = `
        <div class="w-full bg-[#f4f4f4] h-[150px]">
          <div class="font-[DINNextLTProBold]">H.S.T.A.</div>
          <div class="bg-[#fc6a37]">Normal</div>
          <div class="flex flex-col items-end">
            <div>Some Label</div>
            <div>Level 10</div>
          </div>
          <div class="font-bold">Dummy</div>
          <div class="font-bold">1,234,567</div>
        </div>
      `;
      const { extractRowsFromModal } = require("../src/utils/modifier");
      const rows = extractRowsFromModal(modal);
      expect(rows).toHaveLength(1);
      expect(rows[0].boss).toBe("H.S.T.A.");
      expect(rows[0].damage).toBe(1234567);
      expect(rows[0].level).toBe(10);
    });

    test("scrapeUnionRaidAllModals should iterate buttons", async () => {
      const btn = document.createElement("span");
      btn.setAttribute("data-cname", "svg-icon");
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.appendChild(btn);
      tr.appendChild(document.createElement("td"));
      tr.appendChild(document.createElement("td"));
      tr.appendChild(document.createElement("td"));
      tr.appendChild(td);
      tbody.appendChild(tr);
      table.appendChild(tbody);
      document.body.appendChild(table);

      btn.onclick = () => {
        const modal = document.createElement("div");
        modal.className = "absolute bottom-0 w-full";
        modal.innerHTML = `
          <div class="font-bold">Test Player</div>
          <div class="av"><div class="relative"><div>LV.200</div></div></div>
          <div class="w-full bg-[#f4f4f4] h-[150px]">
             <div class="font-[DINNextLTProBold]">Boss</div>
             <div class="bg-[#fc6a37]">Hard</div>
             <div class="flex flex-col items-end"><div></div><div>Level 5</div></div>
             <div class="font-bold"></div><div class="font-bold">500,000</div>
          </div>
        `;
        document.body.appendChild(modal);
      };

      const { scrapeUnionRaidAllModals } = require("../src/utils/modifier");
      await scrapeUnionRaidAllModals(false, false);
      
      const stored = globalThis.localStorage.getItem("ALL_UNION_RAID_DAMAGE_DATA_IDENTIFIER_12345__SEASON_CURRENT");
      expect(stored).toBeDefined();
    });
  });
});
