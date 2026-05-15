/**
 * Scrapes all union raid information from the page for display in the popup.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of strings containing the scraped information from each modal.
 */
export async function scrapeAllUnionRaidForPopup(): Promise<string[]> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForModal = (selector: string, timeout = 1000): Promise<HTMLElement | null> => {
    return new Promise(resolve => {
      const interval = 50;
      let elapsed = 0;
      const check = (): void => {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) {return resolve(el);}
        elapsed += interval;
        if (elapsed >= timeout) {return resolve(null);}
        setTimeout(check, interval);
      };
      check();
    });
  };

  const buttons = Array.from(document.querySelectorAll<HTMLSpanElement>("span[data-cname=\"svg-icon\"]"));
  const results: string[] = [];

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    btn.click();
    const modal = await waitForModal("div.absolute.bottom-0.w-full", 2000);
    if (!modal) {
      console.warn(`⚠️ Modal not found for button ${i + 1}`);
      results.push(`⚠️ Modal ${i + 1} not found`);
      continue;
    }
    results.push(modal.textContent?.trim() ?? "");
    const closeBtn = modal.querySelector<HTMLButtonElement>("button");
    if (closeBtn) {closeBtn.click();}
    await delay(50);
  }

  return results;
}
