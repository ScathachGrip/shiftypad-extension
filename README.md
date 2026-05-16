# shiftypad-extension

A Manifest V3 Chrome extension for scraping and analyzing Union Raid data on `blablalink.com/shiftyspad/union-raid`. Provides interactive popup analytics with customizable charts, season-aware caching, and export capabilities.

## Architecture

```
src/                          Extension source code (TypeScript)
  content.ts                  Page-side content script: scraping trigger,
                              runtime messaging, cache bridge
  serviceWorker.ts            Background service worker (MV3)
  popup.tsx                   Popup shell (React/TSX, HTML+CSS mount)
  popupInit.ts                Popup state bootstrap and wiring
  popup/                      Popup logic, split by concern
    popupData.ts              Data fetching and caching
    popupCharts.ts            ApexCharts rendering
    popupActions.ts           User interaction handlers
    popupRender.ts            DOM rendering
    popupUi.ts                UI element management
    popupUtils.ts             Utility helpers
  types.ts                    Shared type definitions
  types/global.d.ts           Global ambient type declarations
  utils/
    modifier.ts               DOM parsing, scraping helpers, cache-key generation
    logForwarder.ts           Console log forwarding to popup
ci/                           Build, release, and utility scripts
  build.ts                    Full build orchestrator
  release.ts                  ZIP packaging for distribution
  downloadApex.ts             Downloads ApexCharts runtime bundle
  checkVersion.ts             Blablalink frontend version detection
tests/                        Test suites (Bun test runner)
  setup.ts                    Global test setup (DOM environment)
  content.test.ts
  modifier.test.ts
  popup*.test.ts              Popup module tests (popupData, popupCharts, etc.)
  checkVersion*.test.ts       Version checker tests
  serviceWorker.test.ts
  efficiency-check.ts         Standalone efficiency analysis script
```

## Data Contracts

- Summary data is normalized to `MemberRow` (name, count, damage, synchroLevel).
- Detailed scrape data uses `PlayerRaidResult[]` (player, synchro, attempts, damage per boss).
- `GetMembersResponse` bundles union metadata (name, id) with seasonal context (key, text) and data payload.
- Cache keys are deterministic and season-aware:
  - Damage: `ALL_UNION_RAID_DAMAGE_DATA_<IDENTIFIER>__<SEASON_KEY>`
  - Union metadata: `UNION_<IDENTIFIER>__<SEASON_KEY>`
- `IDENTIFIER` is derived from the `openid` query parameter, falling back to the URL pathname.
- `SEASON_KEY` is extracted from the season text in the DOM, falling back to `SEASON_CURRENT`.

## Prerequisites

- [Bun](https://bun.sh) >= 1.3.13 (the project uses `bun@1.3.13` as its package manager)

## Scripts

### Clean and build pipeline

| Command | Action |
|---|---|
| `bun run clean` | Removes the `dist/` directory entirely. |
| `bun run build` | Runs the full build pipeline: cleans `dist/`, bundles all `.ts`/`.tsx` source files via `Bun.build()` with browser target and minification, copies HTML assets, downloads the ApexCharts runtime, and writes a production `manifest.json` (with version and build hash injection). |
| `bun run release` | Packages the `dist/` output together with `icons/`, `assets/`, and root docs (LICENSE, SECURITY, etc.) into a `shiftypad-extension.zip` using `fflate`. |
| `bun run clean:build` | Shortcut for `clean` -> `build` -> `release` in sequence. |

### Version management

| Command | Action |
|---|---|
| `bun run blablalink:version` | Fetches `https://www.blablalink.com`, extracts the Vite build hash, deployment slot, and Aegis SDK version from the HTML, then compares against a local `.aegisVersionCache.json` baseline to detect frontend changes. Use `--save` to persist the current build as the new baseline. |
| `bun run download:apex` | Downloads the ApexCharts library from the CDN URL specified in `package.json` to `dist/apexcharts.min.js`. Called automatically during `build`. |

### Linting and static analysis

| Command | Action |
|---|---|
| `bun run lint` | Runs `tsc --noEmit` for full type-checking across `src/`, `tests/`, and `ci/`, followed by ESLint on the same directories. |
| `bun run lint:fix` | Same as `lint` but with ESLint's `--fix` flag for automatic correction. |
| `bun run qlty` | Runs Qlty static analysis on the full codebase. |
| `bun run qlty:smells` | Runs Qlty's code smell analysis. |
| `bun run qlty:zizmor` | Runs Qlty with the zizmor template-injection checker filter. |

ESLint is configured with the `@typescript-eslint` plugin in strict mode: `no-explicit-any` is an error, floating/misused promises are errors, indentation is 2 spaces, quotes are double, semicolons are required, and `eqeqeq` with `curly` enforce consistent equality and brace style.

TypeScript is configured under `tsconfig.json` with strict mode, ESNext target, Bundler module resolution, noEmit, and DOM + Bun + Chrome types.

### Testing

| Command | Action |
|---|---|
| `bun test` | Runs all test files via Bun's native test runner. |
| `bun run test:coverage` | Clears the `coverage/` directory, then runs tests with LCOV and text coverage reporters. Coverage is scoped to `src/**` (excludes `ci/`, `tests/`, `dist/`, `node_modules/`). |
| `bun run test:efficiency` | Runs the standalone efficiency analysis script. |

#### Test structure

Tests live in `tests/` and use `tests/setup.ts` as a global preload (configured in `bunfig.toml`). The setup initializes a DOM environment via `jsdom-global` to simulate browser APIs for content script and popup testing.

The test suite covers:

- **Content script** (`content.test.ts`): Messaging, scraping triggers, cache read/write behavior.
- **DOM parsing** (`modifier.test.ts`): Union name, ID, avatar extraction, and cache-key generation.
- **Popup modules** (`popup*.test.ts`): Data fetching, chart rendering, user actions, DOM rendering, UI state, and utility helpers.
- **Version checker** (`checkVersion*.test.ts`): HTML parsing, metadata extraction, cache comparison.
- **Service worker** (`serviceWorker.test.ts`): Background runtime wiring.

#### Efficiency check

An offline script that analyzes a recorded raid dataset (`tests/<uuid>.json`) to identify the most efficient player. The methodology:

1. Filters players with exactly 3 attempts and valid synchro values.
2. Fits an ordinary least squares linear model: `expected_damage = a * synchro + b`.
3. Computes the residual for each player: `actual_damage - expected_damage`.
4. Ranks by residual (highest = most efficient), with total damage as a tiebreaker.

See [tests/README.md](tests/README.md) for the full methodology and example output.

#### Coverage configuration (from `bunfig.toml`)

```toml
[test]
preload = ["./tests/setup.ts"]
coverageInclude = ["src/**"]
coverageExclude = [
  "ci/**", "tests/**", "dist/**", "node_modules/**",
  "src/**/*.test.ts", "src/**/*.spec.ts"
]
```

## Popup UI

- Header displays the union title as `{UNION_NAME} ({UID})` without a "Union:" prefix.
- Season selector uses a custom Web3-style dropdown (the hidden native `<select id="seasonSelect">` is retained as state backing).
- Responsive baseline is 720px wide.
- Charts are powered by ApexCharts (loaded at runtime from `apexcharts.min.js`).

## Cache

The extension maintains a season-aware local cache via `chrome.storage.local`:

- Damage data and union metadata are cached separately per season.
- Cache entries include a timestamp for staleness checks.
- Clearing the cache (via `CLEAR_CACHE` message or the popup clear button) removes all extension-prefixed entries.

## DOM Scrapers

All DOM parsing lives in `src/utils/modifier.ts`:

- `scrapeUnionName()` -- extracts the union name from `div.font-bold span.mr-[5px]`.
- `scrapeUnionId()` -- extracts the numeric UID from `div.text-[color:var(--op-text-white)]`, strips the `UID:` prefix.
- `scrapeUnionAvatar()` -- extracts the union avatar image URL (exported, ready for UI integration).
- Cache-key generation uses deterministic, season-aware string formatting.

## License

MIT -- see [LICENSE](LICENSE).
