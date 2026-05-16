# AGENTS - astro

## Purpose
Static landing page for the shiftypad-extension Chrome extension. Built with Astro 5. Lives in `astro/` at the repo root.

## Architecture
- `src/pages/index.astro` -- single page entry, imports all components.
- `src/layouts/Layout.astro` -- HTML shell, Google Fonts (Poppins), inline theme-init script.
- `src/components/` -- one component per page section.
- `src/styles/global.css` -- CSS custom properties for dark/light themes, shared utility classes.
- `dist/` -- Astro static build output.
- `.github/workflows/astro.yml` -- CI deploy to `gh-pages` branch via peaceiris/actions-gh-pages.

## Theme system
- Controlled via `data-theme` attribute on `<html>` (values: `dark` | `light`).
- Default is `dark`. The Layout script reads `localStorage.getItem("theme")` before paint to avoid flash.
- `Navbar.astro` has the toggle button; it swaps `data-theme` and writes to `localStorage`.
- All colour values are defined in `global.css` under `[data-theme="dark"]` and `[data-theme="light"]`.
- Icon visibility (`.icon-sun` / `.icon-moon`) is controlled by `[data-theme]` selectors in `global.css` -- do NOT move these to a component scoped `<style>` block because Astro scoping rewrites the selector to require `data-astro-cid-*` on the same element as `data-theme`, which never matches (`data-theme` is on `<html>`, not the component).
- Font: Poppins (weights 400, 500, 600, 700, 800) loaded via Google Fonts in Layout.astro.

## Component order (top to bottom)
1. **Navbar** -- fixed top bar, theme toggle button with sun/moon SVG icons.
2. **Hero** -- full viewport height (`min-height: 100vh`, `display: flex`, `align-items: center`), left text + right chart-bar mock card + stats. `version_name` read from root `manifest.json` via `readFileSync`.
3. **Features** -- 3-column vertical card grid (collapses to 2-col at 768px, 1-col at 480px).
4. **Installation** -- 2-column card grid (collapses to 1-col at 768px). Cards: Download the ZIP (button to releases), Extract, Load in Chrome, Contribute (open source blurb + GitHub link).
5. **Footer** -- brand, links, copyright. Uses `padding-top`/`padding-bottom` (not shorthand) to preserve `.container` horizontal padding.

## Installation cards detail
- **Card 1 (Download the ZIP)**: Paragraph + primary button linking to GitHub releases. No code block.
- **Card 2 (Extract)**: Paragraph + info note.
- **Card 3 (Load in Chrome)**: Paragraph with inline `<code>` + info note.
- **Card 4 (Contribute)**: Open source message + outline button linking to GitHub repo.

## Hero detail
- Tag reads `version_name` from `../../../manifest.json` (resolved via `fileURLToPath` + `resolve` in frontmatter).
- `.tag` class has `text-transform: none` (not uppercase) to preserve version string casing.
- Mock card: window dots, chart bars (purple-teal gradient), stats grid (3 values).
- Chart bars use `align-items: flex-end` with varying heights via inline `style` attributes.

## Build & Deploy
```bash
bun run dev       # start dev server (port 4321)
bun run build     # static build to dist/
bun run preview   # preview production build
```

Deploy is automatic via `.github/workflows/astro.yml` on any push to `master` touching `astro/**`. Pushes to `gh-pages` branch.

## Responsive breakpoints
- `@media (max-width: 768px)` -- tablet: 2-col features, single-col install, hero stacks vertically, visual card hidden.
- `@media (max-width: 640px)` -- mobile: hide non-last nav links.
- `@media (max-width: 480px)` -- small phones: tighter padding, 1-col features.

## Guardrails
- Keep the theme toggle script in the Layout head (inline `<script>`) to prevent flash of unstyled theme.
- Keep `astro config.mjs` minimal -- no integrations unless needed.
- If adding new components, follow the existing pattern: `<style>` block at the bottom, CSS variables only.
- If changing colours, update both theme blocks in `global.css`.
- `.container` horizontal padding (`padding: 0 24px`) must not be overridden by child component shorthand `padding` -- use `padding-top`/`padding-bottom` instead.
- Theme visibility rules for `.icon-sun`/`.icon-moon` live in `global.css`, NOT in a scoped component style block (otherwise Astro's scope rewriting breaks the `[data-theme]` selector).
