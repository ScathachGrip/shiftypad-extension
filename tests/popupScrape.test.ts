import { expect, test, describe } from "bun:test";
import { scrapeAllUnionRaidForPopup } from "../src/popup/popupScrape";
import "./setup";

describe("Popup Scrape Script", () => {
  test("scrapeAllUnionRaidForPopup should click buttons and extract modal text", async () => {
    // Setup fake button
    const btn = document.createElement("span");
    btn.setAttribute("data-cname", "svg-icon");
    document.body.appendChild(btn);

    // Mock modal appearing after click
    btn.onclick = () => {
      const modal = document.createElement("div");
      modal.className = "absolute bottom-0 w-full";
      modal.textContent = "Fake Scraped Data";
      const closeBtn = document.createElement("button");
      modal.appendChild(closeBtn);
      document.body.appendChild(modal);
    };

    const results = await scrapeAllUnionRaidForPopup();
    expect(results).toContain("Fake Scraped Data");
    
    // Cleanup
    document.body.innerHTML = "";
  });

  test("scrapeAllUnionRaidForPopup should handle missing modal with warning", async () => {
    const btn = document.createElement("span");
    btn.setAttribute("data-cname", "svg-icon");
    document.body.appendChild(btn);

    // No modal created
    const results = await scrapeAllUnionRaidForPopup();
    expect(results[0]).toContain("Modal 1 not found");
    
    document.body.innerHTML = "";
  });
});
