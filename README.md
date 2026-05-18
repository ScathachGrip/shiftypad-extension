<div align="center">
<a href="#"><img width="500" src="astro/public/project/extension.png" alt="extension"></a>

<h4 align="center">Blablalink extension with Union Raid data focused.</h4>
<p align="center">
	<a href="https://github.com/ScathachGrip/shiftypad-extension/actions/workflows/release.yml"><img src="https://github.com/ScathachGrip/shiftypad-extension/actions/workflows/release.yml/badge.svg"></a>
	<a href="https://qlty.sh/gh/ScathachGrip/projects/shiftypad-extension"><img src="https://qlty.sh/gh/ScathachGrip/projects/shiftypad-extension/maintainability.svg" alt="Maintainability" /></a>
</p>

Union Raid data, right where you need it — Pull Union Raid data with ease. interactive visualizations, clarity to every metrics, season-aware cache, and one-click export.

<a href="https://shiftypad.scathach.id/">Installation</a> •
<a href="https://github.com/ScathachGrip/shiftypad-extension/blob/master/CONTRIBUTING.md">Contributing</a> •
<a href="https://github.com/ScathachGrip/shiftypad-extension/issues/new/choose">Report Issues</a>
</div>

---

<a href="https://shiftypad.scathach.id/"><img align="right" src="astro/public/project/neon.png" width="300"></a>

- [shiftypad-extension](#)
  - [The problem](#the-problem)
  - [The solution](#the-solution)
  - [Prerequisites](#prerequisites)
  - [Architecture](/src/)
  - [Data Contracts](#data-contracts)
    - [MemberRow](#data-contracts)
    - [PlayerRaidResult](#data-contracts)
    - [GetMembersResponse](#data-contracts)
    - [Cache keys](#data-contracts)
    - [SEASON_KEY](#data-contracts)
  - [Testing](#testing)
  - [Debugging](#debugging)
    - [Aegis SDK](#aegis-sdk)
    - [ApexCharts](#Apexcharts)
  - [Monolith](#)
    - [shiftypad-extension](/src/)
    - [shiftypad-extension/astro](/astro/)
  - [CLosing remarks](/CLOSING_REMARKS.md)
  - [Legal](#legal)


## The problem
https://www.blablalink.com/shiftyspad/union-raid is highly tedious, that's all.

## The solution
**shiftypad-extension** Manifest V3 Chrome extension designed to transform how Union leaders and players experience Union Raids. By automating data extraction and providing rich, local interactive analytics directly in your browser, it solves these headaches seamlessly:
- **Instant Interactive Analytics:** A sleek displaying responsive visual reports powered by ApexCharts, including player rankings and residual damage.
- **Automated DOM Scraping:** Injects safe page-side content scripts to scrape both summary (`MemberRow`) and detailed attempt-level raid results (`PlayerRaidResult[]`) instantly.
- **Season-Aware Local Cache:** Automatically structures and caches all scraped data per season in `chrome.storage.local`, ensuring fast load times and preventing redundant DOM scraping.
- **One-Click Exports:** Standardizes data exports for external planning or sheet integrations.
- **True Efficiency Analysis (Residuals):** Uses an ordinary least squares (OLS) linear model (`expected_damage = a * synchro + b`) to rank players based on actual performance versus expected baseline, making it easy to identify high-performing members.


### Prerequisites
- [Bun](https://bun.sh) >= 1.3.13 or higher

## Data Contracts

- Summary data is normalized to `MemberRow` (name, count, damage, synchroLevel).
- Detailed scrape data uses `PlayerRaidResult[]` (player, synchro, attempts, damage per boss).
- `GetMembersResponse` bundles union metadata (name, id) with seasonal context (key, text) and data payload.
- Cache keys are deterministic and season-aware:
  - Damage: `ALL_UNION_RAID_DAMAGE_DATA_<IDENTIFIER>__<SEASON_KEY>`
  - Union metadata: `UNION_<IDENTIFIER>__<SEASON_KEY>`
- `IDENTIFIER` is derived from the `openid` query parameter, falling back to the URL pathname.
- `SEASON_KEY` is extracted from the season text in the DOM, falling back to `SEASON_CURRENT`.

## Testing
[![Code Coverage](https://qlty.sh/gh/ScathachGrip/projects/shiftypad-extension/coverage.svg)](https://qlty.sh/gh/ScathachGrip/projects/shiftypad-extension)  
The current state testing is not done yet, you can see object scripts in file `package.json` or `/tests/` directory.

## Debugging
### Aegis SDK
Blablalink uses Tencent's Aegis SDK for performance logging, error tracking, and telemetry monitoring on their frontend.
- **Frontend Change Detection:** To prevent DOM structure changes from silently breaking the extension's DOM scrapers, the development environment utilizes the `bun run blablalink:version`.
- **Telemetry Verification:** The script queries `blablalink.com` directly, parses the main entry script to locate the Aegis SDK version, release time, current Vite build slot, and content hash, and matches them against `aegisVersionCache.json`.

### ApexCharts
This extension uses ApexCharts to render modern, interactive data visualizations directly in the extension's popup dashboard.
- **Local Sandbox Compliance:** Because Chrome Extension Manifest V3 enforces strict Content Security Policies (CSP) forbidding the execution of external/remote Javascript, ApexCharts is downloaded locally during the build stage using the `bun run download:apex` command (implemented in `ci/downloadApex.ts`). It retrieves the exact minified runtime version specified in `package.json` and bundles it directly into `dist/apexcharts.min.js`.

## Legal
This tool can be freely copied, modified, altered, distributed without any attribution whatsoever. However, if you feel
like this tool deserves an attribution, mention it. It won't hurt anybody.
> Licence: WTF.
