import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import path from "path";

// Read the player.html file
const htmlPath = path.resolve(__dirname, "../player.html");
const html = readFileSync(htmlPath, "utf-8");

// Parse using JSDOM
const dom = new JSDOM(html);
const document = dom.window.document;

// Find all hero containers
const heroContainers = document.querySelectorAll("div.relative.mr-\\[5px\\].w-\\[52px\\]");

console.log(`Found ${heroContainers.length} heroes in the HTML.\n`);

const results: import("../src/types").NikkeHero[] = [];

heroContainers.forEach((hero, index) => {
  // Extract Avatar ID/Name for identification (from img alt or src)
  const avatarImg = hero.querySelector("img[alt^='Avatar']");
  const avatarName = avatarImg ? avatarImg.getAttribute("alt") || `Hero ${index + 1}` : `Hero ${index + 1}`;
  const avatarUrl = avatarImg ? avatarImg.getAttribute("src") || "Unknown URL" : "Unknown URL";

  // Find the star container
  const starContainer = hero.querySelector("div[data-cname='index']");
  if (!starContainer) {
    console.log(`[${avatarName}] No star data found.`);
    return;
  }

  // Count active gold stars
  const goldStars = starContainer.querySelectorAll("img[src*='star-gold']");
  const starCount = goldStars.length;

  // Check for Core/Evolve level
  let coreText = "0";
  const evolveP = starContainer.querySelector("p");
  if (evolveP) {
    // There is an evolve tag. Could be a number or MAX
    coreText = evolveP.textContent?.trim() || "0";
  }

  // Determine final tier (LB or Core)
  let finalTier = `LB ${starCount}`;
  if (coreText !== "0") {
    finalTier = `Core ${coreText}`;
  }

  // Extract Combat Power (for extra context)
  const cpContainer = hero.querySelector(".text-\\[var\\(--text-3\\)\\].text-\\[9px\\]");
  const cp = cpContainer ? cpContainer.textContent?.trim() : "Unknown CP";
  
  // Extract Synchro Level
  const levelContainer = hero.querySelector(".bg-gradient-to-b > div");
  const synchroLevelText = levelContainer ? levelContainer.textContent?.trim() : "LV.0";
  const synchroLevel = parseInt(synchroLevelText.replace(/[^0-9]/g, ""), 10) || 0;

  results.push({
    avatarName,
    avatarUrl,
    synchroLevel,
    limitBreak: starCount,
    coreLevel: coreText,
    finalTier,
    combatPower: cp
  });
});

console.log(JSON.stringify(results, null, 2));
