# AGENTS

## Purpose
This repository contains a Chrome extension for Union Raid data scraping and popup analytics on `blablalink.com/shiftyspad/union-raid`.

## Architecture
- `src/content.ts`: page-side controller, scraping trigger, runtime messaging, cache bridge.
- `src/utils/modifier.ts`: scraping helpers, DOM parsing, cache-key generation.
- `src/popup.tsx`: popup shell HTML/CSS mount.
- `src/popupInit.ts`: popup state bootstrap and wiring.
- `src/popup/*`: popup logic split by concern (`popupData`, `popupCharts`, `popupActions`, `popupRender`, `popupUi`, `popupUtils`).
- `src/serviceWorker.ts`: extension background runtime wiring.

## Data Contracts
- Summary rows are normalized to `MemberRow`.
- Detailed scrape rows are `PlayerRaidResult[]`.
- `GetMembersResponse` includes `union`, `unionId`, `seasonKey`, `seasonText`, and `data`.
- Cache keys must be deterministic and season-aware:
  - damage: `ALL_UNION_RAID_DAMAGE_DATA_<IDENTIFIER>__<SEASON_KEY>`
  - union metadata: `UNION_<IDENTIFIER>__<SEASON_KEY>`
- `IDENTIFIER` comes from `openid` query param when available, otherwise pathname.
- `SEASON_KEY` is derived from season text in DOM (fallback to `SEASON_CURRENT`).

## DOM Scrapers (`src/utils/modifier.ts`)
- `scrapeUnionName()` → extracts union name from `div.font-bold span.mr-[5px]`.
- `scrapeUnionId()` → extracts numeric UID from `div.text-[color:var(--op-text-white)].text-[length:10px].mt-[2px].truncate.leading-[12px]`, strips `UID:` prefix.
- `scrapeUnionAvatar()` → **READY TO CONSUME, NOT YET WIRED TO UI**. Extracts the union avatar image URL from `div.w-[66px].mr-[2px].flex-shrink-0 img`. Returns the full `src` URL string or empty string. Exported from `modifier.ts`, imported in `content.ts`.

## Popup UI
- Header displays union title as `{UNION_NAME} ({UID})` — no "Union:" prefix.
- Season selector is a **custom Web3-style dropdown** (not a native `<select>`). The hidden `<select id="seasonSelect">` is kept as state backing; the visible UI uses `.custom-select` / `.select-trigger` / `.select-options` classes.
- `PopupState` includes `customSeasonSelect`, `seasonSelectTrigger`, `seasonSelectOptions` for the custom dropdown.

## Guardrails
- Keep TypeScript strict-safe; avoid `any`.
- Keep popup responsive for 720px width baseline.
- **Chart Reactivity**: Any newly added chart MUST be integrated into `refreshVisibleCharts()` in `popupCharts.ts` to ensure it automatically re-renders and reacts to dark/light theme toggles.
- Do not silently change existing message names unless absolutely required.
- Prefer additive/bounded breaking changes with migration fallback when possible.
- **DO NOT modify existing `alert()` messages, error handlers, or validation logic** — these are intentionally worded. Design changes must not touch error/message strings.
- **CRITICAL:** Do not proactively edit files or apply code changes unless the USER explicitly commands you to do so. Always present your findings first and wait for approval.

## Validation Checklist
Run before finalizing:
1. `bun run lint` (which runs `tsc --noEmit` and `eslint`). **CRITICAL**: Always run `bun run lint` FIRST to catch TypeScript compiler errors. Do NOT run `bun run lint:fix` first, as it skips type checking and only fixes formatting.
2. If you are going to run `bun run clean:build`, you MUST update `package.json` version first. Bump the patch version (e.g., `0.0.18` to `0.0.19`). The maximum patch version is `0.0.100`. Once it reaches `100`, bump to `0.1.0`.

## Notes for Future Agents
- If UI or site DOM changes, update selectors in `modifier.ts` first.
- If cache schema changes, update both content and popup read paths in the same patch.
- `scrapeUnionAvatar()` is exported and imported but not yet consumed in the popup or response payload. Wire it when needed.
- The custom season dropdown syncs with the hidden native `<select>` via `dispatchEvent(new Event("change"))`. Do not remove the hidden `<select>`.
