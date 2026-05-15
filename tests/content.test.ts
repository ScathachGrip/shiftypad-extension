/* eslint-disable @typescript-eslint/no-explicit-any */
import "./setup";
import { describe, test, expect } from "bun:test";

describe("Content Script Integration", () => {
  test("should inject scrape button", () => {
    document.body.innerHTML = "<div id=\"app\"></div>";
    (window as any).__unionRaidInjected = false;
    const { UnionRaidScraper } = require("../src/content");
    const scraper = new UnionRaidScraper();
    // @ts-ignore
    scraper.injectButtons();
    const btn = document.getElementById("scrape-btn");
    expect(btn).not.toBeNull();
  });
});
